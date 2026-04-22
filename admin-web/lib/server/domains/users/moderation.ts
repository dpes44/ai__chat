import { FieldValue } from "firebase-admin/firestore";

import { logAudit } from "@/lib/audit";
import { USERS_COLLECTION } from "@/lib/constants";
import { auth, db } from "@/lib/firebase-admin";
import { UsersServiceError } from "./types";

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
