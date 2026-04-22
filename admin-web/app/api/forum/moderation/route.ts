import { NextResponse } from "next/server";

import { assertCsrfToken } from "@/lib/csrf";
import {
  invalidCsrfResponse,
  invalidPayloadResponse,
} from "@/lib/server/core/http";
import { logAdminApiFailure } from "@/lib/server/core/observability";
import { withAdminSessionRoute } from "@/lib/server/core/route";
import { forumModerationUpdateSchema } from "@/lib/server/contracts/forum-moderation";
import {
  listForumModerationData,
  moderateForumContent,
} from "@/lib/server/domains/forum-moderation/service";

export async function GET() {
  return withAdminSessionRoute({
    onError: async (error, session) => {
      await logAdminApiFailure({
        actor: session.sub,
        action: "ADMIN_FORUM_MODERATION_API_FAILED",
        target: "GET /api/forum/moderation",
        error,
      });
    },
    handler: async () => {
      const data = await listForumModerationData();
      return NextResponse.json({ data });
    },
  });
}

export async function POST(request: Request) {
  return withAdminSessionRoute({
    onError: async (error, session) => {
      await logAdminApiFailure({
        actor: session.sub,
        action: "ADMIN_FORUM_MODERATION_API_FAILED",
        target: "POST /api/forum/moderation",
        error,
      });
    },
    handler: async (session) => {
      const body = await request.json();
      const parsed = forumModerationUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return invalidPayloadResponse();
      }

      if (!assertCsrfToken(parsed.data.csrfToken)) {
        return invalidCsrfResponse();
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
