import { FieldValue } from "firebase-admin/firestore";

import { DEFAULT_AI_ROUTING_CONFIG } from "../lib/ai";
import { logAudit } from "../lib/audit";
import { readContentSettings, writeContentSettings } from "../lib/content-store";
import {
  AI_PROVIDER_KEYS_DOC_PATH,
  AI_REQUEST_LOGS_COLLECTION,
  AI_ROUTING_DOC_PATH,
  APPOINTMENTS_COLLECTION,
  COLLECTION_META_DOC_ID,
  DOCTORS_COLLECTION,
  FORUM_REPLIES_SUBCOLLECTION,
  FORUM_THREADS_COLLECTION,
  USER_MOODS_COLLECTION,
  USERS_COLLECTION,
} from "../lib/constants";
import { db } from "../lib/firebase-admin";

type EnsureSummary = {
  appConfigRoutingCreated: boolean;
  providerKeysDocCreated: boolean;
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

async function ensureContentCollections(actor: string): Promise<void> {
  const payload = await readContentSettings({ includeLegacyFallback: true });
  await writeContentSettings(payload, actor);
}

async function ensureCollectionMetaDocs(actor: string): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();

  batch.set(
    db.collection(USERS_COLLECTION).doc(COLLECTION_META_DOC_ID),
    {
      kind: "meta",
      uid: COLLECTION_META_DOC_ID,
      nickname: COLLECTION_META_DOC_ID,
      nicknameKey: COLLECTION_META_DOC_ID,
      isGuest: true,
      createdAt: now,
      updatedAt: now,
      updatedBy: actor,
    },
    { merge: true },
  );

  batch.set(
    db.collection(DOCTORS_COLLECTION).doc(COLLECTION_META_DOC_ID),
    {
      kind: "meta",
      name: COLLECTION_META_DOC_ID,
      specialization: COLLECTION_META_DOC_ID,
      bio: "",
      location: "",
      profileLink: "",
      photoUrl: "",
      isActive: false,
      createdAt: now,
      updatedAt: now,
      updatedBy: actor,
    },
    { merge: true },
  );

  batch.set(
    db.collection(APPOINTMENTS_COLLECTION).doc(COLLECTION_META_DOC_ID),
    {
      kind: "meta",
      userUid: COLLECTION_META_DOC_ID,
      userNickname: COLLECTION_META_DOC_ID,
      doctorId: COLLECTION_META_DOC_ID,
      doctorName: COLLECTION_META_DOC_ID,
      doctorSpecialization: COLLECTION_META_DOC_ID,
      preferredDate: now,
      issueSummary: COLLECTION_META_DOC_ID,
      preferredLocation: "",
      onlineMeetingLink: "",
      note: "",
      status: "meta",
      adminNote: "",
      requestSource: "system",
      createdAt: now,
      updatedAt: now,
      updatedBy: actor,
    },
    { merge: true },
  );

  batch.set(
    db.collection(FORUM_THREADS_COLLECTION).doc(COLLECTION_META_DOC_ID),
    {
      kind: "meta",
      title: COLLECTION_META_DOC_ID,
      body: COLLECTION_META_DOC_ID,
      author: "system",
      authorUid: COLLECTION_META_DOC_ID,
      createdAt: now,
      replyCount: 0,
      edited: false,
      isFlagged: false,
      isHidden: false,
      updatedAt: now,
      updatedBy: actor,
    },
    { merge: true },
  );

  batch.set(
    db
      .collection(FORUM_THREADS_COLLECTION)
      .doc(COLLECTION_META_DOC_ID)
      .collection(FORUM_REPLIES_SUBCOLLECTION)
      .doc(COLLECTION_META_DOC_ID),
    {
      kind: "meta",
      threadId: COLLECTION_META_DOC_ID,
      body: COLLECTION_META_DOC_ID,
      author: "system",
      authorUid: COLLECTION_META_DOC_ID,
      createdAt: now,
      edited: false,
      isFlagged: false,
      isHidden: false,
      updatedAt: now,
      updatedBy: actor,
    },
    { merge: true },
  );

  batch.set(
    db.collection(USER_MOODS_COLLECTION).doc(COLLECTION_META_DOC_ID),
    {
      kind: "meta",
      uid: COLLECTION_META_DOC_ID,
      createdAt: now,
      updatedAt: now,
      updatedBy: actor,
    },
    { merge: true },
  );

  batch.set(
    db.collection(AI_REQUEST_LOGS_COLLECTION).doc(COLLECTION_META_DOC_ID),
    {
      kind: "meta",
      updatedAt: now,
      updatedBy: actor,
    },
    { merge: true },
  );

  await batch.commit();
}

async function main() {
  const actor = process.argv[2]?.trim() || "script:ensure-firestore-structure";

  const summary: EnsureSummary = {
    appConfigRoutingCreated: false,
    providerKeysDocCreated: false,
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
  summary.providerKeysDocCreated = await ensureProviderKeysDoc(actor);

  await ensureContentCollections(actor);
  summary.contentCollectionsSynced = true;

  await ensureCollectionMetaDocs(actor);
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
