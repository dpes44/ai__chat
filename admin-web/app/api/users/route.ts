import { FieldValue, Query } from "firebase-admin/firestore";
import { UserRecord } from "firebase-admin/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { assertCsrfToken } from "@/lib/csrf";
import {
  APPOINTMENTS_COLLECTION,
  FORUM_REPLIES_SUBCOLLECTION,
  FORUM_THREADS_COLLECTION,
  NICKNAME_CLAIMS_COLLECTION,
  USER_MOODS_COLLECTION,
  USERS_COLLECTION,
} from "@/lib/constants";
import { auth, db } from "@/lib/firebase-admin";
import { getAdminSession } from "@/lib/session";

export const runtime = "nodejs";

type UserProfileSummary = {
  nickname: string;
  nicknameKey: string;
  isGuest: boolean | null;
};

type AdminUserRow = {
  uid: string;
  email: string;
  displayName: string;
  nickname: string;
  userType: "guest" | "registered";
  isGuest: boolean;
  isBanned: boolean;
  profileIsGuest: boolean | null;
  profileExists: boolean;
  providers: string[];
  createdAt: string;
  lastSignInAt: string;
};

const setBanSchema = z.object({
  csrfToken: z.string().min(1),
  action: z.literal("setBanStatus"),
  uid: z.string().min(1).max(128),
  banned: z.boolean(),
  reason: z.string().max(300).optional(),
});

const deleteUserSchema = z.object({
  csrfToken: z.string().min(1),
  action: z.literal("deleteUser"),
  uid: z.string().min(1).max(128),
});

const postSchema = z.union([setBanSchema, deleteUserSchema]);

function usersListLimit(): number {
  const raw = Number(process.env.ADMIN_USERS_LIST_LIMIT ?? 2000);
  if (!Number.isFinite(raw)) {
    return 2000;
  }
  return Math.max(1, Math.min(5000, Math.trunc(raw)));
}

