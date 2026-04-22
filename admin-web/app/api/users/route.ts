import { NextResponse } from "next/server";

import { assertCsrfToken } from "@/lib/csrf";
import {
  invalidCsrfResponse,
  invalidPayloadResponse,
} from "@/lib/server/core/http";
import { logAdminApiFailure } from "@/lib/server/core/observability";
import { withAdminSessionRoute } from "@/lib/server/core/route";
import { usersPostSchema } from "@/lib/server/contracts/users";
import {
  deleteAdminUser,
  listAdminUsers,
  setUserBanStatus,
  UsersListScope,
} from "@/lib/server/domains/users/service";

export const runtime = "nodejs";

function normalizeScope(value: string | null): UsersListScope {
  if (value === "allAuth" || value === "withProfile" || value === "withoutProfile") {
    return value;
  }
  return "withProfile";
}

export async function GET(request: Request) {
  return withAdminSessionRoute({
    onError: async (error, session) => {
      await logAdminApiFailure({
        actor: session.sub,
        action: "ADMIN_USERS_API_FAILED",
        target: "GET /api/users",
        error,
      });
    },
    handler: async () => {
      const scope = normalizeScope(new URL(request.url).searchParams.get("scope"));
      const data = await listAdminUsers(scope);
      return NextResponse.json({ data });
    },
  });
}

export async function POST(request: Request) {
  return withAdminSessionRoute({
    onError: async (error, session) => {
      await logAdminApiFailure({
        actor: session.sub,
        action: "ADMIN_USERS_API_FAILED",
        target: "POST /api/users",
        error,
      });
    },
    handler: async (session) => {
      const body = await request.json().catch(() => ({}));
      const parsed = usersPostSchema.safeParse(body);
      if (!parsed.success) {
        return invalidPayloadResponse();
      }

      if (!assertCsrfToken(parsed.data.csrfToken)) {
        return invalidCsrfResponse();
      }

      if (parsed.data.action === "setBanStatus") {
        const result = await setUserBanStatus({
          actor: session.sub,
          uid: parsed.data.uid.trim(),
          banned: parsed.data.banned,
          reason: (parsed.data.reason ?? "").trim(),
        });
        return NextResponse.json({ ok: true, ...result });
      }

      const result = await deleteAdminUser({
        actor: session.sub,
        uid: parsed.data.uid.trim(),
      });
      return NextResponse.json({ ok: true, data: result });
    },
  });
}
