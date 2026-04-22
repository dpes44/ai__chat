import { NextResponse } from "next/server";

import { assertCsrfToken } from "@/lib/csrf";
import {
  invalidCsrfResponse,
  invalidPayloadResponse,
} from "@/lib/server/core/http";
import { withAdminSessionRoute } from "@/lib/server/core/route";
import { routerUpdateSchema } from "@/lib/server/contracts/router";
import {
  getRouterConfig,
  updateRouterConfig,
} from "@/lib/server/domains/router/service";

export async function GET() {
  return withAdminSessionRoute({
    handler: async () => {
    const data = await getRouterConfig();
    return NextResponse.json({ data });
    },
  });
}

export async function POST(request: Request) {
  return withAdminSessionRoute({
    handler: async (session) => {
      const body = await request.json();

      const parsed = routerUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return invalidPayloadResponse();
      }

      if (!assertCsrfToken(parsed.data.csrfToken)) {
        return invalidCsrfResponse();
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
