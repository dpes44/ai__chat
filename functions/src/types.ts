export type Provider = "openai" | "anthropic";

export type AppLanguage = "english" | "nepali";

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateMentalHealthReplyRequest {
  message: string;
  history: ChatHistoryMessage[];
  language: AppLanguage;
}

export interface GenerateMentalHealthReplyResponse {
  reply: string;
  providerUsed: Provider;
  modelUsed: string;
  fallbackUsed: boolean;
  requestId: string;
  latencyMs: number;
}

export interface AiRoutingConfig {
  activeProvider: Provider;
  activeModel: string;
  fallbackProvider: Provider;
  fallbackModel: string;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
  updatedBy?: string;
  openaiSecretRef: string;
  anthropicSecretRef: string;
}

export interface ProviderReply {
  text: string;
  tokenIn: number;
  tokenOut: number;
}
