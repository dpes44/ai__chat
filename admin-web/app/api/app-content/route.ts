import { NextResponse } from "next/server";

import { getPublicAppContent } from "@/lib/server/domains/app-content/service";
import {
  gatewayJsonResponse,
  gatewayPreflightResponse,
  originRejectionResponse,
} from "@/lib/server/domains/gateway/cors";

const CORS_METHODS = "GET,OPTIONS";

export async function OPTIONS(request: Request) {
  return gatewayPreflightResponse({
    request,
    methods: CORS_METHODS,
  });
}

export async function GET(request: Request) {
  const rejection = originRejectionResponse({ request });
  if (rejection) {
    return rejection;
  }

  try {
    const data = await getPublicAppContent();
    return gatewayJsonResponse({
      request,
      methods: CORS_METHODS,
      body: { data },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
