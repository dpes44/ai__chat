import { FieldValue } from "firebase-admin/firestore";

import { ADMIN_AUDIT_LOGS_COLLECTION } from "./constants";
import { db } from "./firebase-admin";

export async function logAudit(params: {
  actor: string;
  action: string;
  target: string;
  diffSummary: string;
}) {
  await db.collection(ADMIN_AUDIT_LOGS_COLLECTION).add({
    actor: params.actor,
    action: params.action,
    target: params.target,
    diffSummary: params.diffSummary,
    createdAt: FieldValue.serverTimestamp(),
  });
}
