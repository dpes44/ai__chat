import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/session";
import { normalizeHttpError } from "./errors";

export type AdminApiSession = NonNullable<
  Awaited<ReturnType<typeof getAdminSession>>
>;

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export function invalidPayloadResponse(message = "Invalid payload."): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function invalidCsrfResponse(): NextResponse {
  return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
}

export function errorResponse(
  error: unknown,
  fallbackMessage = "Internal server error.",
): NextResponse {
  const normalized = normalizeHttpError(error, fallbackMessage);
  return NextResponse.json({ error: normalized.message }, { status: normalized.status });
}

export async function requireAdminSessionApi(): Promise<
  { session: AdminApiSession } | { response: NextResponse }
> {
  const session = await getAdminSession();
  if (!session) {
    return { response: unauthorizedResponse() };
  }

  return { session };
}
