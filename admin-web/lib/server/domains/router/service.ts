import { FieldValue } from "firebase-admin/firestore";

import { logAudit } from "@/lib/audit";
import { AiRoutingConfig, normalizeRoutingConfig } from "@/lib/ai";
import {
  AI_ROUTING_DOC_PATH,
  USERS_ROUTER_DOC_PATH,
} from "@/lib/constants";
import { db } from "@/lib/firebase-admin";
import { RouterUpdatePayload } from "@/lib/server/contracts/router";

export async function getRouterConfig(): Promise<AiRoutingConfig> {
  const [routerSnap, legacyRoutingSnap] = await Promise.all([
    db.doc(USERS_ROUTER_DOC_PATH).get(),
    db.doc(AI_ROUTING_DOC_PATH).get(),
  ]);
  const merged = {
    ...(legacyRoutingSnap.exists ? legacyRoutingSnap.data() : {}),
    ...(routerSnap.exists ? routerSnap.data() : {}),
  };
  return normalizeRoutingConfig(
    merged as Partial<AiRoutingConfig>,
  );
}

export async function updateRouterConfig(params: {
  actor: string;
  payload: Omit<RouterUpdatePayload, "csrfToken">;
}): Promise<void> {
  const beforeSnap = await db.doc(USERS_ROUTER_DOC_PATH).get();
  const before = beforeSnap.exists ? beforeSnap.data() : {};
  const nextConfig = {
    activeProvider: params.payload.activeProvider,
    activeModel: params.payload.activeModel,
    fallbackProvider: params.payload.fallbackProvider,
    fallbackModel: params.payload.fallbackModel,
    temperature: params.payload.temperature,
    maxTokens: params.payload.maxTokens,
    enabled: params.payload.enabled,
  };

  const patch = {
    ...nextConfig,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: params.actor,
  };
  await Promise.all([
    db.doc(USERS_ROUTER_DOC_PATH).set(patch, { merge: true }),
    db.doc(AI_ROUTING_DOC_PATH).set(patch, { merge: true }),
  ]);

  await logAudit({
    actor: params.actor,
    action: "AI_ROUTING_UPDATED",
    target: USERS_ROUTER_DOC_PATH,
    diffSummary: JSON.stringify({ before, after: nextConfig }).slice(0, 900),
  });
}
