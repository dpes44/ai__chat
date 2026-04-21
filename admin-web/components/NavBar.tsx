import Link from "next/link";
import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/lib/constants";

export default function NavBar() {
  const isAuthed = Boolean(cookies().get(SESSION_COOKIE_NAME)?.value);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">Man Ko Sathi Admin</div>
        <nav className="menu-bar" aria-label="Admin navigation">
          {isAuthed ? (
            <>
              <Link href="/dashboard">Overview</Link>
              <Link href="/dashboard/content">Content</Link>
              <Link href="/dashboard/router">AI Setup</Link>
              <Link href="/dashboard/health">Insights</Link>
              <Link href="/api/auth/logout">Logout</Link>
            </>
          ) : (
            <Link href="/login">Login</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
