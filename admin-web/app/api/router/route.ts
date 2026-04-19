import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { AiRoutingConfig, normalizeRoutingConfig } from "@/lib/ai";
import { assertCsrfToken } from "@/lib/csrf";
import { AI_ROUTING_DOC_PATH } from "@/lib/constants";
import { db } from "@/lib/firebase-admin";
import { getAdminSession } from "@/lib/session";

const providerSchema = z.enum(["openai", "anthropic"]);

const updateSchema = z.object({
  csrfToken: z.string().min(1),
  activeProvider: providerSchema,
  activeModel: z.string().min(1).max(120),
  fallbackProvider: providerSchema,
  fallbackModel: z.string().min(1).max(120),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().min(1).max(4096),
  enabled: z.boolean(),
});

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const snap = await db.doc(AI_ROUTING_DOC_PATH).get();
  const data = normalizeRoutingConfig(
    snap.exists ? (snap.data() as Partial<AiRoutingConfig>) : undefined,
  );
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (!assertCsrfToken(parsed.data.csrfToken)) {
    return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
  }

  const beforeSnap = await db.doc(AI_ROUTING_DOC_PATH).get();
  const before = beforeSnap.exists ? beforeSnap.data() : {};
  const nextConfig = {
    activeProvider: parsed.data.activeProvider,
    activeModel: parsed.data.activeModel,
    fallbackProvider: parsed.data.fallbackProvider,
    fallbackModel: parsed.data.fallbackModel,
    temperature: parsed.data.temperature,
    maxTokens: parsed.data.maxTokens,
    enabled: parsed.data.enabled,
  };

  await db.doc(AI_ROUTING_DOC_PATH).set(
    {
      ...nextConfig,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: session.sub,
    },
    { merge: true },
  );

  await logAudit({
    actor: session.sub,
    action: "AI_ROUTING_UPDATED",
    target: AI_ROUTING_DOC_PATH,
    diffSummary: JSON.stringify({ before, after: nextConfig }).slice(0, 900),
  });

  return NextResponse.json({ ok: true });
}
