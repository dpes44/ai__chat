import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { CSRF_COOKIE_NAME } from "@/lib/constants";
import { resolveCsrfToken } from "@/lib/server/domains/csrf/service";

export async function GET() {
  const existing = cookies().get(CSRF_COOKIE_NAME)?.value;
  const resolved = resolveCsrfToken(existing);

  if (resolved.isNew) {
    cookies().set(CSRF_COOKIE_NAME, resolved.token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
  }

  return NextResponse.json(
    { token: resolved.token },
    { headers: { "Cache-Control": "no-store" } },
  );
}
