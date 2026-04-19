import { NextResponse } from "next/server";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { assertCsrfToken } from "@/lib/csrf";
import { AI_PROVIDER_KEYS_DOC_PATH } from "@/lib/constants";
import { getProviderKeyStatuses, setProviderApiKey } from "@/lib/provider-keys";
import { getAdminSession } from "@/lib/session";

const schema = z.object({
  csrfToken: z.string().min(1),
  provider: z.enum(["openai", "anthropic"]),
  newApiKey: z.string().min(16),
});

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    if (!assertCsrfToken(parsed.data.csrfToken)) {
      return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
    }

    const result = await setProviderApiKey({
      provider: parsed.data.provider,
      newApiKey: parsed.data.newApiKey,
      actor: session.sub,
    });

    await logAudit({
      actor: session.sub,
      action: "AI_PROVIDER_KEY_ROTATED",
      target: `${AI_PROVIDER_KEYS_DOC_PATH}:${parsed.data.provider}`,
      diffSummary: `Updated ${parsed.data.provider} key. Version: ${result.version}`,
    });

    return NextResponse.json({
      ok: true,
      version: result.version,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    console.error("POST /api/keys/rotate failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const data = await getProviderKeyStatuses();
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    console.error("GET /api/keys/rotate failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
