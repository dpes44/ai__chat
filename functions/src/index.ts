import crypto from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

import {
  AI_METRICS_DAILY_COLLECTION,
  MOOD_LOGS_SUBCOLLECTION,
  MOOD_METRICS_DAILY_COLLECTION,
  AI_REQUEST_LOGS_COLLECTION,
  AI_ROUTING_DOC_PATH,
  DEFAULT_AI_ROUTING_CONFIG,
  REQUEST_LOG_TTL_DAYS,
  mentalHealthSystemPrompt,
} from "./lib/constants";
import { estimateCostUsd, percentile95 } from "./lib/metrics";
import { callAnthropic, callOpenAI, ProviderError } from "./lib/providers";
import { redactSensitiveText } from "./lib/redaction";
import { getSecretValue } from "./lib/secrets";
import {
  AiRoutingConfig,
  AppLanguage,
  ChatHistoryMessage,
  GenerateMentalHealthReplyRequest,
  GenerateMentalHealthReplyResponse,
  Provider,
} from "./types";

initializeApp();
const db = getFirestore();

function languageInstruction(language: AppLanguage): string {
  return language === "nepali" ? "Respond only in Nepali." : "Respond only in English.";
}

function toUserHash(uid: string): string {
  const salt = process.env.USER_HASH_SALT ?? "man-ko-sathi";
  return crypto.createHash("sha256").update(`${salt}:${uid}`).digest("hex");
}

function normalizeRoutingConfig(input: Partial<AiRoutingConfig> | undefined): AiRoutingConfig {
  return {
    ...DEFAULT_AI_ROUTING_CONFIG,
    ...(input ?? {}),
  };
}

function normalizeMoodId(value: unknown): "great" | "good" | "okay" | "bad" | "terrible" {
  const mood = (value ?? "").toString().trim().toLowerCase();
  if (mood === "great" || mood === "good" || mood === "okay" || mood === "bad" || mood === "terrible") {
    return mood;
  }
  return "okay";
}

function scoreForMoodId(moodId: string): number {
  switch (moodId) {
    case "great":
      return 5;
    case "good":
      return 4;
    case "okay":
      return 3;
    case "bad":
      return 2;
    case "terrible":
      return 1;
    default:
      return 3;
  }
}

function normalizeMoodScore(data: Record<string, unknown>, moodId: string): number {
  const raw = Number(data.moodScore ?? 0);
  if (Number.isFinite(raw) && raw >= 1 && raw <= 5) {
    return raw;
  }
  return scoreForMoodId(moodId);
}

function parseRequest(input: unknown): GenerateMentalHealthReplyRequest {
  const data = (input ?? {}) as Partial<GenerateMentalHealthReplyRequest>;
  const message = (data.message ?? "").toString().trim();
  if (!message) {
    throw new HttpsError("invalid-argument", "message is required.");
  }

  const language = data.language === "nepali" ? "nepali" : "english";
  const historyRaw = Array.isArray(data.history) ? data.history : [];
  const history: ChatHistoryMessage[] = historyRaw
    .map((item): ChatHistoryMessage => {
      const role: ChatHistoryMessage["role"] = item?.role === "assistant" ? "assistant" : "user";
      return {
        role,
        content: (item?.content ?? "").toString().trim(),
      };
    })
    .filter((item) => item.content.length > 0)
    .slice(-20);

  return {
    message: message.slice(0, 4000),
    language,
    history,
  };
}

async function getRoutingConfig(): Promise<AiRoutingConfig> {
  const snap = await db.doc(AI_ROUTING_DOC_PATH).get();
  if (!snap.exists) {
    return DEFAULT_AI_ROUTING_CONFIG;
  }

  return normalizeRoutingConfig(snap.data() as Partial<AiRoutingConfig>);
}

async function generateViaProvider(params: {
  provider: Provider;
  model: string;
  temperature: number;
  maxTokens: number;
  history: ChatHistoryMessage[];
  userMessage: string;
  language: AppLanguage;
  openaiSecretRef: string;
  anthropicSecretRef: string;
}) {
  const systemPrompt = `${mentalHealthSystemPrompt}\n${languageInstruction(params.language)}`;

  if (params.provider === "openai") {
    const apiKey = await getSecretValue(params.openaiSecretRef);
    return callOpenAI({
      apiKey,
      model: params.model,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
      systemPrompt,
      history: params.history,
      userMessage: params.userMessage,
    });
  }

  const apiKey = await getSecretValue(params.anthropicSecretRef);
  return callAnthropic({
    apiKey,
    model: params.model,
    temperature: params.temperature,
    maxTokens: params.maxTokens,
    systemPrompt,
    history: params.history,
    userMessage: params.userMessage,
  });
}

