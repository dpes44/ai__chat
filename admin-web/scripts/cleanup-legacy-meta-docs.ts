import { logAudit } from "../lib/audit";
import {
  AI_METRICS_DAILY_COLLECTION,
  AI_REQUEST_LOGS_COLLECTION,
  APPOINTMENTS_COLLECTION,
  CONTENT_THERAPIST_SUBSCRIPTIONS_COLLECTION,
  CONTENT_TOOLS_COLLECTION,
  DOCTORS_COLLECTION,
  FORUM_REPLIES_SUBCOLLECTION,
  FORUM_THREADS_COLLECTION,
  MOOD_LOGS_SUBCOLLECTION,
  MOOD_METRICS_DAILY_COLLECTION,
  USER_MOODS_COLLECTION,
  USERS_COLLECTION,
} from "../lib/constants";
import { db } from "../lib/firebase-admin";
import { emitScriptSummary, parseScriptOptions } from "./lib/script-runtime";

const META_DOC_ID = "_meta";

type CleanupSummary = {
  deletedPaths: string[];
  missingPaths: string[];
  auditLogged: boolean;
};

async function deleteDocIfExists(path: string): Promise<boolean> {
  const ref = db.doc(path);
  const snap = await ref.get();
  if (!snap.exists) {
    return false;
  }
  await ref.delete();
  return true;
}

function legacyMetaPaths(): string[] {
  return [
    `${USERS_COLLECTION}/${META_DOC_ID}`,
    `${DOCTORS_COLLECTION}/${META_DOC_ID}`,
    `${APPOINTMENTS_COLLECTION}/${META_DOC_ID}`,
    `${FORUM_THREADS_COLLECTION}/${META_DOC_ID}`,
    `${FORUM_THREADS_COLLECTION}/${META_DOC_ID}/${FORUM_REPLIES_SUBCOLLECTION}/${META_DOC_ID}`,
    `${USER_MOODS_COLLECTION}/${META_DOC_ID}`,
    `${USER_MOODS_COLLECTION}/${META_DOC_ID}/${MOOD_LOGS_SUBCOLLECTION}/${META_DOC_ID}`,
    `${AI_REQUEST_LOGS_COLLECTION}/${META_DOC_ID}`,
    `${AI_METRICS_DAILY_COLLECTION}/${META_DOC_ID}`,
    `${MOOD_METRICS_DAILY_COLLECTION}/${META_DOC_ID}`,
    `${CONTENT_TOOLS_COLLECTION}/${META_DOC_ID}`,
    `${CONTENT_THERAPIST_SUBSCRIPTIONS_COLLECTION}/${META_DOC_ID}`,
  ];
}

async function main() {
  const options = parseScriptOptions("script:cleanup-legacy-meta-docs");
  const summary: CleanupSummary = {
    deletedPaths: [],
    missingPaths: [],
    auditLogged: false,
  };

  const allPaths = legacyMetaPaths();
  const existingBefore: string[] = [];
  for (const path of allPaths) {
    const snap = await db.doc(path).get();
    if (snap.exists) {
      existingBefore.push(path);
      continue;
    }
    summary.missingPaths.push(path);
  }

  if (options.dryRun) {
    emitScriptSummary({
      script: "cleanup-legacy-meta-docs",
      dryRun: true,
      driftDetected: existingBefore.length > 0,
      ok: existingBefore.length === 0,
      summary: {
        actor: options.actor,
        ...summary,
        staleMetaPaths: existingBefore,
      },
    });
    if (existingBefore.length > 0) {
      process.exit(1);
    }
    return;
  }

  for (const path of existingBefore) {
    const deleted = await deleteDocIfExists(path);
    if (deleted) {
      summary.deletedPaths.push(path);
    } else {
      summary.missingPaths.push(path);
    }
  }

  await logAudit({
    actor: options.actor,
    action: "LEGACY_META_DOCS_CLEANED",
    target: "cleanup/_meta",
    diffSummary: JSON.stringify({
      deletedCount: summary.deletedPaths.length,
      missingCount: summary.missingPaths.length,
      deletedPaths: summary.deletedPaths,
    }).slice(0, 900),
  });
  summary.auditLogged = true;

  const remaining = (
    await Promise.all(
      allPaths.map(async (path) => {
        const snap = await db.doc(path).get();
        return snap.exists ? path : null;
      }),
    )
  ).filter((value): value is string => value !== null);

  const driftDetected = remaining.length > 0;

  emitScriptSummary({
    script: "cleanup-legacy-meta-docs",
    dryRun: false,
    driftDetected,
    ok: !driftDetected,
    summary: {
      actor: options.actor,
      ...summary,
      remainingPaths: remaining,
    },
  });

  if (driftDetected) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
