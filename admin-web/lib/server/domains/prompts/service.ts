import { FieldValue } from "firebase-admin/firestore";

import { logAudit } from "@/lib/audit";
import { AiRoutingConfig, normalizeRoutingConfig } from "@/lib/ai";
import {
  AI_ROUTING_DOC_PATH,
  PROMPTS_DOC_PATH,
} from "@/lib/constants";
import { db } from "@/lib/firebase-admin";

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
  const beforeSnap = await db.doc(PROMPTS_DOC_PATH).get();
  const before = beforeSnap.exists ? beforeSnap.data() : {};
  const nextConfig = {
    systemPromptTemplate: params.systemPromptTemplate,
  };

  const patch = {
    ...nextConfig,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: params.actor,
  };
  await Promise.all([
    db.doc(PROMPTS_DOC_PATH).set(patch, { merge: true }),
    db.doc(AI_ROUTING_DOC_PATH).set(patch, { merge: true }),
  ]);

  await logAudit({
    actor: params.actor,
    action: "AI_PROMPTS_UPDATED",
    target: PROMPTS_DOC_PATH,
    diffSummary: JSON.stringify({ before, after: nextConfig }).slice(0, 900),
  });
}
