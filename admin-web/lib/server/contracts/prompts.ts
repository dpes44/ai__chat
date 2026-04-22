import { z } from "zod";

export const promptsUpdateSchema = z.object({
  csrfToken: z.string().min(1),
  systemPromptTemplate: z.string().min(1).max(20000),
});

export type PromptsUpdatePayload = z.infer<typeof promptsUpdateSchema>;
