import { FieldValue } from "firebase-admin/firestore";

import {
  AiRoutingConfig,
  DEFAULT_AI_ROUTING_CONFIG,
  LegalContentConfig,
  normalizeRoutingConfig,
  PromptContextConfig,
  TherapistSubscriptionConfig,
  ToolConfig,
} from "./ai";
import {
  AI_ROUTING_DOC_PATH,
  CONTENT_EMERGENCY_NUMBERS_COLLECTION,
  CONTENT_LEGAL_COLLECTION,
  CONTENT_THERAPIST_SUBSCRIPTIONS_COLLECTION,
  CONTENT_TOOLS_COLLECTION,
} from "./constants";
import { db } from "./firebase-admin";

type EmergencyPromptContextKeys =
  | "suicideHelpline"
  | "policeEmergency"
  | "ambulanceNumber"
  | "childHelpline"
  | "womenGbvHelpline"
  | "psychosocialHelpline";

export interface ContentSettingsPayload {
  promptContext: Pick<PromptContextConfig, EmergencyPromptContextKeys>;
  tools: ToolConfig[];
  therapistSubscriptions: TherapistSubscriptionConfig[];
  legalContent: LegalContentConfig;
}

const EMERGENCY_KEYS: EmergencyPromptContextKeys[] = [
  "suicideHelpline",
  "policeEmergency",
  "ambulanceNumber",
  "childHelpline",
  "womenGbvHelpline",
  "psychosocialHelpline",
];

function emptyPromptContext(): Pick<PromptContextConfig, EmergencyPromptContextKeys> {
  return {
    suicideHelpline: DEFAULT_AI_ROUTING_CONFIG.promptContext.suicideHelpline,
    policeEmergency: DEFAULT_AI_ROUTING_CONFIG.promptContext.policeEmergency,
    ambulanceNumber: DEFAULT_AI_ROUTING_CONFIG.promptContext.ambulanceNumber,
    childHelpline: DEFAULT_AI_ROUTING_CONFIG.promptContext.childHelpline,
    womenGbvHelpline: DEFAULT_AI_ROUTING_CONFIG.promptContext.womenGbvHelpline,
    psychosocialHelpline: DEFAULT_AI_ROUTING_CONFIG.promptContext.psychosocialHelpline,
  };
}

function emptyLegalContent(): LegalContentConfig {
  return {
    termsTitle: DEFAULT_AI_ROUTING_CONFIG.legalContent.termsTitle,
    termsBody: DEFAULT_AI_ROUTING_CONFIG.legalContent.termsBody,
    privacyTitle: DEFAULT_AI_ROUTING_CONFIG.legalContent.privacyTitle,
    privacyBody: DEFAULT_AI_ROUTING_CONFIG.legalContent.privacyBody,
  };
}

function safeString(value: unknown): string {
  return (value ?? "").toString().trim();
}

function toFiniteNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sanitizeDocId(input: string, fallback: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return fallback;
  }
  const sanitized = trimmed
    .replaceAll("/", "_")
    .replaceAll("\\", "_")
    .replaceAll("#", "_")
    .replaceAll("?", "_")
    .replaceAll("[", "_")
    .replaceAll("]", "_")
    .trim();
  return sanitized || fallback;
}

function normalizeTool(raw: Record<string, unknown>): ToolConfig {
  const questionsRaw = Array.isArray(raw.questions) ? raw.questions : [];
  const responsesRaw = Array.isArray(raw.responses) ? raw.responses : [];

  return {
    id: safeString(raw.id),
    nameEn: safeString(raw.nameEn),
    nameNp: safeString(raw.nameNp),
    summary: safeString(raw.summary),
    descriptionEn: safeString(raw.descriptionEn),
    descriptionNp: safeString(raw.descriptionNp),
    questions: questionsRaw.map((question) => {
      const q = (question ?? {}) as Record<string, unknown>;
      const optionsRaw = Array.isArray(q.options) ? q.options : [];
      return {
        textEn: safeString(q.textEn),
        textNp: safeString(q.textNp),
        options: optionsRaw.map((option) => {
          const o = (option ?? {}) as Record<string, unknown>;
          return {
            labelEn: safeString(o.labelEn),
            labelNp: safeString(o.labelNp),
            score: toFiniteNumber(o.score),
          };
        }),
      };
    }),
    responses: responsesRaw.map((response) => {
      const r = (response ?? {}) as Record<string, unknown>;
      return {
        min: toFiniteNumber(r.min),
        max: toFiniteNumber(r.max),
        textEn: safeString(r.textEn),
        textNp: safeString(r.textNp),
      };
    }),
  };
}

