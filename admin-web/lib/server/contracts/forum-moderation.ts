import { z } from "zod";

export const forumModerationUpdateSchema = z.object({
  csrfToken: z.string().min(1),
  kind: z.enum(["thread", "reply"]),
  threadId: z.string().min(1).max(160),
  replyId: z.string().max(160).optional(),
  isFlagged: z.boolean(),
  isHidden: z.boolean(),
  moderationNote: z.string().max(500).default(""),
});

export type ForumModerationUpdatePayload = z.infer<
  typeof forumModerationUpdateSchema
>;
