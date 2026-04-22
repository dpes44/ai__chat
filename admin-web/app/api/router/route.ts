import { NextResponse } from "next/server";

import { ADMIN_API_FAILURE_ACTIONS } from "@/lib/server/core/admin-api-failure-actions";
import { parseJsonBodyWithCsrf } from "@/lib/server/core/request";
import { withAdminAuditedRoute } from "@/lib/server/core/route";
import { routerUpdateSchema } from "@/lib/server/contracts/router";
import {
  getRouterConfig,
  updateRouterConfig,
} from "@/lib/server/domains/router/service";

export async function GET() {
  return withAdminAuditedRoute({
    failureAction: ADMIN_API_FAILURE_ACTIONS.router,
    failureTarget: "GET /api/router",
    handler: async () => {
      const data = await getRouterConfig();
      return NextResponse.json({ data });
    },
  });
}

export async function POST(request: Request) {
  return withAdminAuditedRoute({
    failureAction: ADMIN_API_FAILURE_ACTIONS.router,
    failureTarget: "POST /api/router",
    handler: async (session) => {
      const parsed = await parseJsonBodyWithCsrf({
        request,
        schema: routerUpdateSchema,
      });
      if ("response" in parsed) {
        return parsed.response;
      }

      await updateRouterConfig({
        actor: session.sub,
        payload: {
          activeProvider: parsed.data.activeProvider,
          activeModel: parsed.data.activeModel,
          fallbackProvider: parsed.data.fallbackProvider,
          fallbackModel: parsed.data.fallbackModel,
          temperature: parsed.data.temperature,
          maxTokens: parsed.data.maxTokens,
          enabled: parsed.data.enabled,
        },
      });

      return NextResponse.json({ ok: true });
    },
  });
}
