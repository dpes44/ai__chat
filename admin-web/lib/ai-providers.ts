import { ChatHistoryMessage } from "./ai";

export interface ProviderReply {
  text: string;
  tokenIn: number;
  tokenOut: number;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
    public readonly details?: string,
  ) {
    super(message);
  }
}

function normalizeHistory(history: ChatHistoryMessage[]): ChatHistoryMessage[] {
  return history
    .filter((msg) => msg.role === "user" || msg.role === "assistant")
    .map((msg) => ({
      role: msg.role,
      content: msg.content.slice(0, 4000),
    }))
    .slice(-20);
}

export async function callOpenAI(params: {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  history: ChatHistoryMessage[];
  userMessage: string;
}): Promise<ProviderReply> {
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: params.systemPrompt },
    ...normalizeHistory(params.history),
    { role: "user", content: params.userMessage },
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new ProviderError("OpenAI request failed.", "OPENAI_HTTP_ERROR", response.status, raw);
  }

  const decoded = JSON.parse(raw) as {
    choices?: Array<{ message?: { content?: string | null } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const content = decoded.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new ProviderError("OpenAI returned empty content.", "OPENAI_EMPTY_CONTENT", 200, raw);
  }

  return {
    text: content,
    tokenIn: decoded.usage?.prompt_tokens ?? 0,
    tokenOut: decoded.usage?.completion_tokens ?? 0,
  };
}

export async function callAnthropic(params: {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  history: ChatHistoryMessage[];
  userMessage: string;
}): Promise<ProviderReply> {
  const messages = [
    ...normalizeHistory(params.history),
    { role: "user" as const, content: params.userMessage },
  ];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": params.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      system: params.systemPrompt,
      messages,
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new ProviderError("Anthropic request failed.", "ANTHROPIC_HTTP_ERROR", response.status, raw);
  }

  const decoded = JSON.parse(raw) as {
    content?: Array<{ type?: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  const content = decoded.content?.find((item) => item.type === "text")?.text?.trim();
  if (!content) {
    throw new ProviderError("Anthropic returned empty content.", "ANTHROPIC_EMPTY_CONTENT", 200, raw);
  }

  return {
    text: content,
    tokenIn: decoded.usage?.input_tokens ?? 0,
    tokenOut: decoded.usage?.output_tokens ?? 0,
  };
}
