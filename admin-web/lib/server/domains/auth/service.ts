import { logAudit } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseClientIp } from "@/lib/security";
import { createAdminSession } from "@/lib/session";
import { verifyAdminCredentials } from "@/lib/auth";
import { HttpError } from "@/lib/server/core/errors";

export async function loginAdmin(params: {
  username: string;
  password: string;
  forwardedFor: string | null;
}): Promise<{ token: string }> {
  const username = params.username.trim();
  const password = params.password.trim();
  if (!username || !password) {
    throw new HttpError("username and password are required.", 400);
  }

  const ip = parseClientIp(params.forwardedFor);
  const rate = checkRateLimit(`login:${ip}`);
  if (!rate.allowed) {
    throw new HttpError(
      `Too many login attempts. Retry in ${Math.ceil(rate.retryAfterMs / 1000)}s.`,
      429,
      "RATE_LIMITED",
    );
  }

  const result = await verifyAdminCredentials({ username, password });
  if (!result.ok) {
    await logAudit({
      actor: username || "unknown",
      action: "ADMIN_LOGIN_FAILED",
      target: "admin_auth/root_admin",
      diffSummary: result.reason ?? "invalid",
    });

    throw new HttpError(
      result.reason === "locked" ? "Account locked." : "Invalid credentials.",
      401,
      result.reason === "locked" ? "LOCKED" : "INVALID_CREDENTIALS",
    );
  }

  const token = await createAdminSession(username);

  await logAudit({
    actor: username,
    action: "ADMIN_LOGIN_SUCCESS",
    target: "admin_auth/root_admin",
    diffSummary: "Session issued",
  });

  return { token };
}
