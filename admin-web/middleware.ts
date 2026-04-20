import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "./lib/constants";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const protectedDashboardRoute = pathname.startsWith("/dashboard");
  const protectedApiRoute =
    pathname.startsWith("/api/router") ||
    pathname.startsWith("/api/prompts") ||
    pathname.startsWith("/api/content") ||
    pathname.startsWith("/api/keys");

  if (!protectedDashboardRoute && !protectedApiRoute) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (session) {
    return NextResponse.next();
  }

  if (protectedApiRoute) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/router", "/api/prompts", "/api/content/:path*", "/api/keys/:path*"],
};
