import crypto from "node:crypto";

import { Timestamp } from "firebase-admin/firestore";

import { AI_REQUEST_LOGS_COLLECTION } from "@/lib/constants";
import {
  Provider,
  REQUEST_LOG_TTL_DAYS,
  toUserHash,
} from "@/lib/ai";
import { db } from "@/lib/firebase-admin";

type AiRequestLogMeta = {
  requestId: string;
  startedAt: number;
  createdAt: Timestamp;
  expireAt: Timestamp;
  userIdHash: string;
};

export function createAiRequestLogMeta(uid: string): AiRequestLogMeta {
  return {
    requestId: crypto.randomUUID(),
    startedAt: Date.now(),
    createdAt: Timestamp.now(),
    expireAt: Timestamp.fromDate(
      new Date(Date.now() + REQUEST_LOG_TTL_DAYS * 24 * 60 * 60 * 1000),
    ),
    userIdHash: toUserHash(uid),
  };
}

export async function writeAiRequestLog(params: {
  meta: AiRequestLogMeta;
  providerUsed: Provider;
  modelUsed: string;
  fallbackUsed: boolean;
  status: "success" | "failed";
  promptChars: number;
  responseChars: number;
  tokenIn: number;
  tokenOut: number;
  estimatedCostUsd: number;
  errorCode: string;
  errorSnippetRedacted: string;
}): Promise<{ latencyMs: number }> {
  const latencyMs = Date.now() - params.meta.startedAt;

  await db.collection(AI_REQUEST_LOGS_COLLECTION).doc(params.meta.requestId).set({
    requestId: params.meta.requestId,
    createdAt: params.meta.createdAt,
    expireAt: params.meta.expireAt,
    userIdHash: params.meta.userIdHash,
    provider: params.providerUsed,
    model: params.modelUsed,
    fallbackUsed: params.fallbackUsed,
    status: params.status,
    latencyMs,
    promptChars: params.promptChars,
    responseChars: params.responseChars,
    tokenIn: params.tokenIn,
    tokenOut: params.tokenOut,
    estimatedCostUsd: params.estimatedCostUsd,
    errorCode: params.errorCode,
    errorSnippetRedacted: params.errorSnippetRedacted,
  });

  return { latencyMs };
}
