import { NextResponse } from "next/server";

import { assertCsrfToken } from "@/lib/csrf";
import {
  invalidCsrfResponse,
  invalidPayloadResponse,
} from "@/lib/server/core/http";
import { logAdminApiFailure } from "@/lib/server/core/observability";
import { withAdminSessionRoute } from "@/lib/server/core/route";
import { promptsUpdateSchema } from "@/lib/server/contracts/prompts";
import {
  getSystemPromptTemplate,
  updateSystemPromptTemplate,
} from "@/lib/server/domains/prompts/service";

export async function GET() {
  return withAdminSessionRoute({
    onError: async (error, session) => {
      await logAdminApiFailure({
        actor: session.sub,
        action: "ADMIN_PROMPTS_API_FAILED",
        target: "GET /api/prompts",
        error,
      });
    },
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
  return withAdminSessionRoute({
    onError: async (error, session) => {
      await logAdminApiFailure({
        actor: session.sub,
        action: "ADMIN_PROMPTS_API_FAILED",
        target: "POST /api/prompts",
        error,
      });
    },
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
