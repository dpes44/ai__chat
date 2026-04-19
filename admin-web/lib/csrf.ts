import { cookies } from "next/headers";

import { CSRF_COOKIE_NAME } from "./constants";

export function assertCsrfToken(tokenFromBody: string | null | undefined): boolean {
  const cookieToken = cookies().get(CSRF_COOKIE_NAME)?.value;
  if (!cookieToken || !tokenFromBody) {
    return false;
  }
  return cookieToken === tokenFromBody;
}
