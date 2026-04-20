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
              <div><Link href="/dashboard/router">Open Router</Link></div>
            </div>
            <div className="metric-box">
              <div className="label">Prompts</div>
              <div className="value">Prompt controls</div>
              <div><Link href="/dashboard/prompts">Open Prompts</Link></div>
            </div>
            <div className="metric-box">
              <div className="label">Content</div>
              <div className="value">Emergency/tools/subscriptions</div>
              <div><Link href="/dashboard/content">Open Content</Link></div>
            </div>
            <div className="metric-box">
              <div className="label">Keys</div>
              <div className="value">Provider secrets</div>
              <div><Link href="/dashboard/keys">Open Keys</Link></div>
            </div>
            <div className="metric-box">
              <div className="label">Health</div>
              <div className="value">Usage metrics</div>
              <div><Link href="/dashboard/health">Open Health</Link></div>
            </div>
            <div className="metric-box">
              <div className="label">Audit</div>
              <div className="value">Change history</div>
              <div><Link href="/dashboard/audit">Open Audit</Link></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
