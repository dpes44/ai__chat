import { UserRecord } from "firebase-admin/auth";
import { FieldPath, FieldValue, Query } from "firebase-admin/firestore";

import { logAudit } from "@/lib/audit";
import {
  APPOINTMENTS_COLLECTION,
  FORUM_REPLIES_SUBCOLLECTION,
  FORUM_THREADS_COLLECTION,
  NICKNAME_CLAIMS_COLLECTION,
  USER_MOODS_COLLECTION,
  USERS_COLLECTION,
} from "@/lib/constants";
import { auth, db } from "@/lib/firebase-admin";

type UserProfileSummary = {
  nickname: string;
  nicknameKey: string;
  isGuest: boolean | null;
};

export type UsersListScope = "allAuth" | "withProfile" | "withoutProfile";

export type AdminUserRow = {
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

export class UsersServiceError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "UsersServiceError";
    this.status = status;
  }
}

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
  let lastThreadId = "";
  let deletedThreads = 0;

  while (true) {
    let query = db
      .collection(FORUM_THREADS_COLLECTION)
      .orderBy(FieldPath.documentId())
      .limit(100);
    if (lastThreadId) {
      query = query.startAfter(lastThreadId);
    }
    const snap = await query.get();

    if (snap.empty) {
      break;
    }

    for (const threadDoc of snap.docs) {
      const authorUid = (threadDoc.data()?.authorUid ?? "").toString();
      if (authorUid !== uid) {
        continue;
      }

      await deleteQueryInBatches(threadDoc.ref.collection(FORUM_REPLIES_SUBCOLLECTION));
      await threadDoc.ref.delete().catch(() => undefined);
      deletedThreads += 1;
    }

    lastThreadId = snap.docs[snap.docs.length - 1]?.id ?? "";
    if (snap.size < 100 || !lastThreadId) {
      break;
    }
  }
  return deletedThreads;
}

