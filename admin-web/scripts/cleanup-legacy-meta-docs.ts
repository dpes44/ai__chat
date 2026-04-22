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
  const actor = process.argv[2]?.trim() || "script:cleanup-legacy-meta-docs";
  const summary: CleanupSummary = {
    deletedPaths: [],
    missingPaths: [],
    auditLogged: false,
  };

  for (const path of legacyMetaPaths()) {
    const deleted = await deleteDocIfExists(path);
    if (deleted) {
      summary.deletedPaths.push(path);
    } else {
      summary.missingPaths.push(path);
    }
  }

  await logAudit({
    actor,
    action: "LEGACY_META_DOCS_CLEANED",
    target: "cleanup/_meta",
    diffSummary: JSON.stringify({
      deletedCount: summary.deletedPaths.length,
      missingCount: summary.missingPaths.length,
      deletedPaths: summary.deletedPaths,
    }).slice(0, 900),
  });
  summary.auditLogged = true;

  console.log("Legacy _meta cleanup complete.");
  console.log(summary);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
