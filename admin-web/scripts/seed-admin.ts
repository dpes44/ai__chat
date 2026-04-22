import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import { ADMIN_AUTH_DOC_PATH } from "../lib/constants";

const projectId = process.env.GCP_PROJECT_ID;
if (!projectId) {
  throw new Error("Missing GCP_PROJECT_ID");
}

const username = process.argv[2];
const passwordHashArgon2id = process.argv[3];
if (!username || !passwordHashArgon2id) {
  throw new Error(
    "Usage: npm run seed:admin -- '<username>' '<argon2id-hash>'",
  );
}

initializeApp({ projectId });

const db = getFirestore();

async function main() {
  await db.doc(ADMIN_AUTH_DOC_PATH).set(
    {
      username,
      passwordHashArgon2id,
      failedAttempts: 0,
      lockUntil: null,
      passwordUpdatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  console.log(`${ADMIN_AUTH_DOC_PATH} updated.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