async function deleteRepliesByAuthor(uid: string): Promise<number> {
  let deletedReplies = 0;
  let lastThreadId = "";

  while (true) {
    let threadQuery = db
      .collection(FORUM_THREADS_COLLECTION)
      .orderBy(FieldPath.documentId())
      .limit(100);
    if (lastThreadId) {
      threadQuery = threadQuery.startAfter(lastThreadId);
    }

    const threadSnap = await threadQuery.get();
    if (threadSnap.empty) {
      break;
    }

    for (const threadDoc of threadSnap.docs) {
      let lastReplyId = "";

      while (true) {
        let replyQuery = threadDoc.ref
          .collection(FORUM_REPLIES_SUBCOLLECTION)
          .orderBy(FieldPath.documentId())
          .limit(200);
        if (lastReplyId) {
          replyQuery = replyQuery.startAfter(lastReplyId);
        }

        const replySnap = await replyQuery.get();
        if (replySnap.empty) {
          break;
        }

        const ownedReplies = replySnap.docs.filter(
          (replyDoc) => (replyDoc.data()?.authorUid ?? "").toString() === uid,
        );

        if (ownedReplies.length > 0) {
          const batch = db.batch();
          for (const replyDoc of ownedReplies) {
            batch.delete(replyDoc.ref);
          }
          await batch.commit();

          deletedReplies += ownedReplies.length;
          await threadDoc.ref
            .update({
              replyCount: FieldValue.increment(-ownedReplies.length),
            })
            .catch(() => undefined);
        }

        lastReplyId = replySnap.docs[replySnap.docs.length - 1]?.id ?? "";
        if (replySnap.size < 200 || !lastReplyId) {
          break;
        }
      }
    }

    lastThreadId = threadSnap.docs[threadSnap.docs.length - 1]?.id ?? "";
    if (threadSnap.size < 100 || !lastThreadId) {
      break;
    }
  }

  return deletedReplies;
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

async function deleteUserData(uid: string): Promise<{
  deletedThreads: number;
  deletedReplies: number;
  deletedAppointments: number;
  deletedMoodLogs: number;
  deletedProfile: boolean;
  deletedClaims: number;
}> {
  const deletedThreads = await deleteThreadsByAuthor(uid);
  const deletedReplies = await deleteRepliesByAuthor(uid);
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

export async function listAdminUsers(scope: UsersListScope): Promise<{
  users: AdminUserRow[];
  truncated: boolean;
  total: number;
}> {
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

  return {
    users: rows,
    truncated,
    total: rows.length,
  };
}

export async function setUserBanStatus(params: {
  actor: string;
  uid: string;
  banned: boolean;
  reason: string;
}): Promise<{ uid: string; isBanned: boolean }> {
  try {
    await auth.updateUser(params.uid, { disabled: params.banned });
    if (params.banned) {
      await auth.revokeRefreshTokens(params.uid);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update user status.";
    throw new UsersServiceError(message, 400);
  }

  const profileRef = db.collection(USERS_COLLECTION).doc(params.uid);
  const profileSnap = await profileRef.get();
  if (profileSnap.exists) {
    await profileRef.set(
      {
        moderation: {
          isBanned: params.banned,
          bannedAt: params.banned ? FieldValue.serverTimestamp() : null,
          bannedBy: params.banned ? params.actor : null,
          banReason: params.banned ? params.reason : "",
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  await logAudit({
    actor: params.actor,
    action: "ADMIN_USER_BAN_UPDATED",
    target: `${USERS_COLLECTION}/${params.uid}`,
    diffSummary: JSON.stringify({
      uid: params.uid,
      banned: params.banned,
      reason: params.reason,
    }).slice(0, 900),
  });

  return { uid: params.uid, isBanned: params.banned };
}

export async function deleteAdminUser(params: {
  actor: string;
  uid: string;
}): Promise<{
  uid: string;
  authUserDeleted: boolean;
  deletedProfile: boolean;
  deletedClaims: number;
  deletedMoodLogs: number;
  deletedAppointments: number;
  deletedThreads: number;
  deletedReplies: number;
}> {
  let authUserEmail = "";
  let authUserDeleted = false;

  try {
    const authUser = await auth.getUser(params.uid);
    authUserEmail = authUser.email ?? "";
  } catch (error) {
    const code = (error as { code?: string } | null)?.code ?? "";
    if (code !== "auth/user-not-found") {
      const message = error instanceof Error ? error.message : "Could not read user.";
      throw new UsersServiceError(message, 400);
    }
  }

  let deletedThreads = 0;
  let deletedReplies = 0;
  let deletedAppointments = 0;
  let deletedMoodLogs = 0;
  let deletedProfile = false;
  let deletedClaims = 0;

  try {
    const deleted = await deleteUserData(params.uid);
    deletedThreads = deleted.deletedThreads;
    deletedReplies = deleted.deletedReplies;
    deletedAppointments = deleted.deletedAppointments;
    deletedMoodLogs = deleted.deletedMoodLogs;
    deletedProfile = deleted.deletedProfile;
    deletedClaims = deleted.deletedClaims;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete related user data.";
    throw new UsersServiceError(message, 500);
  }

  try {
    await auth.deleteUser(params.uid);
    authUserDeleted = true;
  } catch (error) {
    const code = (error as { code?: string } | null)?.code ?? "";
    if (code !== "auth/user-not-found") {
      const message = error instanceof Error ? error.message : "Could not delete auth user.";
      throw new UsersServiceError(message, 400);
    }
  }

  await logAudit({
    actor: params.actor,
    action: "ADMIN_USER_DELETED",
    target: `${USERS_COLLECTION}/${params.uid}`,
    diffSummary: JSON.stringify({
      uid: params.uid,
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

  return {
    uid: params.uid,
    authUserDeleted,
    deletedProfile,
    deletedClaims,
    deletedMoodLogs,
    deletedAppointments,
    deletedThreads,
    deletedReplies,
  };
}
