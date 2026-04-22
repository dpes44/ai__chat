import { z } from "zod";

export const rotateProviderKeySchema = z.object({
  csrfToken: z.string().min(1),
  provider: z.enum(["openai", "anthropic"]),
  newApiKey: z.string().min(16),
});

export type RotateProviderKeyPayload = z.infer<typeof rotateProviderKeySchema>;
