import {
  AI_ROUTING_DOC_PATH,
  PROMPTS_DOC_PATH,
  USERS_ROUTER_DOC_PATH,
} from "@/lib/constants";
import {
  AiRoutingConfig,
  normalizeRoutingConfig,
  PromptContextConfig,
} from "@/lib/ai";
import { readAiPromptContextOverrides } from "@/lib/content-store";
import { db } from "@/lib/firebase-admin";
import { getMergedDocData } from "../config/mirrored-doc-config";

export async function loadAiRoutingAndPromptContext(): Promise<{
  routing: AiRoutingConfig;
  promptContext: PromptContextConfig;
}> {
  const [routingData, promptsSnap] = await Promise.all([
    getMergedDocData([AI_ROUTING_DOC_PATH, USERS_ROUTER_DOC_PATH]),
    db.doc(PROMPTS_DOC_PATH).get(),
  ]);
  const promptTemplateOverride = (promptsSnap.data()?.systemPromptTemplate ?? "").toString();

  const routing = normalizeRoutingConfig(
    {
      ...(routingData as Partial<AiRoutingConfig>),
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

  return { routing, promptContext };
}
