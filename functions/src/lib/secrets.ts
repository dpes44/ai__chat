import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const smClient = new SecretManagerServiceClient();
const cache = new Map<string, { value: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function toSecretVersionPath(secretRef: string): string {
  if (secretRef.includes("/versions/")) {
    return secretRef;
  }

  if (secretRef.startsWith("projects/")) {
    return `${secretRef}/versions/latest`;
  }

  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  if (!projectId) {
    throw new Error("Missing GCP project id for Secret Manager access.");
  }

  return `projects/${projectId}/secrets/${secretRef}/versions/latest`;
}

export async function getSecretValue(secretRef: string): Promise<string> {
  const cached = cache.get(secretRef);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const name = toSecretVersionPath(secretRef);
  const [version] = await smClient.accessSecretVersion({ name });
  const payloadData = version.payload?.data;
  const data = payloadData ? Buffer.from(payloadData).toString("utf8").trim() : "";

  if (!data) {
    throw new Error(`Secret ${secretRef} is empty.`);
  }

  cache.set(secretRef, { value: data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}
