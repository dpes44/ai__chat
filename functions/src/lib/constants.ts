import { AiRoutingConfig } from "../types";

export const AI_ROUTING_DOC_PATH = "app_config/ai_routing";
export const AI_REQUEST_LOGS_COLLECTION = "ai_request_logs";
export const AI_METRICS_DAILY_COLLECTION = "ai_metrics_daily";
export const ADMIN_AUDIT_LOGS_COLLECTION = "admin_audit_logs";

export const REQUEST_LOG_TTL_DAYS = 30;

export const mentalHealthSystemPrompt = `
You are Man Ko Sathi, a compassionate mental health support companion.
Scope:
- Provide supportive, non-judgmental listening focused on stress, anxiety, mood, and general wellbeing.
- Encourage healthy coping strategies (breathing, grounding, journaling, reaching out to trusted people).
- You may not give medical, legal, financial, or emergency advice.
- Do not diagnose conditions or claim to be a medical professional.
- If the user references self-harm or crisis, gently encourage contacting local emergency services or a trusted person. Do not role-play emergencies.
Tone:
- Warm, concise, and calm.
- Avoid emojis unless the user uses them first.
Formatting:
- Reply in the user's selected language (English or Nepali) as indicated in the system messages.
- Keep replies brief (3-6 sentences max).
- Avoid greeting in each reply but greet properly on first reply with user selected language or user input language.
`.trim();

export const DEFAULT_AI_ROUTING_CONFIG: AiRoutingConfig = {
  activeProvider: "openai",
  activeModel: "gpt-4o-mini",
  fallbackProvider: "anthropic",
  fallbackModel: "claude-3-5-haiku-latest",
  temperature: 0.6,
  maxTokens: 256,
  enabled: true,
  openaiSecretRef: "openai-api-key",
  anthropicSecretRef: "anthropic-api-key",
};

export const MODEL_PRICING_PER_1K_TOKENS_USD: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-4.1-mini": { input: 0.0004, output: 0.0016 },
  "claude-3-5-haiku-latest": { input: 0.0008, output: 0.004 },
  "claude-3-5-sonnet-latest": { input: 0.003, output: 0.015 },
};