function normalizeToolInput(raw: ToolConfig): ToolConfig {
  return {
    id: safeString(raw.id),
    nameEn: safeString(raw.nameEn),
    nameNp: safeString(raw.nameNp),
    summary: safeString(raw.summary),
    descriptionEn: safeString(raw.descriptionEn),
    descriptionNp: safeString(raw.descriptionNp),
    questions: (Array.isArray(raw.questions) ? raw.questions : []).map(
      (question) => ({
        textEn: safeString(question.textEn),
        textNp: safeString(question.textNp),
        options: (Array.isArray(question.options) ? question.options : []).map(
          (option) => ({
            labelEn: safeString(option.labelEn),
            labelNp: safeString(option.labelNp),
            score: toFiniteNumber(option.score),
          }),
        ),
      }),
    ),
    responses: (Array.isArray(raw.responses) ? raw.responses : []).map(
      (response) => ({
        min: toFiniteNumber(response.min),
        max: toFiniteNumber(response.max),
        textEn: safeString(response.textEn),
        textNp: safeString(response.textNp),
      }),
    ),
  };
}

function normalizeTherapistSubscription(
  raw: Record<string, unknown>,
): TherapistSubscriptionConfig {
  return {
    name: safeString(raw.name),
    sessions: Math.max(0, Math.trunc(toFiniteNumber(raw.sessions))),
    price: safeString(raw.price),
    period: safeString(raw.period),
    blurb: safeString(raw.blurb),
    tag: safeString(raw.tag),
    featured: raw.featured === true,
    ctaLabel: safeString(raw.ctaLabel),
  };
}

function normalizeTherapistSubscriptionInput(
  raw: TherapistSubscriptionConfig,
): TherapistSubscriptionConfig {
  return {
    name: safeString(raw.name),
    sessions: Math.max(0, Math.trunc(toFiniteNumber(raw.sessions))),
    price: safeString(raw.price),
    period: safeString(raw.period),
    blurb: safeString(raw.blurb),
    tag: safeString(raw.tag),
    featured: raw.featured === true,
    ctaLabel: safeString(raw.ctaLabel),
  };
}

async function readLegacyRoutingConfig(): Promise<AiRoutingConfig> {
  const routingSnap = await db.doc(AI_ROUTING_DOC_PATH).get();
  return normalizeRoutingConfig(
    routingSnap.exists
      ? (routingSnap.data() as Partial<AiRoutingConfig>)
      : undefined,
  );
}

export async function readEmergencyPromptContextFromCollections(): Promise<{
  values: Partial<Pick<PromptContextConfig, EmergencyPromptContextKeys>>;
  hasAny: boolean;
}> {
  const snap = await db.collection(CONTENT_EMERGENCY_NUMBERS_COLLECTION).get();
  if (snap.empty) {
    return { values: {}, hasAny: false };
  }

  const values: Partial<Pick<PromptContextConfig, EmergencyPromptContextKeys>> =
    {};
  for (const doc of snap.docs) {
    const key = doc.id as EmergencyPromptContextKeys;
    if (!EMERGENCY_KEYS.includes(key)) {
      continue;
    }
    const value = safeString(doc.data().value);
    values[key] = value;
  }
  return {
    values,
    hasAny: Object.keys(values).length > 0,
  };
}

async function readLegalContentFromCollections(): Promise<{
  values: Partial<LegalContentConfig>;
  hasAny: boolean;
}> {
  const termsRef = db.collection(CONTENT_LEGAL_COLLECTION).doc("terms");
  const privacyRef = db.collection(CONTENT_LEGAL_COLLECTION).doc("privacy");
  const [termsSnap, privacySnap] = await db.getAll(termsRef, privacyRef);

  const values: Partial<LegalContentConfig> = {};
  if (termsSnap.exists) {
    values.termsTitle = safeString(termsSnap.data()?.title);
    values.termsBody = safeString(termsSnap.data()?.body);
  }
  if (privacySnap.exists) {
    values.privacyTitle = safeString(privacySnap.data()?.title);
    values.privacyBody = safeString(privacySnap.data()?.body);
  }

  return {
    values,
    hasAny: termsSnap.exists || privacySnap.exists,
  };
}

