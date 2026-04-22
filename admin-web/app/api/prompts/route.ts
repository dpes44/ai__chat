import { NextResponse } from "next/server";

import { assertCsrfToken } from "@/lib/csrf";
import {
  invalidCsrfResponse,
  invalidPayloadResponse,
} from "@/lib/server/core/http";
import { ADMIN_API_FAILURE_ACTIONS } from "@/lib/server/core/admin-api-failure-actions";
import { withAdminAuditedRoute } from "@/lib/server/core/route";
import { promptsUpdateSchema } from "@/lib/server/contracts/prompts";
import {
  getSystemPromptTemplate,
  updateSystemPromptTemplate,
} from "@/lib/server/domains/prompts/service";

export async function GET() {
  return withAdminAuditedRoute({
    failureAction: ADMIN_API_FAILURE_ACTIONS.prompts,
    failureTarget: "GET /api/prompts",
    handler: async () => {
      const systemPromptTemplate = await getSystemPromptTemplate();

      return NextResponse.json({
        data: {
          systemPromptTemplate,
        },
      });
    },
  });
}

export async function POST(request: Request) {
  return withAdminAuditedRoute({
    failureAction: ADMIN_API_FAILURE_ACTIONS.prompts,
    failureTarget: "POST /api/prompts",
    handler: async (session) => {
      const body = await request.json();
      const parsed = promptsUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return invalidPayloadResponse();
      }

      if (!assertCsrfToken(parsed.data.csrfToken)) {
        return invalidCsrfResponse();
      }

      await updateSystemPromptTemplate({
        actor: session.sub,
        systemPromptTemplate: parsed.data.systemPromptTemplate,
      });

      return NextResponse.json({ ok: true });
    },
  });
}
