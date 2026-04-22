import { NextResponse } from "next/server";

import { assertCsrfToken } from "@/lib/csrf";
import {
  invalidCsrfResponse,
  invalidPayloadResponse,
} from "@/lib/server/core/http";
import { logAdminApiFailure } from "@/lib/server/core/observability";
import { withAdminSessionRoute } from "@/lib/server/core/route";
import { rotateProviderKeySchema } from "@/lib/server/contracts/keys";
import {
  listProviderKeyStatuses,
  rotateProviderKey,
} from "@/lib/server/domains/keys/service";

export async function POST(request: Request) {
  return withAdminSessionRoute({
    onError: async (error, session) => {
      await logAdminApiFailure({
        actor: session.sub,
        action: "ADMIN_KEYS_API_FAILED",
        target: "POST /api/keys/rotate",
        error,
      });
    },
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
  return withAdminSessionRoute({
    onError: async (error, session) => {
      await logAdminApiFailure({
        actor: session.sub,
        action: "ADMIN_KEYS_API_FAILED",
        target: "GET /api/keys/rotate",
        error,
      });
    },
    handler: async () => {
      const data = await listProviderKeyStatuses();
      return NextResponse.json({ data });
    },
  });
}