async function readToolsFromCollections(): Promise<{
  values: ToolConfig[];
  hasAny: boolean;
}> {
  const snap = await db.collection(CONTENT_TOOLS_COLLECTION).get();
  if (snap.empty) {
    return { values: [], hasAny: false };
  }
  const values = snap.docs
    .map((doc) => {
      const data = (doc.data() ?? {}) as Record<string, unknown>;
      const order = Math.max(0, Math.trunc(toFiniteNumber(data.order)));
      return {
        order,
        tool: normalizeTool(data),
      };
    })
    .sort((a, b) => a.order - b.order)
    .map((item) => item.tool)
    .filter((tool) => tool.id && tool.nameEn);

  return {
    values,
    hasAny: true,
  };
}

async function readTherapistSubscriptionsFromCollections(): Promise<{
  values: TherapistSubscriptionConfig[];
  hasAny: boolean;
}> {
  const snap = await db
    .collection(CONTENT_THERAPIST_SUBSCRIPTIONS_COLLECTION)
    .get();
  if (snap.empty) {
    return { values: [], hasAny: false };
  }
  const values = snap.docs
    .map((doc) => {
      const data = (doc.data() ?? {}) as Record<string, unknown>;
      const order = Math.max(0, Math.trunc(toFiniteNumber(data.order)));
      return {
        order,
        subscription: normalizeTherapistSubscription(data),
      };
    })
    .sort((a, b) => a.order - b.order)
    .map((item) => item.subscription)
    .filter((item) => item.name);

  return {
    values,
    hasAny: true,
  };
}

function legacyContentPayload(
  routing: AiRoutingConfig,
): ContentSettingsPayload {
  return {
    promptContext: {
      suicideHelpline: safeString(routing.promptContext.suicideHelpline),
      policeEmergency: safeString(routing.promptContext.policeEmergency),
      ambulanceNumber: safeString(routing.promptContext.ambulanceNumber),
      childHelpline: safeString(routing.promptContext.childHelpline),
      womenGbvHelpline: safeString(routing.promptContext.womenGbvHelpline),
      psychosocialHelpline: safeString(routing.promptContext.psychosocialHelpline),
    },
    tools: Array.isArray(routing.tools) ? routing.tools : [],
    therapistSubscriptions: Array.isArray(routing.therapistSubscriptions)
      ? routing.therapistSubscriptions
      : [],
    legalContent: {
      termsTitle: safeString(routing.legalContent.termsTitle),
      termsBody: safeString(routing.legalContent.termsBody),
      privacyTitle: safeString(routing.legalContent.privacyTitle),
      privacyBody: safeString(routing.legalContent.privacyBody),
    },
  };
}

export async function readContentSettings(options?: {
  includeLegacyFallback?: boolean;
}): Promise<ContentSettingsPayload> {
  const includeLegacyFallback = options?.includeLegacyFallback !== false;
  const [
    emergencyResult,
    toolsResult,
    subscriptionsResult,
    legalResult,
    legacyRouting,
  ] = await Promise.all([
    readEmergencyPromptContextFromCollections(),
    readToolsFromCollections(),
    readTherapistSubscriptionsFromCollections(),
    readLegalContentFromCollections(),
    includeLegacyFallback ? readLegacyRoutingConfig() : Promise.resolve(null),
  ]);

  const defaults: ContentSettingsPayload = {
    promptContext: emptyPromptContext(),
    tools: [],
    therapistSubscriptions: [],
    legalContent: emptyLegalContent(),
  };

  const legacy = legacyRouting
    ? legacyContentPayload(legacyRouting)
    : defaults;

  return {
    promptContext: {
      ...defaults.promptContext,
      ...(includeLegacyFallback ? legacy.promptContext : {}),
      ...emergencyResult.values,
    },
    tools: toolsResult.hasAny
      ? toolsResult.values
      : includeLegacyFallback
        ? legacy.tools
        : [],
    therapistSubscriptions: subscriptionsResult.hasAny
      ? subscriptionsResult.values
      : includeLegacyFallback
        ? legacy.therapistSubscriptions
        : [],
    legalContent: {
      ...defaults.legalContent,
      ...(includeLegacyFallback ? legacy.legalContent : {}),
      ...legalResult.values,
    },
  };
}

