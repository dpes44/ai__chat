import crypto from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { AI_PROVIDER_KEYS_DOC_PATH } from "./constants";
import { db } from "./firebase-admin";
import { Provider } from "./ai";

type ProviderKeyStatus = {
  configured: boolean;
  version: number;
  updatedAt?: string;
};

function encryptionSecret(): string {
  const secret = process.env.ADMIN_KEYS_ENCRYPTION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_KEYS_ENCRYPTION_SECRET must be at least 32 characters.");
  }
  return secret;
}

function encryptionKey(): Buffer {
  return crypto.createHash("sha256").update(encryptionSecret(), "utf8").digest();
}

function encryptValue(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

function decryptValue(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted key payload.");
  }

  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8").trim();

  if (!decrypted) {
    throw new Error("Decrypted key is empty.");
  }
  return decrypted;
}

function keyField(provider: Provider): string {
  return provider === "openai" ? "openaiKeyCiphertext" : "anthropicKeyCiphertext";
}

function versionField(provider: Provider): string {
  return provider === "openai" ? "openaiVersion" : "anthropicVersion";
}

function updatedAtField(provider: Provider): string {
  return provider === "openai" ? "openaiUpdatedAt" : "anthropicUpdatedAt";
}

function timestampToIso(value: unknown): string | undefined {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  return undefined;
}

export async function setProviderApiKey(params: {
  provider: Provider;
  newApiKey: string;
  actor: string;
}): Promise<{ version: number }> {
  const ref = db.doc(AI_PROVIDER_KEYS_DOC_PATH);
  let nextVersion = 1;
  const encrypted = encryptValue(params.newApiKey.trim());

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = (snap.data() ?? {}) as Record<string, unknown>;
    const currentVersionRaw = current[versionField(params.provider)];
    const currentVersion =
      typeof currentVersionRaw === "number" && Number.isFinite(currentVersionRaw)
        ? currentVersionRaw
        : 0;

    nextVersion = currentVersion + 1;

    tx.set(
      ref,
      {
        [keyField(params.provider)]: encrypted,
        [versionField(params.provider)]: nextVersion,
        [updatedAtField(params.provider)]: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: params.actor,
      },
      { merge: true },
    );
  });

  return { version: nextVersion };
}

export async function getProviderApiKey(provider: Provider): Promise<string> {
  const snap = await db.doc(AI_PROVIDER_KEYS_DOC_PATH).get();
  if (!snap.exists) {
    throw new Error("Provider keys document not found.");
  }

  const data = snap.data() as Record<string, unknown>;
  const encrypted = data[keyField(provider)];
  if (typeof encrypted !== "string" || !encrypted.trim()) {
    throw new Error(`Provider key not configured for ${provider}.`);
  }

  return decryptValue(encrypted);
}

export async function getProviderKeyStatuses(): Promise<Record<Provider, ProviderKeyStatus>> {
  const snap = await db.doc(AI_PROVIDER_KEYS_DOC_PATH).get();
  const data = (snap.exists ? snap.data() : {}) as Record<string, unknown>;

  const openaiVersion = Number(data.openaiVersion ?? 0);
  const anthropicVersion = Number(data.anthropicVersion ?? 0);

  return {
    openai: {
      configured: typeof data.openaiKeyCiphertext === "string" && data.openaiKeyCiphertext.length > 0,
      version: Number.isFinite(openaiVersion) ? openaiVersion : 0,
      updatedAt: timestampToIso(data.openaiUpdatedAt),
    },
    anthropic: {
      configured:
        typeof data.anthropicKeyCiphertext === "string" && data.anthropicKeyCiphertext.length > 0,
      version: Number.isFinite(anthropicVersion) ? anthropicVersion : 0,
      updatedAt: timestampToIso(data.anthropicUpdatedAt),
    },
  };
}
