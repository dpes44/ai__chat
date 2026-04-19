import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { CSRF_COOKIE_NAME } from "@/lib/constants";
import { generateSecureToken } from "@/lib/security";

export async function GET() {
  const existing = cookies().get(CSRF_COOKIE_NAME)?.value;
  if (existing) {
    return NextResponse.json(
      { token: existing },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const token = generateSecureToken(24);

  cookies().set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return NextResponse.json(
    { token },
    { headers: { "Cache-Control": "no-store" } },
  );
}
