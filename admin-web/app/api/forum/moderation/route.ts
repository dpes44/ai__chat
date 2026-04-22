import { NextResponse } from "next/server";

import { ADMIN_API_FAILURE_ACTIONS } from "@/lib/server/core/admin-api-failure-actions";
import { parseJsonBodyWithCsrf } from "@/lib/server/core/request";
import { withAdminAuditedRoute } from "@/lib/server/core/route";
import { forumModerationUpdateSchema } from "@/lib/server/contracts/forum-moderation";
import {
  listForumModerationData,
  moderateForumContent,
} from "@/lib/server/domains/forum-moderation/service";

export async function GET() {
  return withAdminAuditedRoute({
    failureAction: ADMIN_API_FAILURE_ACTIONS.forumModeration,
    failureTarget: "GET /api/forum/moderation",
    handler: async () => {
      const data = await listForumModerationData();
      return NextResponse.json({ data });
    },
  });
}

export async function POST(request: Request) {
  return withAdminAuditedRoute({
    failureAction: ADMIN_API_FAILURE_ACTIONS.forumModeration,
    failureTarget: "POST /api/forum/moderation",
    handler: async (session) => {
      const parsed = await parseJsonBodyWithCsrf({
        request,
        schema: forumModerationUpdateSchema,
      });
      if ("response" in parsed) {
        return parsed.response;
      }

      await moderateForumContent({
        actor: session.sub,
        kind: parsed.data.kind,
        threadId: parsed.data.threadId,
        replyId: parsed.data.replyId,
        isFlagged: parsed.data.isFlagged,
        isHidden: parsed.data.isHidden,
        moderationNote: parsed.data.moderationNote,
      });

      return NextResponse.json({ ok: true });
    },
  });
}