function toIso(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toSortMillis(value: string): number {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function isFailedPreconditionError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  if (code === 9 || code === "9" || code === "failed-precondition") {
    return true;
  }

  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === "string" && message.includes("FAILED_PRECONDITION");
}

function uniqueProviderIds(record: UserRecord): string[] {
  return [...new Set(record.providerData.map((item) => item.providerId).filter(Boolean))];
}

function isGuestUser(record: UserRecord): boolean {
  const providers = uniqueProviderIds(record);
  if (providers.length === 0) {
    return true;
  }
  return providers.length === 1 && providers[0] === "anonymous";
}

async function listAllAuthUsers(limit: number): Promise<{ users: UserRecord[]; truncated: boolean }> {
  let nextPageToken: string | undefined;
  const users: UserRecord[] = [];

  while (users.length < limit) {
    const remaining = limit - users.length;
    const batchSize = Math.min(1000, remaining);
    const page = await auth.listUsers(batchSize, nextPageToken);
    users.push(...page.users);
    nextPageToken = page.pageToken;
    if (!nextPageToken) {
      return { users, truncated: false };
    }
  }

  return { users, truncated: true };
}

async function loadUserProfiles(uids: string[]): Promise<Map<string, UserProfileSummary>> {
  const result = new Map<string, UserProfileSummary>();
  if (uids.length === 0) {
    return result;
  }

  const chunkSize = 200;
  for (let i = 0; i < uids.length; i += chunkSize) {
    const chunk = uids.slice(i, i + chunkSize);
    const refs = chunk.map((uid) => db.collection(USERS_COLLECTION).doc(uid));
    const snapshots = await db.getAll(...refs);

    for (const snap of snapshots) {
      if (!snap.exists) {
        continue;
      }
      const data = snap.data() ?? {};
      result.set(snap.id, {
        nickname: (data.nickname ?? "").toString(),
        nicknameKey: (data.nicknameKey ?? "").toString(),
        isGuest: typeof data.isGuest === "boolean" ? data.isGuest : null,
      });
    }
  }

  return result;
}

async function deleteQueryInBatches(
  query: Query,
  batchSize = 200,
): Promise<number> {
  let deleted = 0;
  while (true) {
    const snap = await query.limit(batchSize).get();
    if (snap.empty) {
      break;
    }

    const batch = db.batch();
    for (const doc of snap.docs) {
      batch.delete(doc.ref);
      deleted += 1;
    }
    await batch.commit();

    if (snap.size < batchSize) {
      break;
    }
  }
  return deleted;
}

async function deleteThreadsByAuthor(uid: string): Promise<number> {
  let deletedThreads = 0;
  while (true) {
    const snap = await db
      .collection(FORUM_THREADS_COLLECTION)
      .where("authorUid", "==", uid)
      .limit(25)
      .get();
    if (snap.empty) {
      break;
    }

    for (const threadDoc of snap.docs) {
      await deleteQueryInBatches(threadDoc.ref.collection(FORUM_REPLIES_SUBCOLLECTION));
      await threadDoc.ref.delete();
      deletedThreads += 1;
    }

    if (snap.size < 25) {
      break;
    }
  }
  return deletedThreads;
}

async function deleteRepliesByAuthor(uid: string): Promise<number> {
  const deleteViaCollectionGroup = async (): Promise<number> => {
    let deletedReplies = 0;
    while (true) {
      const snap = await db
        .collectionGroup(FORUM_REPLIES_SUBCOLLECTION)
        .where("authorUid", "==", uid)
        .limit(200)
        .get();
      if (snap.empty) {
        break;
      }

      const threadAdjustments = new Map<string, { ref: FirebaseFirestore.DocumentReference; count: number }>();
      const batch = db.batch();

      for (const replyDoc of snap.docs) {
        batch.delete(replyDoc.ref);
        deletedReplies += 1;

        const threadRef = replyDoc.ref.parent.parent;
        if (!threadRef) {
          continue;
        }
        const current = threadAdjustments.get(threadRef.path);
        if (current) {
          current.count += 1;
        } else {
          threadAdjustments.set(threadRef.path, { ref: threadRef, count: 1 });
        }
      }
      await batch.commit();

      for (const item of threadAdjustments.values()) {
        await item.ref
          .update({
            replyCount: FieldValue.increment(-item.count),
          })
          .catch(() => undefined);
      }

      if (snap.size < 200) {
        break;
      }
    }
    return deletedReplies;
  };

  const deleteViaThreadScan = async (): Promise<number> => {
    let deletedReplies = 0;
    let lastThreadDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;

    while (true) {
      let threadQuery = db
        .collection(FORUM_THREADS_COLLECTION)
        .orderBy("__name__")
        .limit(100);

      if (lastThreadDoc) {
        threadQuery = threadQuery.startAfter(lastThreadDoc);
      }

      const threadSnap = await threadQuery.get();
      if (threadSnap.empty) {
        break;
      }

      for (const threadDoc of threadSnap.docs) {
        while (true) {
          const replySnap = await threadDoc.ref
            .collection(FORUM_REPLIES_SUBCOLLECTION)
            .where("authorUid", "==", uid)
            .limit(200)
            .get();

          if (replySnap.empty) {
            break;
          }

          const batch = db.batch();
          for (const replyDoc of replySnap.docs) {
            batch.delete(replyDoc.ref);
            deletedReplies += 1;
          }
          await batch.commit();

          await threadDoc.ref
            .update({
              replyCount: FieldValue.increment(-replySnap.size),
            })
            .catch(() => undefined);

          if (replySnap.size < 200) {
            break;
          }
        }
      }

      lastThreadDoc = threadSnap.docs[threadSnap.docs.length - 1];
      if (threadSnap.size < 100) {
        break;
      }
    }

    return deletedReplies;
  };

  try {
    return await deleteViaCollectionGroup();
  } catch (error) {
    if (!isFailedPreconditionError(error)) {
      throw error;
    }
  }

  // Fallback when collection-group index is missing.
  return deleteViaThreadScan();
}

async function deleteUserData(uid: string): Promise<{
  deletedThreads: number;
  deletedReplies: number;
  deletedAppointments: number;
  deletedMoodLogs: number;
  deletedProfile: boolean;
  deletedClaims: number;
}> {
  const deletedThreads = await deleteThreadsByAuthor(uid);
  let deletedReplies = 0;
  deletedReplies = await deleteRepliesByAuthor(uid);
  const deletedAppointments = await deleteQueryInBatches(
    db.collection(APPOINTMENTS_COLLECTION).where("userUid", "==", uid),
  );
  const deletedMoodLogs = await deleteUserMoods(uid);
  const { deletedProfile, deletedClaims } = await deleteUserProfileAndClaims(uid);

  return {
    deletedThreads,
    deletedReplies,
    deletedAppointments,
    deletedMoodLogs,
    deletedProfile,
    deletedClaims,
  };
}

async function deleteUserProfileAndClaims(uid: string): Promise<{ deletedProfile: boolean; deletedClaims: number }> {
  const userRef = db.collection(USERS_COLLECTION).doc(uid);
  const userSnap = await userRef.get();
  const data = userSnap.data() ?? {};
  const nicknameKey = (data.nicknameKey ?? "").toString().trim();

  let deletedClaims = 0;

  if (nicknameKey) {
    const claimRef = db.collection(NICKNAME_CLAIMS_COLLECTION).doc(nicknameKey);
    const claimSnap = await claimRef.get();
    if (claimSnap.exists) {
      const ownerUid = (claimSnap.data()?.uid ?? "").toString();
      if (!ownerUid || ownerUid === uid) {
        await claimRef.delete();
        deletedClaims += 1;
      }
    }
  }

  deletedClaims += await deleteQueryInBatches(
    db.collection(NICKNAME_CLAIMS_COLLECTION).where("uid", "==", uid),
    50,
  );

  let deletedProfile = false;
  if (userSnap.exists) {
    await userRef.delete();
    deletedProfile = true;
  }

  return { deletedProfile, deletedClaims };
}

async function deleteUserMoods(uid: string): Promise<number> {
  const moodRootRef = db.collection(USER_MOODS_COLLECTION).doc(uid);
  const deletedLogs = await deleteQueryInBatches(moodRootRef.collection("mood_logs"));
  await moodRootRef.delete().catch(() => undefined);
  return deletedLogs;
}

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const scope = new URL(request.url).searchParams.get("scope") ?? "allAuth";

  const { users: authUsers, truncated } = await listAllAuthUsers(usersListLimit());
  const profileMap = await loadUserProfiles(authUsers.map((item) => item.uid));

  const allRows: AdminUserRow[] = authUsers
    .map((record) => {
      const profile = profileMap.get(record.uid);
      const guest = isGuestUser(record);
      const userType: AdminUserRow["userType"] = guest ? "guest" : "registered";
      return {
        uid: record.uid,
        email: record.email ?? "",
        displayName: record.displayName ?? "",
        nickname: profile?.nickname ?? "",
        userType,
        isGuest: guest,
        isBanned: record.disabled === true,
        profileIsGuest: profile?.isGuest ?? null,
        profileExists: Boolean(profile),
        providers: uniqueProviderIds(record),
        createdAt: toIso(record.metadata.creationTime),
        lastSignInAt: toIso(record.metadata.lastSignInTime),
      };
    })
    .sort((a, b) => toSortMillis(b.createdAt) - toSortMillis(a.createdAt));

  const rows =
    scope === "withProfile"
      ? allRows.filter((row) => row.profileExists)
      : scope === "withoutProfile"
        ? allRows.filter((row) => !row.profileExists)
        : allRows;

  return NextResponse.json({
    data: {
      users: rows,
      truncated,
      total: rows.length,
    },
  });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (!assertCsrfToken(parsed.data.csrfToken)) {
    return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
  }

  if (parsed.data.action === "setBanStatus") {
    const uid = parsed.data.uid.trim();
    const reason = (parsed.data.reason ?? "").trim();

    try {
      await auth.updateUser(uid, { disabled: parsed.data.banned });
      if (parsed.data.banned) {
        await auth.revokeRefreshTokens(uid);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update user status.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const profileRef = db.collection(USERS_COLLECTION).doc(uid);
    const profileSnap = await profileRef.get();
    if (profileSnap.exists) {
      await profileRef.set(
        {
          moderation: {
            isBanned: parsed.data.banned,
            bannedAt: parsed.data.banned ? FieldValue.serverTimestamp() : null,
            bannedBy: parsed.data.banned ? session.sub : null,
            banReason: parsed.data.banned ? reason : "",
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    await logAudit({
      actor: session.sub,
      action: "ADMIN_USER_BAN_UPDATED",
      target: `${USERS_COLLECTION}/${uid}`,
      diffSummary: JSON.stringify({
        uid,
        banned: parsed.data.banned,
        reason,
      }).slice(0, 900),
    });

    return NextResponse.json({ ok: true, uid, isBanned: parsed.data.banned });
  }

  const uid = parsed.data.uid.trim();
  let authUserEmail = "";
  let authUserDeleted = false;

  try {
    const authUser = await auth.getUser(uid);
    authUserEmail = authUser.email ?? "";
  } catch (error) {
    const code = (error as { code?: string } | null)?.code ?? "";
    if (code !== "auth/user-not-found") {
      const message = error instanceof Error ? error.message : "Could not read user.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  let deletedThreads = 0;
  let deletedReplies = 0;
  let deletedAppointments = 0;
  let deletedMoodLogs = 0;
  let deletedProfile = false;
  let deletedClaims = 0;

  try {
    const deleted = await deleteUserData(uid);
    deletedThreads = deleted.deletedThreads;
    deletedReplies = deleted.deletedReplies;
    deletedAppointments = deleted.deletedAppointments;
    deletedMoodLogs = deleted.deletedMoodLogs;
    deletedProfile = deleted.deletedProfile;
    deletedClaims = deleted.deletedClaims;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete related user data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  try {
    await auth.deleteUser(uid);
    authUserDeleted = true;
  } catch (error) {
    const code = (error as { code?: string } | null)?.code ?? "";
    if (code !== "auth/user-not-found") {
      const message = error instanceof Error ? error.message : "Could not delete auth user.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  await logAudit({
    actor: session.sub,
    action: "ADMIN_USER_DELETED",
    target: `${USERS_COLLECTION}/${uid}`,
    diffSummary: JSON.stringify({
      uid,
      email: authUserEmail,
      authUserDeleted,
      deletedProfile,
      deletedClaims,
      deletedMoodLogs,
      deletedAppointments,
      deletedThreads,
      deletedReplies,
    }).slice(0, 900),
  });

  return NextResponse.json({
    ok: true,
    data: {
      uid,
      authUserDeleted,
      deletedProfile,
      deletedClaims,
      deletedMoodLogs,
      deletedAppointments,
      deletedThreads,
      deletedReplies,
    },
  });
}
