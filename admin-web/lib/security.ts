import crypto from "node:crypto";

export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

export function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex");
}

export function parseClientIp(forwardedFor: string | null): string {
  if (!forwardedFor) {
    return "unknown";
  }

  const first = forwardedFor.split(",")[0]?.trim();
  return first || "unknown";
}
