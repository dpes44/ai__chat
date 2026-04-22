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
import { emitScriptSummary, parseScriptOptions } from "./lib/script-runtime";

type EnsureSummary = {
  actor: string;
  dryRun: boolean;
  missingDocsBefore: string[];
  missingDocsAfter: string[];
  docsCreatedOrPlanned: string[];
  contentSyncRequiredBefore: boolean;
  contentSyncRequiredAfter: boolean;
  legacyContentFieldsPresentBefore: boolean;
  legacyContentFieldsPresentAfter: boolean;
  bootstrapDocMissingBefore: boolean;
  bootstrapSchemaVersionBefore: number | null;
  bootstrapMissingCollectionsBefore: string[];
  bootstrapDocMissingAfter: boolean;
  bootstrapSchemaVersionAfter: number | null;
  bootstrapMissingCollectionsAfter: string[];
  bootstrapUpdated: boolean;
  auditLogged: boolean;
};

const REQUIRED_DOCS = [
  AI_ROUTING_DOC_PATH,
  USERS_ROUTER_DOC_PATH,
  PROMPTS_DOC_PATH,
  AI_PROVIDER_KEYS_DOC_PATH,
  KEYS_DOC_PATH,
  `${SYSTEM_BOOTSTRAP_COLLECTION}/collections`,
];

const REQUIRED_COLLECTION_NAMES = [
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
];

function stable(value: unknown): string {
  return JSON.stringify(value);
}

async function ensureDocIfMissing(params: {
  path: string;
  actor: string;
  dryRun: boolean;
  data: Record<string, unknown>;
}): Promise<boolean> {
  const ref = db.doc(params.path);
  const snap = await ref.get();
  if (snap.exists) {
    return false;
  }

  if (params.dryRun) {
    return true;
  }

  await ref.set(
    {
      ...params.data,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: params.actor,
    },
    { merge: true },
  );

  return true;
}

async function ensureRoutingDoc(actor: string, dryRun: boolean): Promise<boolean> {
  return ensureDocIfMissing({
    path: AI_ROUTING_DOC_PATH,
    actor,
    dryRun,
    data: {
      activeProvider: DEFAULT_AI_ROUTING_CONFIG.activeProvider,
      activeModel: DEFAULT_AI_ROUTING_CONFIG.activeModel,
      fallbackProvider: DEFAULT_AI_ROUTING_CONFIG.fallbackProvider,
      fallbackModel: DEFAULT_AI_ROUTING_CONFIG.fallbackModel,
      temperature: DEFAULT_AI_ROUTING_CONFIG.temperature,
      maxTokens: DEFAULT_AI_ROUTING_CONFIG.maxTokens,
      enabled: DEFAULT_AI_ROUTING_CONFIG.enabled,
      systemPromptTemplate: DEFAULT_AI_ROUTING_CONFIG.systemPromptTemplate,
    },
  });
}

async function ensureProviderKeysDoc(
  actor: string,
  dryRun: boolean,
): Promise<boolean> {
  return ensureDocIfMissing({
    path: AI_PROVIDER_KEYS_DOC_PATH,
    actor,
    dryRun,
    data: {
      openaiVersion: 0,
      anthropicVersion: 0,
    },
  });
}

async function ensureUsersRouterDoc(actor: string, dryRun: boolean): Promise<boolean> {
  return ensureDocIfMissing({
    path: USERS_ROUTER_DOC_PATH,
    actor,
    dryRun,
    data: {
      activeProvider: DEFAULT_AI_ROUTING_CONFIG.activeProvider,
      activeModel: DEFAULT_AI_ROUTING_CONFIG.activeModel,
      fallbackProvider: DEFAULT_AI_ROUTING_CONFIG.fallbackProvider,
      fallbackModel: DEFAULT_AI_ROUTING_CONFIG.fallbackModel,
      temperature: DEFAULT_AI_ROUTING_CONFIG.temperature,
      maxTokens: DEFAULT_AI_ROUTING_CONFIG.maxTokens,
      enabled: DEFAULT_AI_ROUTING_CONFIG.enabled,
    },
  });
}

