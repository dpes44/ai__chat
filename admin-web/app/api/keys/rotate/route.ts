import { NextResponse } from "next/server";

import { assertCsrfToken } from "@/lib/csrf";
import {
  invalidCsrfResponse,
  invalidPayloadResponse,
} from "@/lib/server/core/http";
import { withAdminSessionRoute } from "@/lib/server/core/route";
import { rotateProviderKeySchema } from "@/lib/server/contracts/keys";
import {
  listProviderKeyStatuses,
  rotateProviderKey,
} from "@/lib/server/domains/keys/service";

export async function POST(request: Request) {
  return withAdminSessionRoute({
    onError: (error) => {
      console.error("POST /api/keys/rotate failed:", error);
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
    onError: (error) => {
      console.error("GET /api/keys/rotate failed:", error);
    },
    handler: async () => {
      const data = await listProviderKeyStatuses();
      return NextResponse.json({ data });
    },
  });
}
