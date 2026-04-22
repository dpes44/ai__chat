import { FieldValue } from "firebase-admin/firestore";

import { DEFAULT_AI_ROUTING_CONFIG } from "../lib/ai";
import { logAudit } from "../lib/audit";
import { readContentSettings, writeContentSettings } from "../lib/content-store";
import {
  ADMIN_AUDIT_LOGS_COLLECTION,
  AI_METRICS_DAILY_COLLECTION,
  AI_PROVIDER_KEYS_DOC_PATH,
  AI_REQUEST_LOGS_COLLECTION,
  AI_ROUTING_DOC_PATH,
  APPOINTMENTS_COLLECTION,
  CONTENT_EMERGENCY_NUMBERS_COLLECTION,
  CONTENT_LEGAL_COLLECTION,
  CONTENT_THERAPIST_SUBSCRIPTIONS_COLLECTION,
  CONTENT_TOOLS_COLLECTION,
  DOCTORS_COLLECTION,
  FORUM_THREADS_COLLECTION,
  KEYS_DOC_PATH,
  MOOD_METRICS_DAILY_COLLECTION,
  NICKNAME_CLAIMS_COLLECTION,
  PROMPTS_DOC_PATH,
  SYSTEM_BOOTSTRAP_COLLECTION,
  USER_MOODS_COLLECTION,
  USERS_ROUTER_DOC_PATH,
  USERS_COLLECTION,
} from "../lib/constants";
import { db } from "../lib/firebase-admin";

type EnsureSummary = {
  appConfigRoutingCreated: boolean;
  usersRouterCreated: boolean;
  promptsDocCreated: boolean;
  providerKeysDocCreated: boolean;
  keysDocCreated: boolean;
  contentCollectionsSynced: boolean;
  usersCollectionEnsured: boolean;
  doctorsCollectionEnsured: boolean;
  appointmentsCollectionEnsured: boolean;
  forumCollectionEnsured: boolean;
  moodCollectionEnsured: boolean;
  healthCollectionEnsured: boolean;
  auditLogged: boolean;
};

async function ensureRoutingDoc(actor: string): Promise<boolean> {
  const ref = db.doc(AI_ROUTING_DOC_PATH);
  const snap = await ref.get();
  if (snap.exists) {
    return false;
  }

  await ref.set(
    {
      activeProvider: DEFAULT_AI_ROUTING_CONFIG.activeProvider,
      activeModel: DEFAULT_AI_ROUTING_CONFIG.activeModel,
      fallbackProvider: DEFAULT_AI_ROUTING_CONFIG.fallbackProvider,
      fallbackModel: DEFAULT_AI_ROUTING_CONFIG.fallbackModel,
      temperature: DEFAULT_AI_ROUTING_CONFIG.temperature,
      maxTokens: DEFAULT_AI_ROUTING_CONFIG.maxTokens,
      enabled: DEFAULT_AI_ROUTING_CONFIG.enabled,
      systemPromptTemplate: DEFAULT_AI_ROUTING_CONFIG.systemPromptTemplate,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor,
    },
    { merge: true },
  );

  return true;
}

async function ensureProviderKeysDoc(actor: string): Promise<boolean> {
  const ref = db.doc(AI_PROVIDER_KEYS_DOC_PATH);
  const snap = await ref.get();
  if (snap.exists) {
    return false;
  }

  await ref.set(
    {
      openaiVersion: 0,
      anthropicVersion: 0,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor,
    },
    { merge: true },
  );

  return true;
}

async function ensureUsersRouterDoc(actor: string): Promise<boolean> {
  const ref = db.doc(USERS_ROUTER_DOC_PATH);
  const snap = await ref.get();
  if (snap.exists) {
    return false;
  }

  await ref.set(
    {
      activeProvider: DEFAULT_AI_ROUTING_CONFIG.activeProvider,
      activeModel: DEFAULT_AI_ROUTING_CONFIG.activeModel,
      fallbackProvider: DEFAULT_AI_ROUTING_CONFIG.fallbackProvider,
      fallbackModel: DEFAULT_AI_ROUTING_CONFIG.fallbackModel,
      temperature: DEFAULT_AI_ROUTING_CONFIG.temperature,
      maxTokens: DEFAULT_AI_ROUTING_CONFIG.maxTokens,
      enabled: DEFAULT_AI_ROUTING_CONFIG.enabled,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor,
    },
    { merge: true },
  );

  return true;
}

