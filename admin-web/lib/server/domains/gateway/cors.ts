import { NextResponse } from "next/server";

export function resolveAllowedOrigin(request: Request): string | null {
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

export function gatewayCorsHeaders(
  origin: string | null,
  methods: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    Vary: "Origin",
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

export function gatewayJsonResponse(params: {
  request: Request;
  body: Record<string, unknown>;
  status?: number;
  methods: string;
}): NextResponse {
  const origin = resolveAllowedOrigin(params.request);
  return NextResponse.json(params.body, {
    status: params.status ?? 200,
    headers: gatewayCorsHeaders(origin, params.methods),
  });
}

export function gatewayPreflightResponse(params: {
  request: Request;
  methods: string;
}): NextResponse {
  const origin = resolveAllowedOrigin(params.request);
  if (params.request.headers.get("origin") && !origin) {
    return NextResponse.json({ error: "Origin is not allowed." }, { status: 403 });
  }

  return new NextResponse(null, {
    status: 204,
    headers: gatewayCorsHeaders(origin, params.methods),
  });
}

export function originRejectionResponse(params: {
  request: Request;
}): NextResponse | null {
  const origin = params.request.headers.get("origin");
  const allowedOrigin = resolveAllowedOrigin(params.request);
  if (origin && !allowedOrigin) {
    return NextResponse.json({ error: "Origin is not allowed." }, { status: 403 });
  }
  return null;
}
