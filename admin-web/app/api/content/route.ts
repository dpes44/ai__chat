import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { AiRoutingConfig, normalizeRoutingConfig } from "@/lib/ai";
import { assertCsrfToken } from "@/lib/csrf";
import { AI_ROUTING_DOC_PATH } from "@/lib/constants";
import { db } from "@/lib/firebase-admin";
import { getAdminSession } from "@/lib/session";

const toolOptionSchema = z.object({
  labelEn: z.string().min(1).max(200),
  labelNp: z.string().max(200).default(""),
  score: z.number().min(-100).max(100),
});

const toolQuestionSchema = z.object({
  textEn: z.string().min(1).max(1000),
  textNp: z.string().max(1000).default(""),
  options: z.array(toolOptionSchema).min(1).max(20),
});

const toolResponseSchema = z.object({
  min: z.number().min(-1000).max(1000),
  max: z.number().min(-1000).max(1000),
  textEn: z.string().min(1).max(2000),
  textNp: z.string().max(2000).default(""),
});

const toolSchema = z.object({
  id: z.string().min(1).max(80),
  nameEn: z.string().min(1).max(200),
  nameNp: z.string().max(200).default(""),
  summary: z.string().max(500).default(""),
  descriptionEn: z.string().max(5000).default(""),
  descriptionNp: z.string().max(5000).default(""),
  questions: z.array(toolQuestionSchema).max(40),
  responses: z.array(toolResponseSchema).max(40),
});

const therapistSubscriptionSchema = z.object({
  name: z.string().min(1).max(80),
  sessions: z.number().int().min(1).max(100),
  price: z.string().min(1).max(40),
  period: z.string().max(30).default(""),
  blurb: z.string().max(500).default(""),
  tag: z.string().max(80).default(""),
  featured: z.boolean().default(false),
  ctaLabel: z.string().max(80).default("Choose plan"),
});

const legalContentSchema = z.object({
  termsTitle: z.string().max(160).default("Terms & Conditions"),
  termsBody: z.string().max(50000).default(""),
  privacyTitle: z.string().max(160).default("Privacy Policy"),
  privacyBody: z.string().max(50000).default(""),
});
const legalContentDefaults = {
  termsTitle: "Terms & Conditions",
  termsBody: "",
  privacyTitle: "Privacy Policy",
  privacyBody: "",
};

const updateSchema = z.object({
  csrfToken: z.string().min(1),
  promptContext: z.object({
    suicideHelpline: z.string().max(120),
    policeEmergency: z.string().max(120),
    ambulanceNumber: z.string().max(120),
    childHelpline: z.string().max(120),
    womenGbvHelpline: z.string().max(120),
    psychosocialHelpline: z.string().max(120),
  }),
  tools: z.array(toolSchema).max(100),
  therapistSubscriptions: z.array(therapistSubscriptionSchema).max(40),
  legalContent: legalContentSchema.default(legalContentDefaults),
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
      promptContext: data.promptContext,
      tools: data.tools,
      therapistSubscriptions: data.therapistSubscriptions,
      legalContent: data.legalContent,
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
    const issue = parsed.error.issues[0];
    const path = issue?.path?.length ? issue.path.join(".") : "";
    const message = issue?.message ?? "Invalid payload.";
    return NextResponse.json(
      {
        error: path ? `Invalid payload at "${path}": ${message}` : `Invalid payload: ${message}`,
      },
      { status: 400 },
    );
  }

  if (!assertCsrfToken(parsed.data.csrfToken)) {
    return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
  }

  const beforeSnap = await db.doc(AI_ROUTING_DOC_PATH).get();
  const before = beforeSnap.exists ? beforeSnap.data() : {};
  const nextConfig = {
    promptContext: parsed.data.promptContext,
    tools: parsed.data.tools,
    therapistSubscriptions: parsed.data.therapistSubscriptions,
    legalContent: parsed.data.legalContent,
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
    action: "AI_CONTENT_UPDATED",
    target: AI_ROUTING_DOC_PATH,
    diffSummary: JSON.stringify({ before, after: nextConfig }).slice(0, 900),
  });

  return NextResponse.json({ ok: true });
}
