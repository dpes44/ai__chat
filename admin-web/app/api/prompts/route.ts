import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { AiRoutingConfig, normalizeRoutingConfig } from "@/lib/ai";
import { assertCsrfToken } from "@/lib/csrf";
import { AI_ROUTING_DOC_PATH } from "@/lib/constants";
import { db } from "@/lib/firebase-admin";
import { getAdminSession } from "@/lib/session";

const updateSchema = z.object({
  csrfToken: z.string().min(1),
  systemPromptTemplate: z.string().min(1).max(20000),
  promptContext: z.object({
    emergencyNumbersText: z.string().max(1000),
    suicideHelpline: z.string().max(120),
    policeEmergency: z.string().max(120),
    ambulanceNumber: z.string().max(120),
    childHelpline: z.string().max(120),
    womenGbvHelpline: z.string().max(120),
    psychosocialHelpline: z.string().max(120),
    connectToProfessionalAvailable: z.boolean(),
    connectToProfessionalLabel: z.string().max(120),
    emergencyButtonAvailable: z.boolean(),
    assessmentToolsAvailable: z.string().max(1000),
  }),
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

  return NextResponse.json({
    data: {
      systemPromptTemplate: data.systemPromptTemplate,
      promptContext: data.promptContext,
    },
  });
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
    systemPromptTemplate: parsed.data.systemPromptTemplate,
    promptContext: parsed.data.promptContext,
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
    action: "AI_PROMPTS_UPDATED",
    target: AI_ROUTING_DOC_PATH,
    diffSummary: JSON.stringify({ before, after: nextConfig }).slice(0, 900),
  });

  return NextResponse.json({ ok: true });
}