async function ensurePromptsDoc(actor: string, dryRun: boolean): Promise<boolean> {
  return ensureDocIfMissing({
    path: PROMPTS_DOC_PATH,
    actor,
    dryRun,
    data: {
      systemPromptTemplate: DEFAULT_AI_ROUTING_CONFIG.systemPromptTemplate,
    },
  });
}

async function ensureKeysDoc(actor: string, dryRun: boolean): Promise<boolean> {
  return ensureDocIfMissing({
    path: KEYS_DOC_PATH,
    actor,
    dryRun,
    data: {
      openaiVersion: 0,
      anthropicVersion: 0,
    },
  });
}

async function inspectContentSyncState(): Promise<{
  needsSync: boolean;
  legacyContentFieldsPresent: boolean;
}> {
  const [collectionPayload, resolvedPayload, routingSnap] = await Promise.all([
    readContentSettings({ includeLegacyFallback: false }),
    readContentSettings({ includeLegacyFallback: true }),
    db.doc(AI_ROUTING_DOC_PATH).get(),
  ]);
  const routingData = (routingSnap.data() ?? {}) as Record<string, unknown>;
  const legacyContentFieldsPresent =
    Object.prototype.hasOwnProperty.call(routingData, "tools") ||
    Object.prototype.hasOwnProperty.call(routingData, "therapistSubscriptions") ||
    Object.prototype.hasOwnProperty.call(routingData, "legalContent");

  return {
    needsSync:
      stable(collectionPayload) !== stable(resolvedPayload) ||
      legacyContentFieldsPresent,
    legacyContentFieldsPresent,
  };
}

async function maybeSyncContentCollections(
  actor: string,
  dryRun: boolean,
): Promise<boolean> {
  const state = await inspectContentSyncState();
  if (!state.needsSync) {
    return false;
  }
  if (dryRun) {
    return true;
  }

  const payload = await readContentSettings({ includeLegacyFallback: true });
  await writeContentSettings(payload, actor);
  return true;
}

async function inspectSystemBootstrapState(): Promise<{
  docMissing: boolean;
  schemaVersion: number | null;
  missingCollections: string[];
  driftDetected: boolean;
}> {
  const snap = await db
    .collection(SYSTEM_BOOTSTRAP_COLLECTION)
    .doc("collections")
    .get();

  const data = (snap.data() ?? {}) as {
    schemaVersion?: unknown;
    collections?: unknown;
  };
  const schemaVersion =
    typeof data.schemaVersion === "number" ? data.schemaVersion : null;
  const existingCollections = Array.isArray(data.collections)
    ? data.collections.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0,
      )
    : [];
  const existingSet = new Set(existingCollections);
  const missingCollections = REQUIRED_COLLECTION_NAMES.filter(
    (name) => !existingSet.has(name),
  );

  const docMissing = !snap.exists;
  return {
    docMissing,
    schemaVersion,
    missingCollections,
    driftDetected: docMissing || schemaVersion !== 2 || missingCollections.length > 0,
  };
}

async function ensureSystemBootstrap(
  actor: string,
  dryRun: boolean,
): Promise<boolean> {
  const state = await inspectSystemBootstrapState();
  if (!state.driftDetected) {
    return false;
  }
  if (dryRun) {
    return true;
  }

  const now = FieldValue.serverTimestamp();
  await db.collection(SYSTEM_BOOTSTRAP_COLLECTION).doc("collections").set(
    {
      schemaVersion: 2,
      ensuredAt: now,
      ensuredBy: actor,
      collections: REQUIRED_COLLECTION_NAMES,
      notes:
        "Runtime/bootstrap docs are tracked here. Domain collections no longer use _meta sentinel docs.",
      updatedAt: now,
      updatedBy: actor,
    },
    { merge: true },
  );

  return true;
}

async function listMissingRequiredDocs(): Promise<string[]> {
  const snaps = await Promise.all(REQUIRED_DOCS.map((path) => db.doc(path).get()));
  return REQUIRED_DOCS.filter((_, index) => !snaps[index]?.exists);
}

