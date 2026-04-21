import { Timestamp } from "firebase-admin/firestore";

import { percentile95 } from "@/lib/ai";
import { requireAdminSession } from "@/lib/session";
import { AI_REQUEST_LOGS_COLLECTION } from "@/lib/constants";
import { db } from "@/lib/firebase-admin";
import InsightsMenu from "@/components/InsightsMenu";

type DailyAccumulator = {
  date: string;
  requests: number;
  errors: number;
  latencies: number[];
  dau: Set<string>;
  estimatedCostUsd: number;
};

export default async function HealthPage() {
  await requireAdminSession();

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [metricsLogsSnap, logsSnap] = await Promise.all([
    db
      .collection(AI_REQUEST_LOGS_COLLECTION)
      .where("createdAt", ">=", Timestamp.fromDate(since))
      .orderBy("createdAt", "desc")
      .limit(5000)
      .get(),
    db.collection(AI_REQUEST_LOGS_COLLECTION).orderBy("createdAt", "desc").limit(20).get(),
  ]);

  const dailyMap = new Map<string, DailyAccumulator>();
  for (const doc of metricsLogsSnap.docs) {
    const row = doc.data();
    const timestamp = row.createdAt?.toDate?.();
    if (!timestamp) {
      continue;
    }

    const date = timestamp.toISOString().slice(0, 10);
    const current: DailyAccumulator = dailyMap.get(date) ?? {
      date,
      requests: 0,
      errors: 0,
      latencies: [],
      dau: new Set<string>(),
      estimatedCostUsd: 0,
    };

    current.requests += 1;
    if (row.status !== "success") {
      current.errors += 1;
    }

    const latency = Number(row.latencyMs ?? 0);
    if (Number.isFinite(latency)) {
      current.latencies.push(latency);
    }

    const userHash = (row.userIdHash ?? "").toString();
    if (userHash) {
      current.dau.add(userHash);
    }

    current.estimatedCostUsd += Number(row.estimatedCostUsd ?? 0);
    dailyMap.set(date, current);
  }

  const daily = [...dailyMap.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30)
    .map((row) => ({
      ...row,
      errorRate: row.requests > 0 ? Number((row.errors / row.requests).toFixed(4)) : 0,
      p95LatencyMs: percentile95(row.latencies),
      dau: row.dau.size,
      estimatedCostUsd: Number(row.estimatedCostUsd.toFixed(8)),
    }));

  const logs = logsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return (
    <div className="content-layout">
      <InsightsMenu active="health" />
      <div className="content-main-window">
        <div className="desktop-window">
          <div className="window-title">AI Health</div>
          <div className="window-body">
            <p className="hint">Rolling 30-day aggregates from <code>ai_request_logs</code>.</p>
            <table className="table" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Requests</th>
                  <th>Errors</th>
                  <th>Error Rate</th>
                  <th>P95 Latency</th>
                  <th>DAU</th>
                  <th>Estimated Cost (USD)</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((row) => (
                  <tr key={row.date}>
                    <td>{row.date}</td>
                    <td>{row.requests ?? 0}</td>
                    <td>{row.errors ?? 0}</td>
                    <td>{row.errorRate ?? 0}</td>
                    <td>{row.p95LatencyMs ?? 0} ms</td>
                    <td>{row.dau ?? 0}</td>
                    <td>{row.estimatedCostUsd ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="desktop-window">
          <div className="window-title">Recent Requests</div>
          <div className="window-body">
            <table className="table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Status</th>
                  <th>Provider</th>
                  <th>Model</th>
                  <th>Fallback</th>
                  <th>Latency</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row: any) => (
                  <tr key={row.id}>
                    <td>{row.requestId ?? row.id}</td>
                    <td>{row.status}</td>
                    <td>{row.provider}</td>
                    <td>{row.model}</td>
                    <td>{String(row.fallbackUsed ?? false)}</td>
                    <td>{row.latencyMs ?? 0} ms</td>
                    <td>{row.errorCode ?? ""}</td>
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
