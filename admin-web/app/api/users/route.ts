import { NextResponse } from "next/server";

import { ADMIN_API_FAILURE_ACTIONS } from "@/lib/server/core/admin-api-failure-actions";
import { parseJsonBodyWithCsrf } from "@/lib/server/core/request";
import { withAdminAuditedRoute } from "@/lib/server/core/route";
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
  return withAdminAuditedRoute({
    failureAction: ADMIN_API_FAILURE_ACTIONS.users,
    failureTarget: "GET /api/users",
    handler: async () => {
      const scope = normalizeScope(new URL(request.url).searchParams.get("scope"));
      const data = await listAdminUsers(scope);
      return NextResponse.json({ data });
    },
  });
}

export async function POST(request: Request) {
  return withAdminAuditedRoute({
    failureAction: ADMIN_API_FAILURE_ACTIONS.users,
    failureTarget: "POST /api/users",
    handler: async (session) => {
      const parsed = await parseJsonBodyWithCsrf({
        request,
        schema: usersPostSchema,
      });
      if ("response" in parsed) {
        return parsed.response;
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
