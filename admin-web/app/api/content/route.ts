import { NextResponse } from "next/server";

import { ContentSettingsPayload } from "@/lib/content-store";
import { ADMIN_API_FAILURE_ACTIONS } from "@/lib/server/core/admin-api-failure-actions";
import { parseJsonBodyWithCsrf } from "@/lib/server/core/request";
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
      const parsed = await parseJsonBodyWithCsrf({
        request,
        schema: contentUpdateSchema,
        invalidPayloadMessage: (error) => {
          const issue = error.issues[0];
          const path = issue?.path?.length ? issue.path.join(".") : "";
          const message = issue?.message ?? "Invalid payload.";
          return path
            ? `Invalid payload at "${path}": ${message}`
            : `Invalid payload: ${message}`;
        },
      });
      if ("response" in parsed) {
        return parsed.response;
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
