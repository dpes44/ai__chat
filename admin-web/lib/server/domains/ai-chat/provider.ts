import {
  buildSystemPrompt,
  PromptContextConfig,
  Provider,
} from "@/lib/ai";
import { callAnthropic, callOpenAI, ProviderError } from "@/lib/ai-providers";
import { getProviderApiKey } from "@/lib/provider-keys";

export async function generateViaProvider(params: {
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
