import {
  AI_PROVIDER_KEYS_DOC_PATH,
  AI_ROUTING_DOC_PATH,
  KEYS_DOC_PATH,
  PROMPTS_DOC_PATH,
  SYSTEM_BOOTSTRAP_COLLECTION,
  USERS_ROUTER_DOC_PATH,
} from "../lib/constants";
import { db } from "../lib/firebase-admin";

type CheckSummary = {
  checkedDocs: string[];
  missingDocs: string[];
  requiredCollections: string[];
  missingFromBootstrap: string[];
};

const REQUIRED_DOCS = [
  USERS_ROUTER_DOC_PATH,
  PROMPTS_DOC_PATH,
  KEYS_DOC_PATH,
  AI_ROUTING_DOC_PATH,
  AI_PROVIDER_KEYS_DOC_PATH,
  `${SYSTEM_BOOTSTRAP_COLLECTION}/collections`,
];

const REQUIRED_COLLECTION_NAMES = [
  "admin_auth",
  "admin_audit_logs",
  "app_config",
  "usersrouter",
  "prompts",
  "keys",
  "users",
  "nickname_claims",
  "doctors",
  "appointments",
  "threads",
  "threads/{threadId}/replies",
  "user_moods",
  "ai_request_logs",
  "ai_metrics_daily",
  "mood_metrics_daily",
  "content_emergency_numbers",
  "content_tools",
  "content_therapist_subscriptions",
  "content_legal",
];

async function main() {
  const docSnaps = await Promise.all(REQUIRED_DOCS.map((path) => db.doc(path).get()));
  const missingDocs = REQUIRED_DOCS.filter((_, index) => !docSnaps[index]?.exists);

  const bootstrapSnap = docSnaps[REQUIRED_DOCS.length - 1];
  const bootstrapCollections = new Set<string>(
    Array.isArray(bootstrapSnap?.data()?.collections)
      ? (bootstrapSnap?.data()?.collections as string[])
      : [],
  );

  const missingFromBootstrap = REQUIRED_COLLECTION_NAMES.filter(
    (name) => !bootstrapCollections.has(name),
  );

  const summary: CheckSummary = {
    checkedDocs: REQUIRED_DOCS,
    missingDocs,
    requiredCollections: REQUIRED_COLLECTION_NAMES,
    missingFromBootstrap,
  };

  if (missingDocs.length || missingFromBootstrap.length) {
    console.error("Firestore structure check failed.");
    console.error(summary);
    process.exit(1);
  }

  console.log("Firestore structure check passed.");
  console.log(summary);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