async function main() {
  const options = parseScriptOptions("script:ensure-firestore-structure");
  const summary: EnsureSummary = {
    actor: options.actor,
    dryRun: options.dryRun,
    missingDocsBefore: [],
    missingDocsAfter: [],
    docsCreatedOrPlanned: [],
    contentSyncRequiredBefore: false,
    contentSyncRequiredAfter: false,
    legacyContentFieldsPresentBefore: false,
    legacyContentFieldsPresentAfter: false,
    bootstrapDocMissingBefore: false,
    bootstrapSchemaVersionBefore: null,
    bootstrapMissingCollectionsBefore: [],
    bootstrapDocMissingAfter: false,
    bootstrapSchemaVersionAfter: null,
    bootstrapMissingCollectionsAfter: [],
    bootstrapUpdated: false,
    auditLogged: false,
  };

  summary.missingDocsBefore = await listMissingRequiredDocs();

  if (await ensureRoutingDoc(options.actor, options.dryRun)) {
    summary.docsCreatedOrPlanned.push(AI_ROUTING_DOC_PATH);
  }
  if (await ensureUsersRouterDoc(options.actor, options.dryRun)) {
    summary.docsCreatedOrPlanned.push(USERS_ROUTER_DOC_PATH);
  }
  if (await ensurePromptsDoc(options.actor, options.dryRun)) {
    summary.docsCreatedOrPlanned.push(PROMPTS_DOC_PATH);
  }
  if (await ensureProviderKeysDoc(options.actor, options.dryRun)) {
    summary.docsCreatedOrPlanned.push(AI_PROVIDER_KEYS_DOC_PATH);
  }
  if (await ensureKeysDoc(options.actor, options.dryRun)) {
    summary.docsCreatedOrPlanned.push(KEYS_DOC_PATH);
  }

  const contentBefore = await inspectContentSyncState();
  summary.contentSyncRequiredBefore = contentBefore.needsSync;
  summary.legacyContentFieldsPresentBefore = contentBefore.legacyContentFieldsPresent;
  if (await maybeSyncContentCollections(options.actor, options.dryRun)) {
    summary.docsCreatedOrPlanned.push("content:*");
  }

  const bootstrapBefore = await inspectSystemBootstrapState();
  summary.bootstrapDocMissingBefore = bootstrapBefore.docMissing;
  summary.bootstrapSchemaVersionBefore = bootstrapBefore.schemaVersion;
  summary.bootstrapMissingCollectionsBefore = bootstrapBefore.missingCollections;
  summary.bootstrapUpdated = await ensureSystemBootstrap(
    options.actor,
    options.dryRun,
  );
  if (summary.bootstrapUpdated) {
    summary.docsCreatedOrPlanned.push(`${SYSTEM_BOOTSTRAP_COLLECTION}/collections`);
  }

  if (!options.dryRun) {
    await logAudit({
      actor: options.actor,
      action: "FIRESTORE_STRUCTURE_ENSURED",
      target: "bootstrap",
      diffSummary: JSON.stringify({
        docsCreatedOrPlanned: summary.docsCreatedOrPlanned,
        contentSyncRequiredBefore: summary.contentSyncRequiredBefore,
        bootstrapMissingCollectionsBefore:
          summary.bootstrapMissingCollectionsBefore.length,
      }).slice(0, 900),
    });
    summary.auditLogged = true;
  }

  summary.missingDocsAfter = await listMissingRequiredDocs();
  const contentAfter = options.dryRun
    ? contentBefore
    : await inspectContentSyncState();
  summary.contentSyncRequiredAfter = contentAfter.needsSync;
  summary.legacyContentFieldsPresentAfter = contentAfter.legacyContentFieldsPresent;

  const bootstrapAfter = options.dryRun
    ? bootstrapBefore
    : await inspectSystemBootstrapState();
  summary.bootstrapDocMissingAfter = bootstrapAfter.docMissing;
  summary.bootstrapSchemaVersionAfter = bootstrapAfter.schemaVersion;
  summary.bootstrapMissingCollectionsAfter = bootstrapAfter.missingCollections;

  const driftDetected =
    summary.missingDocsAfter.length > 0 ||
    summary.contentSyncRequiredAfter ||
    summary.bootstrapDocMissingAfter ||
    summary.bootstrapSchemaVersionAfter !== 2 ||
    summary.bootstrapMissingCollectionsAfter.length > 0;

  emitScriptSummary({
    script: "ensure-firestore-structure",
    dryRun: options.dryRun,
    driftDetected,
    ok: !driftDetected,
    summary,
  });

  if (driftDetected) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
