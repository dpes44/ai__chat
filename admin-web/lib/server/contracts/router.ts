import { z } from "zod";

export const providerSchema = z.enum(["openai", "anthropic"]);

export const routerUpdateSchema = z.object({
  csrfToken: z.string().min(1),
  activeProvider: providerSchema,
  activeModel: z.string().min(1).max(120),
  fallbackProvider: providerSchema,
  fallbackModel: z.string().min(1).max(120),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().min(1).max(4096),
  enabled: z.boolean(),
});

export type RouterUpdatePayload = z.infer<typeof routerUpdateSchema>;
