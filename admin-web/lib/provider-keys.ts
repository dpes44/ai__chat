import crypto from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import {
  AI_PROVIDER_KEYS_DOC_PATH,
  KEYS_DOC_PATH,
} from "./constants";
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
  const primaryRef = db.doc(KEYS_DOC_PATH);
  const legacyRef = db.doc(AI_PROVIDER_KEYS_DOC_PATH);
  let nextVersion = 1;
  const encrypted = encryptValue(params.newApiKey.trim());

  await db.runTransaction(async (tx) => {
    const primarySnap = await tx.get(primaryRef);
    const legacySnap = await tx.get(legacyRef);
    const currentPrimary = (primarySnap.data() ?? {}) as Record<string, unknown>;
    const currentLegacy = (legacySnap.data() ?? {}) as Record<string, unknown>;

    const primaryVersionRaw = currentPrimary[versionField(params.provider)];
    const legacyVersionRaw = currentLegacy[versionField(params.provider)];
    const primaryVersion =
      typeof primaryVersionRaw === "number" && Number.isFinite(primaryVersionRaw)
        ? primaryVersionRaw
        : 0;
    const legacyVersion =
      typeof legacyVersionRaw === "number" && Number.isFinite(legacyVersionRaw)
        ? legacyVersionRaw
        : 0;

    nextVersion = Math.max(primaryVersion, legacyVersion) + 1;

    tx.set(
      primaryRef,
      {
        [keyField(params.provider)]: encrypted,
        [versionField(params.provider)]: nextVersion,
        [updatedAtField(params.provider)]: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: params.actor,
      },
      { merge: true },
    );
    tx.set(
      legacyRef,
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
  const [primarySnap, legacySnap] = await Promise.all([
    db.doc(KEYS_DOC_PATH).get(),
    db.doc(AI_PROVIDER_KEYS_DOC_PATH).get(),
  ]);

  if (!primarySnap.exists && !legacySnap.exists) {
    throw new Error("Provider keys document not found.");
  }

  const primaryData = (primarySnap.data() ?? {}) as Record<string, unknown>;
  const legacyData = (legacySnap.data() ?? {}) as Record<string, unknown>;

  const primaryEncrypted = primaryData[keyField(provider)];
  if (typeof primaryEncrypted === "string" && primaryEncrypted.trim()) {
    return decryptValue(primaryEncrypted);
  }

  const legacyEncrypted = legacyData[keyField(provider)];
  if (typeof legacyEncrypted === "string" && legacyEncrypted.trim()) {
    return decryptValue(legacyEncrypted);
  }

  throw new Error(`Provider key not configured for ${provider}.`);
}

export async function getProviderKeyStatuses(): Promise<Record<Provider, ProviderKeyStatus>> {
  const [primarySnap, legacySnap] = await Promise.all([
    db.doc(KEYS_DOC_PATH).get(),
    db.doc(AI_PROVIDER_KEYS_DOC_PATH).get(),
  ]);
  const primaryData = (primarySnap.data() ?? {}) as Record<string, unknown>;
  const legacyData = (legacySnap.data() ?? {}) as Record<string, unknown>;

  const selectSourceFor = (provider: Provider): Record<string, unknown> => {
    const hasPrimaryCiphertext =
      typeof primaryData[keyField(provider)] === "string" &&
      (primaryData[keyField(provider)] as string).length > 0;
    if (hasPrimaryCiphertext || !legacySnap.exists) {
      return primaryData;
    }
    return legacyData;
  };

  const openaiSource = selectSourceFor("openai");
  const anthropicSource = selectSourceFor("anthropic");
  const openaiVersion = Number(openaiSource.openaiVersion ?? 0);
  const anthropicVersion = Number(anthropicSource.anthropicVersion ?? 0);

  return {
    openai: {
      configured:
        typeof openaiSource.openaiKeyCiphertext === "string" &&
        openaiSource.openaiKeyCiphertext.length > 0,
      version: Number.isFinite(openaiVersion) ? openaiVersion : 0,
      updatedAt: timestampToIso(openaiSource.openaiUpdatedAt),
    },
    anthropic: {
      configured:
        typeof anthropicSource.anthropicKeyCiphertext === "string" &&
        anthropicSource.anthropicKeyCiphertext.length > 0,
      version: Number.isFinite(anthropicVersion) ? anthropicVersion : 0,
      updatedAt: timestampToIso(anthropicSource.anthropicUpdatedAt),
    },
  };
}