export const generateMentalHealthReply = onCall(
  { region: "us-central1", memory: "256MiB", timeoutSeconds: 60 },
  async (request): Promise<GenerateMentalHealthReplyResponse> => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  const payload = parseRequest(request.data);
  const routing = await getRoutingConfig();
  if (!routing.enabled) {
    throw new HttpsError("failed-precondition", "AI service is currently disabled.");
  }

  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const createdAt = Timestamp.now();
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + REQUEST_LOG_TTL_DAYS * 24 * 60 * 60 * 1000));
  const userIdHash = toUserHash(request.auth.uid);

  let providerUsed = routing.activeProvider;
  let modelUsed = routing.activeModel;
  let fallbackUsed = false;
  let tokenIn = 0;
  let tokenOut = 0;
  let estimatedCostUsd = 0;
  let errorCode = "";
  let errorSnippetRedacted = "";
  let status: "success" | "failed" = "success";

  try {
    let reply = await generateViaProvider({
      provider: routing.activeProvider,
      model: routing.activeModel,
      temperature: routing.temperature,
      maxTokens: routing.maxTokens,
      history: payload.history,
      userMessage: payload.message,
      language: payload.language,
      openaiSecretRef: routing.openaiSecretRef,
      anthropicSecretRef: routing.anthropicSecretRef,
    });

    tokenIn = reply.tokenIn;
    tokenOut = reply.tokenOut;

    try {
      estimatedCostUsd = estimateCostUsd(routing.activeModel, tokenIn, tokenOut);
    } catch (err) {
      logger.warn("Cost estimation failed", err);
    }

    if (!reply.text && (routing.fallbackModel || routing.fallbackProvider)) {
      throw new ProviderError("Empty response from active provider", "EMPTY_ACTIVE_RESPONSE");
    }

    const elapsed = Date.now() - startedAt;

    await db.collection(AI_REQUEST_LOGS_COLLECTION).doc(requestId).set({
      requestId,
      createdAt,
      expireAt: expiresAt,
      userIdHash,
      provider: providerUsed,
      model: modelUsed,
      fallbackUsed,
      status,
      latencyMs: elapsed,
      promptChars: payload.message.length,
      responseChars: reply.text.length,
      tokenIn,
      tokenOut,
      estimatedCostUsd,
      errorCode,
      errorSnippetRedacted,
    });

    return {
      reply: reply.text,
      providerUsed,
      modelUsed,
      fallbackUsed,
      requestId,
      latencyMs: elapsed,
    };
  } catch (primaryError) {
    const primaryProvider = routing.activeProvider;
    const primaryModel = routing.activeModel;
    const canFallback =
      routing.fallbackModel &&
      routing.fallbackProvider &&
      (routing.fallbackProvider !== primaryProvider || routing.fallbackModel !== primaryModel);

    if (canFallback) {
      try {
        const fallbackReply = await generateViaProvider({
          provider: routing.fallbackProvider,
          model: routing.fallbackModel,
          temperature: routing.temperature,
          maxTokens: routing.maxTokens,
          history: payload.history,
          userMessage: payload.message,
          language: payload.language,
          openaiSecretRef: routing.openaiSecretRef,
          anthropicSecretRef: routing.anthropicSecretRef,
        });

        providerUsed = routing.fallbackProvider;
        modelUsed = routing.fallbackModel;
        fallbackUsed = true;
        tokenIn = fallbackReply.tokenIn;
        tokenOut = fallbackReply.tokenOut;
        estimatedCostUsd = estimateCostUsd(modelUsed, tokenIn, tokenOut);

        const elapsed = Date.now() - startedAt;

        await db.collection(AI_REQUEST_LOGS_COLLECTION).doc(requestId).set({
          requestId,
          createdAt,
          expireAt: expiresAt,
          userIdHash,
          provider: providerUsed,
          model: modelUsed,
          fallbackUsed,
          status: "success",
          latencyMs: elapsed,
          promptChars: payload.message.length,
          responseChars: fallbackReply.text.length,
          tokenIn,
          tokenOut,
          estimatedCostUsd,
          errorCode: primaryError instanceof ProviderError ? primaryError.code : "PRIMARY_ERROR",
          errorSnippetRedacted:
            primaryError instanceof ProviderError
              ? redactSensitiveText(primaryError.details ?? primaryError.message)
              : redactSensitiveText(String(primaryError)),
        });

        return {
          reply: fallbackReply.text,
          providerUsed,
          modelUsed,
          fallbackUsed,
          requestId,
          latencyMs: elapsed,
        };
      } catch (fallbackError) {
        status = "failed";
        errorCode = fallbackError instanceof ProviderError ? fallbackError.code : "FALLBACK_UNKNOWN_ERROR";
        errorSnippetRedacted = redactSensitiveText(
          fallbackError instanceof ProviderError
            ? fallbackError.details ?? fallbackError.message
            : String(fallbackError),
        );
      }
    } else {
      status = "failed";
      errorCode = primaryError instanceof ProviderError ? primaryError.code : "PRIMARY_UNKNOWN_ERROR";
      errorSnippetRedacted = redactSensitiveText(
        primaryError instanceof ProviderError
          ? primaryError.details ?? primaryError.message
          : String(primaryError),
      );
    }

    const elapsed = Date.now() - startedAt;

    await db.collection(AI_REQUEST_LOGS_COLLECTION).doc(requestId).set({
      requestId,
      createdAt,
      expireAt: expiresAt,
      userIdHash,
      provider: providerUsed,
      model: modelUsed,
      fallbackUsed,
      status,
      latencyMs: elapsed,
      promptChars: payload.message.length,
      responseChars: 0,
      tokenIn,
      tokenOut,
      estimatedCostUsd,
      errorCode,
      errorSnippetRedacted,
    });

    logger.error("AI reply generation failed", { requestId, errorCode, fallbackUsed });
    throw new HttpsError("unavailable", "AI service is temporarily unavailable.");
  }
  },
);

