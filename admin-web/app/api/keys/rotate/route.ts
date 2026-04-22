import { NextResponse } from "next/server";

import { assertCsrfToken } from "@/lib/csrf";
import {
  invalidCsrfResponse,
  invalidPayloadResponse,
} from "@/lib/server/core/http";
import { ADMIN_API_FAILURE_ACTIONS } from "@/lib/server/core/admin-api-failure-actions";
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
      const body = await request.json();
      const parsed = rotateProviderKeySchema.safeParse(body);

      if (!parsed.success) {
        return invalidPayloadResponse();
      }

      if (!assertCsrfToken(parsed.data.csrfToken)) {
        return invalidCsrfResponse();
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
