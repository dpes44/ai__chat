import {
  estimateCostUsd,
  parseGatewayRequest,
  Provider,
} from "@/lib/ai";
import { ProviderError } from "@/lib/ai-providers";
import { redactSensitiveText } from "@/lib/redaction";
import { authenticateBearerUid } from "./auth";
import { generateViaProvider } from "./provider";
import { createAiRequestLogMeta, writeAiRequestLog } from "./request-log";
import { loadAiRoutingAndPromptContext } from "./routing";

export async function handleAiChatPost(request: Request): Promise<{
  status: number;
  body: Record<string, unknown>;
}> {
  const authResult = await authenticateBearerUid(request);
  if (!("uid" in authResult)) {
    return authResult;
  }
  const uid = authResult.uid;

  let payload;
  try {
    payload = parseGatewayRequest(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request payload.";
    return { status: 400, body: { error: message } };
  }

  const { routing, promptContext } = await loadAiRoutingAndPromptContext();
  if (!routing.enabled) {
    return {
      status: 503,
      body: { error: "AI service is currently disabled.", errorCode: "AI_DISABLED" },
    };
  }

  const logMeta = createAiRequestLogMeta(uid);
  const promptChars = payload.message.length;

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

    const { latencyMs } = await writeAiRequestLog({
      meta: logMeta,
      providerUsed,
      modelUsed,
      fallbackUsed,
      status,
      promptChars,
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
        requestId: logMeta.requestId,
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

        const { latencyMs } = await writeAiRequestLog({
          meta: logMeta,
          providerUsed,
          modelUsed,
          fallbackUsed,
          status: "success",
          promptChars,
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
            requestId: logMeta.requestId,
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

  await writeAiRequestLog({
    meta: logMeta,
    providerUsed,
    modelUsed,
    fallbackUsed,
    status,
    promptChars,
    responseChars: 0,
    tokenIn,
    tokenOut,
    estimatedCostUsd,
    errorCode,
    errorSnippetRedacted,
  });

  console.error("POST /api/ai/chat failed", {
    requestId: logMeta.requestId,
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
      requestId: logMeta.requestId,
      errorCode,
      primaryErrorCode,
      providerUsed,
      modelUsed,
      fallbackUsed,
    },
  };
}