export async function readAiPromptContextOverrides(options?: {
  legacyPromptContext?: PromptContextConfig;
}): Promise<Partial<PromptContextConfig>> {
  const emergencyResult = await readEmergencyPromptContextFromCollections();
  if (emergencyResult.hasAny) {
    return emergencyResult.values;
  }

  const legacyPromptContext =
    options?.legacyPromptContext ?? DEFAULT_AI_ROUTING_CONFIG.promptContext;

  return {
    suicideHelpline: safeString(legacyPromptContext.suicideHelpline),
    policeEmergency: safeString(legacyPromptContext.policeEmergency),
    ambulanceNumber: safeString(legacyPromptContext.ambulanceNumber),
    childHelpline: safeString(legacyPromptContext.childHelpline),
    womenGbvHelpline: safeString(legacyPromptContext.womenGbvHelpline),
    psychosocialHelpline: safeString(legacyPromptContext.psychosocialHelpline),
  };
}

export async function writeContentSettings(
  payload: ContentSettingsPayload,
  actor: string,
): Promise<void> {
  const [
    existingToolDocs,
    existingSubscriptionDocs,
  ] = await Promise.all([
    db.collection(CONTENT_TOOLS_COLLECTION).get(),
    db.collection(CONTENT_THERAPIST_SUBSCRIPTIONS_COLLECTION).get(),
  ]);

  const batch = db.batch();
  const now = FieldValue.serverTimestamp();

  for (const key of EMERGENCY_KEYS) {
    batch.set(
      db.collection(CONTENT_EMERGENCY_NUMBERS_COLLECTION).doc(key),
      {
        key,
        value: safeString(payload.promptContext[key]),
        updatedAt: now,
        updatedBy: actor,
      },
      { merge: true },
    );
  }
  for (const doc of existingToolDocs.docs) {
    batch.delete(doc.ref);
  }
  for (let i = 0; i < payload.tools.length; i += 1) {
    const tool = normalizeToolInput(payload.tools[i]!);
    const docId = sanitizeDocId(
      `${String(i + 1).padStart(3, "0")}__${tool.id}`,
      `tool_${String(i + 1).padStart(3, "0")}`,
    );
    batch.set(
      db.collection(CONTENT_TOOLS_COLLECTION).doc(docId),
      {
        ...tool,
        order: i,
        updatedAt: now,
        updatedBy: actor,
      },
    );
  }

  for (const doc of existingSubscriptionDocs.docs) {
    batch.delete(doc.ref);
  }
  for (let i = 0; i < payload.therapistSubscriptions.length; i += 1) {
    const item = normalizeTherapistSubscriptionInput(
      payload.therapistSubscriptions[i]!,
    );
    const docId = sanitizeDocId(
      `${String(i + 1).padStart(3, "0")}__${item.name}`,
      `subscription_${String(i + 1).padStart(3, "0")}`,
    );
    batch.set(
      db.collection(CONTENT_THERAPIST_SUBSCRIPTIONS_COLLECTION).doc(docId),
      {
        ...item,
        order: i,
        updatedAt: now,
        updatedBy: actor,
      },
    );
  }

  batch.set(
    db.collection(CONTENT_LEGAL_COLLECTION).doc("terms"),
    {
      title: safeString(payload.legalContent.termsTitle),
      body: safeString(payload.legalContent.termsBody),
      updatedAt: now,
      updatedBy: actor,
    },
    { merge: true },
  );
  batch.set(
    db.collection(CONTENT_LEGAL_COLLECTION).doc("privacy"),
    {
      title: safeString(payload.legalContent.privacyTitle),
      body: safeString(payload.legalContent.privacyBody),
      updatedAt: now,
      updatedBy: actor,
    },
    { merge: true },
  );

  // Remove legacy content fields from ai_routing to keep data separated by collection.
  batch.set(
    db.doc(AI_ROUTING_DOC_PATH),
    {
      tools: FieldValue.delete(),
      therapistSubscriptions: FieldValue.delete(),
      legalContent: FieldValue.delete(),
      updatedAt: now,
      updatedBy: actor,
    },
    { merge: true },
  );

  await batch.commit();
}