async function ensurePromptsDoc(actor: string): Promise<boolean> {
  const ref = db.doc(PROMPTS_DOC_PATH);
  const snap = await ref.get();
  if (snap.exists) {
    return false;
  }

  await ref.set(
    {
      systemPromptTemplate: DEFAULT_AI_ROUTING_CONFIG.systemPromptTemplate,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor,
    },
    { merge: true },
  );

  return true;
}

async function ensureKeysDoc(actor: string): Promise<boolean> {
  const ref = db.doc(KEYS_DOC_PATH);
  const snap = await ref.get();
  if (snap.exists) {
    return false;
  }

  await ref.set(
    {
      openaiVersion: 0,
      anthropicVersion: 0,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor,
    },
    { merge: true },
  );

  return true;
}

async function ensureContentCollections(actor: string): Promise<void> {
  const payload = await readContentSettings({ includeLegacyFallback: true });
  await writeContentSettings(payload, actor);
}

async function ensureSystemBootstrap(actor: string): Promise<void> {
  const now = FieldValue.serverTimestamp();
  await db.collection(SYSTEM_BOOTSTRAP_COLLECTION).doc("collections").set(
    {
      schemaVersion: 2,
      ensuredAt: now,
      ensuredBy: actor,
      collections: [
        "admin_auth",
        ADMIN_AUDIT_LOGS_COLLECTION,
        "app_config",
        USERS_ROUTER_DOC_PATH.split("/")[0],
        PROMPTS_DOC_PATH.split("/")[0],
        KEYS_DOC_PATH.split("/")[0],
        USERS_COLLECTION,
        NICKNAME_CLAIMS_COLLECTION,
        DOCTORS_COLLECTION,
        APPOINTMENTS_COLLECTION,
        FORUM_THREADS_COLLECTION,
        `${FORUM_THREADS_COLLECTION}/{threadId}/replies`,
        USER_MOODS_COLLECTION,
        AI_REQUEST_LOGS_COLLECTION,
        AI_METRICS_DAILY_COLLECTION,
        MOOD_METRICS_DAILY_COLLECTION,
        CONTENT_EMERGENCY_NUMBERS_COLLECTION,
        CONTENT_TOOLS_COLLECTION,
        CONTENT_THERAPIST_SUBSCRIPTIONS_COLLECTION,
        CONTENT_LEGAL_COLLECTION,
      ],
      notes:
        "Runtime/bootstrap docs are tracked here. Domain collections no longer use _meta sentinel docs.",
      updatedAt: now,
      updatedBy: actor,
    },
    { merge: true },
  );
}

async function main() {
  const actor = process.argv[2]?.trim() || "script:ensure-firestore-structure";

  const summary: EnsureSummary = {
    appConfigRoutingCreated: false,
    usersRouterCreated: false,
    promptsDocCreated: false,
    providerKeysDocCreated: false,
    keysDocCreated: false,
    contentCollectionsSynced: false,
    usersCollectionEnsured: false,
    doctorsCollectionEnsured: false,
    appointmentsCollectionEnsured: false,
    forumCollectionEnsured: false,
    moodCollectionEnsured: false,
    healthCollectionEnsured: false,
    auditLogged: false,
  };

  summary.appConfigRoutingCreated = await ensureRoutingDoc(actor);
  summary.usersRouterCreated = await ensureUsersRouterDoc(actor);
  summary.promptsDocCreated = await ensurePromptsDoc(actor);
  summary.providerKeysDocCreated = await ensureProviderKeysDoc(actor);
  summary.keysDocCreated = await ensureKeysDoc(actor);

  await ensureContentCollections(actor);
  summary.contentCollectionsSynced = true;

  await ensureSystemBootstrap(actor);
  summary.usersCollectionEnsured = true;
  summary.doctorsCollectionEnsured = true;
  summary.appointmentsCollectionEnsured = true;
  summary.forumCollectionEnsured = true;
  summary.moodCollectionEnsured = true;
  summary.healthCollectionEnsured = true;

  await logAudit({
    actor,
    action: "FIRESTORE_STRUCTURE_ENSURED",
    target: "bootstrap",
    diffSummary: JSON.stringify(summary).slice(0, 900),
  });
  summary.auditLogged = true;

  console.log("Firestore structure ensured.");
  console.log(summary);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
