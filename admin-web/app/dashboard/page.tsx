import Link from "next/link";

import { requireAdminSession } from "@/lib/session";

export default async function DashboardPage() {
  await requireAdminSession();

  return (
    <>
      <div className="desktop-window">
        <div className="window-title">Overview</div>
        <div className="window-body">
          <p className="hint">Compact admin console for AI routing, prompt policy, keys, health, and audit logs.</p>

          <div className="metric-grid">
            <div className="metric-box">
              <div className="label">Router</div>
              <div className="value">Model policy</div>
              <div><Link href="/dashboard/router">Open via AI Setup Menu</Link></div>
            </div>
            <div className="metric-box">
              <div className="label">Prompts</div>
              <div className="value">Prompt controls</div>
              <div><Link href="/dashboard/router">Open via AI Setup Menu</Link></div>
            </div>
            <div className="metric-box">
              <div className="label">Content</div>
              <div className="value">Mobile app content hub</div>
              <div><Link href="/dashboard/content">Open Content</Link></div>
            </div>
            <div className="metric-box">
              <div className="label">Keys</div>
              <div className="value">Provider secrets</div>
              <div><Link href="/dashboard/router">Open via AI Setup Menu</Link></div>
            </div>
            <div className="metric-box">
              <div className="label">Appointments</div>
              <div className="value">Doctors and bookings</div>
              <div><Link href="/dashboard/content">Open via Content Menu</Link></div>
            </div>
            <div className="metric-box">
              <div className="label">Forum</div>
              <div className="value">Posts & replies moderation</div>
              <div><Link href="/dashboard/content">Open via Content Menu</Link></div>
            </div>
            <div className="metric-box">
              <div className="label">Users</div>
              <div className="value">Accounts & moderation</div>
              <div><Link href="/dashboard/users">Open Users</Link></div>
            </div>
            <div className="metric-box">
              <div className="label">Health</div>
              <div className="value">Usage metrics</div>
              <div><Link href="/dashboard/health">Open via Insights Menu</Link></div>
            </div>
            <div className="metric-box">
              <div className="label">Mood</div>
              <div className="value">Daily mood trends</div>
              <div><Link href="/dashboard/content">Open via Content Menu</Link></div>
            </div>
            <div className="metric-box">
              <div className="label">Audit</div>
              <div className="value">Change history</div>
              <div><Link href="/dashboard/health">Open via Insights Menu</Link></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
