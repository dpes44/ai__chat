import { FieldValue } from "firebase-admin/firestore";

import { logAudit } from "@/lib/audit";
import { db } from "@/lib/firebase-admin";

type JsonMap = Record<string, unknown>;

export async function getMergedDocData(pathsInPrecedenceOrder: string[]): Promise<JsonMap> {
  const snapshots = await Promise.all(pathsInPrecedenceOrder.map((path) => db.doc(path).get()));
  return snapshots.reduce<JsonMap>((acc, snap) => {
    if (!snap.exists) {
      return acc;
    }
    return {
      ...acc,
      ...((snap.data() ?? {}) as JsonMap),
    };
  }, {});
}

export async function updateMirroredDocConfig(params: {
  actor: string;
  auditAction: string;
  auditTarget: string;
  beforePath: string;
  writePaths: string[];
  nextConfig: JsonMap;
}): Promise<void> {
  const beforeSnap = await db.doc(params.beforePath).get();
  const before = beforeSnap.exists ? beforeSnap.data() : {};

  const patch = {
    ...params.nextConfig,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: params.actor,
  };

  await Promise.all(
    params.writePaths.map((path) => db.doc(path).set(patch, { merge: true })),
  );

  await logAudit({
    actor: params.actor,
    action: params.auditAction,
    target: params.auditTarget,
    diffSummary: JSON.stringify({ before, after: params.nextConfig }).slice(0, 900),
  });
}
