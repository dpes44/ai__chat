import { AiRoutingConfig, normalizeRoutingConfig } from "@/lib/ai";
import {
  AI_ROUTING_DOC_PATH,
  PROMPTS_DOC_PATH,
} from "@/lib/constants";
import { db } from "@/lib/firebase-admin";
import { updateMirroredDocConfig } from "../config/mirrored-doc-config";

export async function getSystemPromptTemplate(): Promise<string> {
  const [promptsSnap, legacyRoutingSnap] = await Promise.all([
    db.doc(PROMPTS_DOC_PATH).get(),
    db.doc(AI_ROUTING_DOC_PATH).get(),
  ]);
  const promptValue = (promptsSnap.data()?.systemPromptTemplate ?? "").toString();
  if (promptValue) {
    return promptValue;
  }

  return normalizeRoutingConfig(
    legacyRoutingSnap.exists
      ? (legacyRoutingSnap.data() as Partial<AiRoutingConfig>)
      : undefined,
  ).systemPromptTemplate;
}

export async function updateSystemPromptTemplate(params: {
  actor: string;
  systemPromptTemplate: string;
}): Promise<void> {
  const nextConfig = {
    systemPromptTemplate: params.systemPromptTemplate,
  };

  await updateMirroredDocConfig({
    actor: params.actor,
    auditAction: "AI_PROMPTS_UPDATED",
    auditTarget: PROMPTS_DOC_PATH,
    beforePath: PROMPTS_DOC_PATH,
    writePaths: [PROMPTS_DOC_PATH, AI_ROUTING_DOC_PATH],
    nextConfig,
  });
}
