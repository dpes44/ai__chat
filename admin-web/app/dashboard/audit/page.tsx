import { ADMIN_AUDIT_LOGS_COLLECTION } from "@/lib/constants";
import { db } from "@/lib/firebase-admin";
import { requireAdminSession } from "@/lib/session";
import InsightsMenu from "@/components/InsightsMenu";

export default async function AuditPage() {
  await requireAdminSession();

  const snap = await db.collection(ADMIN_AUDIT_LOGS_COLLECTION).orderBy("createdAt", "desc").limit(100).get();
  const rows = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return (
    <div className="content-layout">
      <InsightsMenu active="audit" />
      <div className="content-main-window">
        <div className="desktop-window">
          <div className="window-title">Audit Log</div>
          <div className="window-body">
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Diff</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any) => (
                  <tr key={row.id}>
                    <td>{row.createdAt?.toDate?.()?.toISOString?.() ?? "-"}</td>
                    <td>{row.actor}</td>
                    <td>{row.action}</td>
                    <td>{row.target}</td>
                    <td>{row.diffSummary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
