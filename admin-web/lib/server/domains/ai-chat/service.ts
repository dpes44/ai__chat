import crypto from "node:crypto";

import { Timestamp } from "firebase-admin/firestore";

import {
  AI_REQUEST_LOGS_COLLECTION,
  AI_ROUTING_DOC_PATH,
  PROMPTS_DOC_PATH,
  USERS_ROUTER_DOC_PATH,
} from "@/lib/constants";
import {
  AiRoutingConfig,
  buildSystemPrompt,
  estimateCostUsd,
  normalizeRoutingConfig,
  parseGatewayRequest,
  PromptContextConfig,
  Provider,
  REQUEST_LOG_TTL_DAYS,
  toUserHash,
} from "@/lib/ai";
import { callAnthropic, callOpenAI, ProviderError } from "@/lib/ai-providers";
import { readAiPromptContextOverrides } from "@/lib/content-store";
import { auth, db } from "@/lib/firebase-admin";
import { getProviderApiKey } from "@/lib/provider-keys";
import { redactSensitiveText } from "@/lib/redaction";

function bearerToken(request: Request): string | null {
  const value = request.headers.get("authorization");
  if (!value || !value.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return value.slice(7).trim();
}

async function generateViaProvider(params: {
  provider: Provider;
  model: string;
  temperature: number;
  maxTokens: number;
  history: { role: "user" | "assistant"; content: string }[];
  userMessage: string;
  language: "english" | "nepali";
  userRegion?: string;
  systemPromptTemplate: string;
  promptContext: PromptContextConfig;
}) {
  const systemPrompt = buildSystemPrompt({
    language: params.language,
    userMessage: params.userMessage,
    userRegion: params.userRegion,
    systemPromptTemplate: params.systemPromptTemplate,
    promptContext: params.promptContext,
  });
  let apiKey = "";
  try {
    apiKey = await getProviderApiKey(params.provider);
  } catch (error) {
    throw new ProviderError(
      `Provider key unavailable for ${params.provider}.`,
      `${params.provider.toUpperCase()}_KEY_UNAVAILABLE`,
      undefined,
      error instanceof Error ? error.message : String(error),
    );
  }

  if (params.provider === "openai") {
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

export async function handleAiChatPost(request: Request): Promise<{
  status: number;
  body: Record<string, unknown>;
}> {
  const idToken = bearerToken(request);
  if (!idToken) {
    return { status: 401, body: { error: "Missing bearer token." } };
  }

  let uid = "";
  try {
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return { status: 401, body: { error: "Invalid auth token." } };
  }

  let payload;
  try {
    payload = parseGatewayRequest(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request payload.";
    return { status: 400, body: { error: message } };
  }

  const [routerSnap, promptsSnap, legacyRoutingSnap] = await Promise.all([
    db.doc(USERS_ROUTER_DOC_PATH).get(),
    db.doc(PROMPTS_DOC_PATH).get(),
    db.doc(AI_ROUTING_DOC_PATH).get(),
  ]);
  const legacyRoutingData = legacyRoutingSnap.exists
    ? (legacyRoutingSnap.data() as Partial<AiRoutingConfig>)
    : {};
  const routerData = routerSnap.exists
    ? (routerSnap.data() as Partial<AiRoutingConfig>)
    : {};
  const promptTemplateOverride = (promptsSnap.data()?.systemPromptTemplate ?? "").toString();
  const routing = normalizeRoutingConfig(
    {
      ...legacyRoutingData,
      ...routerData,
      ...(promptTemplateOverride
        ? { systemPromptTemplate: promptTemplateOverride }
        : {}),
    },
  );
  const promptContextOverrides = await readAiPromptContextOverrides({
    legacyPromptContext: routing.promptContext,
  });
  const promptContext: PromptContextConfig = {
    ...routing.promptContext,
    ...promptContextOverrides,
  };

  if (!routing.enabled) {
    return {
      status: 503,
      body: { error: "AI service is currently disabled.", errorCode: "AI_DISABLED" },
    };
  }

  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const createdAt = Timestamp.now();
  const expireAt = Timestamp.fromDate(
    new Date(Date.now() + REQUEST_LOG_TTL_DAYS * 24 * 60 * 60 * 1000),
  );
  const userIdHash = toUserHash(uid);

  let providerUsed: Provider = routing.activeProvider;
  let modelUsed = routing.activeModel;
  let fallbackUsed = false;
  let tokenIn = 0;
  let tokenOut = 0;
  let estimatedCostUsd = 0;
  let primaryErrorCode = "";
  let errorCode = "";
  let errorSnippetRedacted = "";
  let status: "success" | "failed" = "success";

  try {
    const reply = await generateViaProvider({
      provider: routing.activeProvider,
      model: routing.activeModel,
      temperature: routing.temperature,
      maxTokens: routing.maxTokens,
      history: payload.history,
      userMessage: payload.message,
      language: payload.language,
      userRegion: payload.userRegion,
      systemPromptTemplate: routing.systemPromptTemplate,
      promptContext,
    });

    tokenIn = reply.tokenIn;
    tokenOut = reply.tokenOut;
    estimatedCostUsd = estimateCostUsd(routing.activeModel, tokenIn, tokenOut);

    if (!reply.text) {
      throw new ProviderError("Empty response from active provider.", "EMPTY_ACTIVE_RESPONSE");
    }

    const latencyMs = Date.now() - startedAt;

    await db.collection(AI_REQUEST_LOGS_COLLECTION).doc(requestId).set({
      requestId,
      createdAt,
      expireAt,
      userIdHash,
      provider: providerUsed,
      model: modelUsed,
      fallbackUsed,
      status,
      latencyMs,
      promptChars: payload.message.length,
      responseChars: reply.text.length,
      tokenIn,
      tokenOut,
      estimatedCostUsd,
      errorCode,
      errorSnippetRedacted,
    });

    return {
      status: 200,
      body: {
        reply: reply.text,
        providerUsed,
        modelUsed,
        fallbackUsed,
        requestId,
        latencyMs,
      },
    };
  } catch (primaryError) {
    primaryErrorCode =
      primaryError instanceof ProviderError ? primaryError.code : "PRIMARY_UNKNOWN_ERROR";

    const canFallback =
      routing.fallbackProvider &&
      routing.fallbackModel &&
      (routing.fallbackProvider !== routing.activeProvider ||
        routing.fallbackModel !== routing.activeModel);

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
          userRegion: payload.userRegion,
          systemPromptTemplate: routing.systemPromptTemplate,
          promptContext,
        });

        providerUsed = routing.fallbackProvider;
        modelUsed = routing.fallbackModel;
        fallbackUsed = true;
        tokenIn = fallbackReply.tokenIn;
        tokenOut = fallbackReply.tokenOut;
        estimatedCostUsd = estimateCostUsd(modelUsed, tokenIn, tokenOut);

        const latencyMs = Date.now() - startedAt;

        await db.collection(AI_REQUEST_LOGS_COLLECTION).doc(requestId).set({
          requestId,
          createdAt,
          expireAt,
          userIdHash,
          provider: providerUsed,
          model: modelUsed,
          fallbackUsed,
          status: "success",
          latencyMs,
          promptChars: payload.message.length,
          responseChars: fallbackReply.text.length,
          tokenIn,
          tokenOut,
          estimatedCostUsd,
          errorCode: primaryErrorCode || "PRIMARY_ERROR",
          errorSnippetRedacted:
            primaryError instanceof ProviderError
              ? redactSensitiveText(primaryError.details ?? primaryError.message)
              : redactSensitiveText(String(primaryError)),
        });

        return {
          status: 200,
          body: {
            reply: fallbackReply.text,
            providerUsed,
            modelUsed,
            fallbackUsed,
            requestId,
            latencyMs,
          },
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
  }

  const latencyMs = Date.now() - startedAt;
  await db.collection(AI_REQUEST_LOGS_COLLECTION).doc(requestId).set({
    requestId,
    createdAt,
    expireAt,
    userIdHash,
    provider: providerUsed,
    model: modelUsed,
    fallbackUsed,
    status,
    latencyMs,
    promptChars: payload.message.length,
    responseChars: 0,
    tokenIn,
    tokenOut,
    estimatedCostUsd,
    errorCode,
    errorSnippetRedacted,
  });

  console.error("POST /api/ai/chat failed", {
    requestId,
    errorCode,
    providerUsed,
    modelUsed,
    fallbackUsed,
    primaryErrorCode,
  });

  return {
    status: 503,
    body: {
      error: "AI service is temporarily unavailable.",
      requestId,
      errorCode,
      primaryErrorCode,
      providerUsed,
      modelUsed,
      fallbackUsed,
    },
  };
}
