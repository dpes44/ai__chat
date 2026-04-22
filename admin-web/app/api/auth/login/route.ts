import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { assertCsrfToken } from "@/lib/csrf";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { adminLoginSchema } from "@/lib/server/contracts/auth";
import {
  invalidCsrfResponse,
  invalidPayloadResponse,
} from "@/lib/server/core/http";
import { withRouteError } from "@/lib/server/core/route";
import { loginAdmin } from "@/lib/server/domains/auth/service";

export async function POST(request: Request) {
  return withRouteError({
    handler: async () => {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const parsed = adminLoginSchema.safeParse(body);
      if (!parsed.success) {
        return invalidPayloadResponse("username and password are required.");
      }

      if (!assertCsrfToken(parsed.data.csrfToken)) {
        return invalidCsrfResponse();
      }

      const result = await loginAdmin({
        username: parsed.data.username,
        password: parsed.data.password,
        forwardedFor: headers().get("x-forwarded-for"),
      });

      cookies().set(SESSION_COOKIE_NAME, result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 8,
      });

      return NextResponse.json({ ok: true });
    },
  });
}
