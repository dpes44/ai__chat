import { AiRoutingConfig, normalizeRoutingConfig } from "@/lib/ai";
import {
  AI_ROUTING_DOC_PATH,
  USERS_ROUTER_DOC_PATH,
} from "@/lib/constants";
import { RouterUpdatePayload } from "@/lib/server/contracts/router";
import {
  getMergedDocData,
  updateMirroredDocConfig,
} from "../config/mirrored-doc-config";

export async function getRouterConfig(): Promise<AiRoutingConfig> {
  const merged = await getMergedDocData([
    AI_ROUTING_DOC_PATH,
    USERS_ROUTER_DOC_PATH,
  ]);
  return normalizeRoutingConfig(merged as Partial<AiRoutingConfig>);
}

export async function updateRouterConfig(params: {
  actor: string;
  payload: Omit<RouterUpdatePayload, "csrfToken">;
}): Promise<void> {
  const nextConfig = {
    activeProvider: params.payload.activeProvider,
    activeModel: params.payload.activeModel,
    fallbackProvider: params.payload.fallbackProvider,
    fallbackModel: params.payload.fallbackModel,
    temperature: params.payload.temperature,
    maxTokens: params.payload.maxTokens,
    enabled: params.payload.enabled,
  };

  await updateMirroredDocConfig({
    actor: params.actor,
    auditAction: "AI_ROUTING_UPDATED",
    auditTarget: USERS_ROUTER_DOC_PATH,
    beforePath: USERS_ROUTER_DOC_PATH,
    writePaths: [USERS_ROUTER_DOC_PATH, AI_ROUTING_DOC_PATH],
    nextConfig,
  });
}
