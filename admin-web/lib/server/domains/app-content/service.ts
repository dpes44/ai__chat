import { readContentSettings } from "@/lib/content-store";

export async function getPublicAppContent() {
  const content = await readContentSettings({ includeLegacyFallback: true });
  return {
    promptContext: content.promptContext,
    tools: content.tools,
    therapistSubscriptions: content.therapistSubscriptions,
    legalContent: content.legalContent,
  };
}
