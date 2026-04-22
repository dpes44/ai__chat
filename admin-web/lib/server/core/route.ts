import { NextResponse } from "next/server";

import { AdminApiSession, errorResponse, requireAdminSessionApi } from "./http";
import { logAdminApiFailure } from "./observability";

export async function withRouteError(params: {
  handler: () => Promise<NextResponse>;
  fallbackMessage?: string;
  onError?: (error: unknown) => void | Promise<void>;
}): Promise<NextResponse> {
  try {
    return await params.handler();
  } catch (error) {
    try {
      await params.onError?.(error);
    } catch (handlerError) {
      console.error("withRouteError onError failed:", handlerError);
    }
    return errorResponse(error, params.fallbackMessage);
  }
}

export async function withAdminSessionRoute(params: {
  handler: (session: AdminApiSession) => Promise<NextResponse>;
  fallbackMessage?: string;
  onError?: (error: unknown, session: AdminApiSession) => void | Promise<void>;
}): Promise<NextResponse> {
  const auth = await requireAdminSessionApi();
  if ("response" in auth) {
    return auth.response;
  }

  return withRouteError({
    handler: () => params.handler(auth.session),
    fallbackMessage: params.fallbackMessage,
    onError: (error) => params.onError?.(error, auth.session),
  });
}

export async function withAdminAuditedRoute(params: {
  failureAction: string;
  failureTarget: string;
  handler: (session: AdminApiSession) => Promise<NextResponse>;
  fallbackMessage?: string;
  onError?: (error: unknown, session: AdminApiSession) => void | Promise<void>;
}): Promise<NextResponse> {
  return withAdminSessionRoute({
    handler: params.handler,
    fallbackMessage: params.fallbackMessage,
    onError: async (error, session) => {
      await logAdminApiFailure({
        actor: session.sub,
        action: params.failureAction,
        target: params.failureTarget,
        error,
      });
      await params.onError?.(error, session);
    },
  });
}
