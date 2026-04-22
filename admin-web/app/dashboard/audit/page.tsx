import { ADMIN_AUDIT_LOGS_COLLECTION } from "@/lib/constants";
import { db } from "@/lib/firebase-admin";
import { requireAdminSession } from "@/lib/session";
import InsightsMenu from "@/components/InsightsMenu";

type AuditRow = {
  id: string;
  createdAt?: { toDate?: () => Date } | Date | null;
  actor?: string;
  action?: string;
  target?: string;
  diffSummary?: string;
};

type FailureDetails = {
  status?: number;
  code?: string;
  message?: string;
};

const API_FAILURE_ACTIONS = new Set([
  "ADMIN_USERS_API_FAILED",
  "ADMIN_FORUM_MODERATION_API_FAILED",
  "ADMIN_ROUTER_API_FAILED",
  "ADMIN_PROMPTS_API_FAILED",
  "ADMIN_KEYS_API_FAILED",
]);

function toIso(createdAt: AuditRow["createdAt"]): string {
  if (!createdAt) {
    return "-";
  }
  if (createdAt instanceof Date) {
    return createdAt.toISOString();
  }
  if (typeof createdAt === "object" && typeof createdAt.toDate === "function") {
    return createdAt.toDate().toISOString();
  }
  return "-";
}

function parseFailureDetails(row: AuditRow): FailureDetails {
  if (typeof row.diffSummary !== "string" || row.diffSummary.length === 0) {
    return {};
  }

  try {
    const parsed = JSON.parse(row.diffSummary) as {
      status?: unknown;
      code?: unknown;
      message?: unknown;
    };
    return {
      status: typeof parsed.status === "number" ? parsed.status : undefined,
      code: typeof parsed.code === "string" ? parsed.code : undefined,
      message: typeof parsed.message === "string" ? parsed.message : undefined,
    };
  } catch {
    return {};
  }
}

export default async function AuditPage() {
  await requireAdminSession();

  const snap = await db
    .collection(ADMIN_AUDIT_LOGS_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(150)
    .get();
  const rows = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as AuditRow[];
  const failureRows = rows
    .filter((row) => API_FAILURE_ACTIONS.has(row.action ?? ""))
    .slice(0, 40);

  return (
    <div className="content-layout">
      <InsightsMenu active="audit" />
      <div className="content-main-window">
        <div className="desktop-window">
          <div className="window-title">Audit Log</div>
          <div className="window-body">
            <h3 style={{ marginTop: 0 }}>Recent API Failures</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Status</th>
                  <th>Code</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {failureRows.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No API failures found in recent logs.</td>
                  </tr>
                ) : (
                  failureRows.map((row) => {
                    const details = parseFailureDetails(row);
                    return (
                      <tr key={row.id}>
                        <td>{toIso(row.createdAt)}</td>
                        <td>{row.actor ?? "-"}</td>
                        <td>{row.action ?? "-"}</td>
                        <td>{row.target ?? "-"}</td>
                        <td>{details.status ?? "-"}</td>
                        <td>{details.code ?? "-"}</td>
                        <td>{details.message ?? "-"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            <h3>All Events</h3>
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
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{toIso(row.createdAt)}</td>
                    <td>{row.actor ?? "-"}</td>
                    <td>{row.action ?? "-"}</td>
                    <td>{row.target ?? "-"}</td>
                    <td>{row.diffSummary ?? "-"}</td>
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
