import {
  FIRESTORE_BOOTSTRAP_REQUIRED_COLLECTIONS,
  FIRESTORE_BOOTSTRAP_REQUIRED_DOCS,
} from "../lib/constants";
import { db } from "../lib/firebase-admin";
import { emitScriptSummary, parseScriptOptions } from "./lib/script-runtime";

type CheckSummary = {
  checkedDocs: string[];
  missingDocs: string[];
  requiredCollections: string[];
  missingFromBootstrap: string[];
};

const REQUIRED_DOCS = FIRESTORE_BOOTSTRAP_REQUIRED_DOCS;
const REQUIRED_COLLECTION_NAMES = FIRESTORE_BOOTSTRAP_REQUIRED_COLLECTIONS;

async function main() {
  const options = parseScriptOptions("script:check-firestore-structure");
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
    checkedDocs: [...REQUIRED_DOCS],
    missingDocs,
    requiredCollections: [...REQUIRED_COLLECTION_NAMES],
    missingFromBootstrap,
  };

  const driftDetected = missingDocs.length > 0 || missingFromBootstrap.length > 0;

  emitScriptSummary({
    script: "check-firestore-structure",
    dryRun: options.dryRun,
    driftDetected,
    ok: !driftDetected,
    summary: {
      actor: options.actor,
      ...summary,
    },
  });

  if (driftDetected) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