export const aggregateAiMetricsDaily = onSchedule(
  { region: "us-central1", schedule: "0 1 * * *", timeZone: "UTC" },
  async () => {
    const now = new Date();
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 1);

    const dateKey = start.toISOString().slice(0, 10);

    const snap = await db
      .collection(AI_REQUEST_LOGS_COLLECTION)
      .where("createdAt", ">=", Timestamp.fromDate(start))
      .where("createdAt", "<", Timestamp.fromDate(end))
      .get();

    const latencies: number[] = [];
    const dauSet = new Set<string>();
    let requests = 0;
    let errors = 0;
    let estimatedCostUsd = 0;

    for (const doc of snap.docs) {
      const data = doc.data();
      requests += 1;
      if (data.status !== "success") {
        errors += 1;
      }

      const latency = Number(data.latencyMs ?? 0);
      if (!Number.isNaN(latency)) {
        latencies.push(latency);
      }

      const userIdHash = (data.userIdHash ?? "").toString();
      if (userIdHash) {
        dauSet.add(userIdHash);
      }

      estimatedCostUsd += Number(data.estimatedCostUsd ?? 0);
    }

    const errorRate = requests > 0 ? Number((errors / requests).toFixed(4)) : 0;

    await db.collection(AI_METRICS_DAILY_COLLECTION).doc(dateKey).set({
      date: dateKey,
      requests,
      errors,
      errorRate,
      p95LatencyMs: percentile95(latencies),
      dau: dauSet.size,
      estimatedCostUsd: Number(estimatedCostUsd.toFixed(8)),
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info("Daily AI metrics aggregated", { dateKey, requests, errors });
  },
);

export const aggregateMoodMetricsDaily = onSchedule(
  { region: "us-central1", schedule: "20 1 * * *", timeZone: "UTC" },
  async () => {
    const now = new Date();
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const dateKeys: string[] = [];
    for (let dayOffset = 1; dayOffset <= 35; dayOffset += 1) {
      const date = new Date(end);
      date.setUTCDate(date.getUTCDate() - dayOffset);
      dateKeys.push(date.toISOString().slice(0, 10));
    }

    for (const dateKey of dateKeys) {
      const snap = await db
        .collectionGroup(MOOD_LOGS_SUBCOLLECTION)
        .where("dateKey", "==", dateKey)
        .get();

      const userSet = new Set<string>();
      const distribution = {
        great: 0,
        good: 0,
        okay: 0,
        bad: 0,
        terrible: 0,
      };

      let totalEntries = 0;
      let totalScore = 0;
      let withNotes = 0;

      for (const doc of snap.docs) {
        const data = doc.data() as Record<string, unknown>;
        const moodId = normalizeMoodId(data.moodId);
        const score = normalizeMoodScore(data, moodId);
        const uid = (data.uid ?? "").toString();
        const note = (data.note ?? "").toString().trim();

        totalEntries += 1;
        totalScore += score;
        distribution[moodId] += 1;
        if (note.length > 0) {
          withNotes += 1;
        }
        if (uid) {
          userSet.add(toUserHash(uid));
        }
      }

      const averageMoodScore =
        totalEntries > 0 ? Number((totalScore / totalEntries).toFixed(4)) : 0;

      await db.collection(MOOD_METRICS_DAILY_COLLECTION).doc(dateKey).set({
        date: dateKey,
        totalEntries,
        uniqueUsers: userSet.size,
        averageMoodScore,
        withNotes,
        distribution,
        updatedAt: FieldValue.serverTimestamp(),
      });

      logger.info("Daily mood metrics aggregated", {
        dateKey,
        totalEntries,
        uniqueUsers: userSet.size,
        averageMoodScore,
      });
    }
  },
);
