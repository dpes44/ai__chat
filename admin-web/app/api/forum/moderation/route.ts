import { NextResponse } from "next/server";

import { assertCsrfToken } from "@/lib/csrf";
import {
  invalidCsrfResponse,
  invalidPayloadResponse,
} from "@/lib/server/core/http";
import { withAdminSessionRoute } from "@/lib/server/core/route";
import { forumModerationUpdateSchema } from "@/lib/server/contracts/forum-moderation";
import {
  listForumModerationData,
  moderateForumContent,
} from "@/lib/server/domains/forum-moderation/service";

export async function GET() {
  return withAdminSessionRoute({
    handler: async () => {
    const data = await listForumModerationData();
    return NextResponse.json({ data });
    },
  });
}

export async function POST(request: Request) {
  return withAdminSessionRoute({
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
