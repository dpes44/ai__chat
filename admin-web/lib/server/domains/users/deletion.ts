import { FieldPath, FieldValue, Query } from "firebase-admin/firestore";

import { logAudit } from "@/lib/audit";
import {
  APPOINTMENTS_COLLECTION,
  FORUM_REPLIES_SUBCOLLECTION,
  FORUM_THREADS_COLLECTION,
  MOOD_LOGS_SUBCOLLECTION,
  NICKNAME_CLAIMS_COLLECTION,
  USER_MOODS_COLLECTION,
  USERS_COLLECTION,
} from "@/lib/constants";
import { auth, db } from "@/lib/firebase-admin";
import { UsersServiceError } from "./types";

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

async function deleteUserProfileAndClaims(uid: string): Promise<{
  deletedProfile: boolean;
  deletedClaims: number;
}> {
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
  const deletedLogs = await deleteQueryInBatches(
    moodRootRef.collection(MOOD_LOGS_SUBCOLLECTION),
  );
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
