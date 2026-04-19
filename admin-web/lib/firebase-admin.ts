import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let app: App;

if (!getApps().length) {
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (serviceAccountRaw) {
    const parsed = JSON.parse(serviceAccountRaw) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    app = initializeApp({
      credential: cert(parsed as Parameters<typeof cert>[0]),
      projectId: process.env.GCP_PROJECT_ID || parsed.project_id,
    });
  } else {
    const projectId = process.env.GCP_PROJECT_ID;
    if (!projectId) {
      throw new Error("Missing GCP_PROJECT_ID environment variable.");
    }

    app = initializeApp({
      projectId,
    });
  }
} else {
  app = getApps()[0]!;
}

export const db = getFirestore(app);
export const auth = getAuth(app);
