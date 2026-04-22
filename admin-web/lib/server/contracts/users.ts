import { z } from "zod";

export const setBanSchema = z.object({
  csrfToken: z.string().min(1),
  action: z.literal("setBanStatus"),
  uid: z.string().min(1).max(128),
  banned: z.boolean(),
  reason: z.string().max(300).optional(),
});

export const deleteUserSchema = z.object({
  csrfToken: z.string().min(1),
  action: z.literal("deleteUser"),
  uid: z.string().min(1).max(128),
});

export const usersPostSchema = z.union([setBanSchema, deleteUserSchema]);

export type UsersPostPayload = z.infer<typeof usersPostSchema>;
export type SetBanPayload = z.infer<typeof setBanSchema>;
export type DeleteUserPayload = z.infer<typeof deleteUserSchema>;
