import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let app: App;

function resolveProjectId(parsedProjectId?: string): string {
  return process.env.GCP_PROJECT_ID || parsedProjectId || "";
}

if (!getApps().length) {
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (serviceAccountRaw) {
    const parsed = JSON.parse(serviceAccountRaw) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    const projectId = resolveProjectId(parsed.project_id);
    app = initializeApp({
      credential: cert(parsed as Parameters<typeof cert>[0]),
      projectId,
    });
  } else {
    const projectId = resolveProjectId();
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
