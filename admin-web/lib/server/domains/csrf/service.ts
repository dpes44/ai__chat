import { generateSecureToken } from "@/lib/security";

export function resolveCsrfToken(existing: string | null | undefined): {
  token: string;
  isNew: boolean;
} {
  if (existing) {
    return { token: existing, isNew: false };
  }
  return { token: generateSecureToken(24), isNew: true };
}
