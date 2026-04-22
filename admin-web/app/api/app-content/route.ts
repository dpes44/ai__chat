import { NextResponse } from "next/server";

import { readContentSettings } from "@/lib/content-store";

function resolvedOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (!origin) {
    return null;
  }

  const raw = process.env.AI_GATEWAY_ALLOWED_ORIGINS?.trim();
  if (!raw) {
    return process.env.NODE_ENV === "production" ? null : origin;
  }

  const allowed = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (allowed.includes("*") || allowed.includes(origin)) {
    return origin;
  }
  return null;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    Vary: "Origin",
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function jsonResponse(
  request: Request,
  body: Record<string, unknown>,
  status = 200,
): NextResponse {
  const origin = resolvedOrigin(request);
  return NextResponse.json(body, {
    status,
    headers: corsHeaders(origin),
  });
}

export async function OPTIONS(request: Request) {
  const origin = resolvedOrigin(request);
  if (request.headers.get("origin") && !origin) {
    return NextResponse.json({ error: "Origin is not allowed." }, { status: 403 });
  }

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const allowedOrigin = resolvedOrigin(request);
  if (origin && !allowedOrigin) {
    return NextResponse.json({ error: "Origin is not allowed." }, { status: 403 });
  }

  const content = await readContentSettings({ includeLegacyFallback: true });

  return jsonResponse(request, {
    data: {
      promptContext: content.promptContext,
      tools: content.tools,
      therapistSubscriptions: content.therapistSubscriptions,
      legalContent: content.legalContent,
    },
  });
}
