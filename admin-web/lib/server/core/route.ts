import { NextResponse } from "next/server";

import { AdminApiSession, errorResponse, requireAdminSessionApi } from "./http";

export async function withRouteError(params: {
  handler: () => Promise<NextResponse>;
  fallbackMessage?: string;
  onError?: (error: unknown) => void;
}): Promise<NextResponse> {
  try {
    return await params.handler();
  } catch (error) {
    params.onError?.(error);
    return errorResponse(error, params.fallbackMessage);
  }
}

export async function withAdminSessionRoute(params: {
  handler: (session: AdminApiSession) => Promise<NextResponse>;
  fallbackMessage?: string;
  onError?: (error: unknown) => void;
}): Promise<NextResponse> {
  const auth = await requireAdminSessionApi();
  if ("response" in auth) {
    return auth.response;
  }

  return withRouteError({
    handler: () => params.handler(auth.session),
    fallbackMessage: params.fallbackMessage,
    onError: params.onError,
  });
}
