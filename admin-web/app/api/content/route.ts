import { NextResponse } from "next/server";

import { ContentSettingsPayload } from "@/lib/content-store";
import { assertCsrfToken } from "@/lib/csrf";
import {
  invalidCsrfResponse,
  invalidPayloadResponse,
} from "@/lib/server/core/http";
import { ADMIN_API_FAILURE_ACTIONS } from "@/lib/server/core/admin-api-failure-actions";
import { withAdminAuditedRoute } from "@/lib/server/core/route";
import { contentUpdateSchema } from "@/lib/server/contracts/content";
import {
  getAdminContentSettings,
  updateAdminContentSettings,
} from "@/lib/server/domains/content/service";

export async function GET() {
  return withAdminAuditedRoute({
    failureAction: ADMIN_API_FAILURE_ACTIONS.content,
    failureTarget: "GET /api/content",
    handler: async () => {
      const data = await getAdminContentSettings();
      return NextResponse.json({
        data: {
          promptContext: data.promptContext,
          tools: data.tools,
          therapistSubscriptions: data.therapistSubscriptions,
          legalContent: data.legalContent,
        },
      });
    },
  });
}

export async function POST(request: Request) {
  return withAdminAuditedRoute({
    failureAction: ADMIN_API_FAILURE_ACTIONS.content,
    failureTarget: "POST /api/content",
    handler: async (session) => {
      const body = await request.json();
      const parsed = contentUpdateSchema.safeParse(body);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const path = issue?.path?.length ? issue.path.join(".") : "";
        const message = issue?.message ?? "Invalid payload.";
        return invalidPayloadResponse(
          path ? `Invalid payload at "${path}": ${message}` : `Invalid payload: ${message}`,
        );
      }

      if (!assertCsrfToken(parsed.data.csrfToken)) {
        return invalidCsrfResponse();
      }

      const nextConfig: ContentSettingsPayload = {
        promptContext: parsed.data.promptContext,
        tools: parsed.data.tools,
        therapistSubscriptions: parsed.data.therapistSubscriptions,
        legalContent: parsed.data.legalContent,
      };

      await updateAdminContentSettings({
        actor: session.sub,
        nextConfig,
      });

      return NextResponse.json({ ok: true });
    },
  });
}
