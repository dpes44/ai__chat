import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { logAudit } from "@/lib/audit";
import { verifyAdminCredentials } from "@/lib/auth";
import { assertCsrfToken } from "@/lib/csrf";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseClientIp } from "@/lib/security";
import { createAdminSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
    csrfToken?: string;
  };

  if (!assertCsrfToken(body.csrfToken)) {
    return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
  }

  const ip = parseClientIp(headers().get("x-forwarded-for"));
  const rate = checkRateLimit(`login:${ip}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Too many login attempts. Retry in ${Math.ceil(rate.retryAfterMs / 1000)}s.` },
      { status: 429 },
    );
  }

  const username = (body.username ?? "").trim();
  const password = (body.password ?? "").trim();
  if (!username || !password) {
    return NextResponse.json({ error: "username and password are required." }, { status: 400 });
  }

  const result = await verifyAdminCredentials({ username, password });
  if (!result.ok) {
    await logAudit({
      actor: username || "unknown",
      action: "ADMIN_LOGIN_FAILED",
      target: "admin_auth/root_admin",
      diffSummary: result.reason ?? "invalid",
    });

    return NextResponse.json({ error: result.reason === "locked" ? "Account locked." : "Invalid credentials." }, { status: 401 });
  }

  const token = await createAdminSession(username);

  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  await logAudit({
    actor: username,
    action: "ADMIN_LOGIN_SUCCESS",
    target: "admin_auth/root_admin",
    diffSummary: "Session issued",
  });

  return NextResponse.json({ ok: true });
}
