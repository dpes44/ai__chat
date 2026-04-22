import { NextResponse } from "next/server";

import { ADMIN_API_FAILURE_ACTIONS } from "@/lib/server/core/admin-api-failure-actions";
import { parseJsonBodyWithCsrf } from "@/lib/server/core/request";
import { withAdminAuditedRoute } from "@/lib/server/core/route";
import { rotateProviderKeySchema } from "@/lib/server/contracts/keys";
import {
  listProviderKeyStatuses,
  rotateProviderKey,
} from "@/lib/server/domains/keys/service";

export async function POST(request: Request) {
  return withAdminAuditedRoute({
    failureAction: ADMIN_API_FAILURE_ACTIONS.keys,
    failureTarget: "POST /api/keys/rotate",
    handler: async (session) => {
      const parsed = await parseJsonBodyWithCsrf({
        request,
        schema: rotateProviderKeySchema,
      });
      if ("response" in parsed) {
        return parsed.response;
      }

      const result = await rotateProviderKey({
        actor: session.sub,
        provider: parsed.data.provider,
        newApiKey: parsed.data.newApiKey,
      });

      return NextResponse.json({
        ok: true,
        version: result.version,
      });
    },
  });
}

export async function GET() {
  return withAdminAuditedRoute({
    failureAction: ADMIN_API_FAILURE_ACTIONS.keys,
    failureTarget: "GET /api/keys/rotate",
    handler: async () => {
      const data = await listProviderKeyStatuses();
      return NextResponse.json({ data });
    },
  });
}
