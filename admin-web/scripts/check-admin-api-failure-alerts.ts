import { Timestamp } from "firebase-admin/firestore";

import { ADMIN_AUDIT_LOGS_COLLECTION } from "../lib/constants";
import { db } from "../lib/firebase-admin";
import { emitScriptSummary, parseScriptOptions } from "./lib/script-runtime";

type FailureRow = {
  id: string;
  actor: string;
  action: string;
  target: string;
  diffSummary: string;
  createdAtMs: number;
  createdAtIso: string;
};

type AlertSummary = {
  actor: string;
  dryRun: boolean;
  windowMinutes: number;
  checkedFromIso: string;
  checkedToIso: string;
  rowCountInWindow: number;
  failureCount: number;
  perActionThreshold: number;
  totalThreshold: number;
  perActionCounts: Record<string, number>;
  breachedActions: string[];
  totalThresholdBreached: boolean;
  topFailures: FailureRow[];
  webhookConfigured: boolean;
  notificationSent: boolean;
  notificationStatus: number;
  notificationMessage: string;
};

const API_FAILURE_ACTIONS = [
  "ADMIN_USERS_API_FAILED",
  "ADMIN_FORUM_MODERATION_API_FAILED",
  "ADMIN_ROUTER_API_FAILED",
  "ADMIN_PROMPTS_API_FAILED",
  "ADMIN_KEYS_API_FAILED",
] as const;

function readEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}

function parseIntegerEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = Number(readEnv(name));
  if (!Number.isFinite(raw)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.trunc(raw)));
}

function toDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "object" && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

function toIso(value: unknown): string {
  const resolved = toDate(value);
  return resolved ? resolved.toISOString() : "";
}

async function sendWebhook(params: {
  url: string;
  summary: AlertSummary;
}): Promise<{ sent: boolean; status: number; message: string }> {
  const title = "[admin-web] API failure threshold exceeded";
  const lines = [
    title,
    `windowMinutes=${params.summary.windowMinutes}`,
    `failureCount=${params.summary.failureCount}`,
    `totalThreshold=${params.summary.totalThreshold}`,
    `breachedActions=${params.summary.breachedActions.join(", ") || "none"}`,
  ];

  try {
    const response = await fetch(params.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: lines.join("\n"),
        source: "admin-web",
        summary: {
          checkedFromIso: params.summary.checkedFromIso,
          checkedToIso: params.summary.checkedToIso,
          failureCount: params.summary.failureCount,
          perActionCounts: params.summary.perActionCounts,
          breachedActions: params.summary.breachedActions,
          topFailures: params.summary.topFailures.slice(0, 5),
        },
      }),
      signal: AbortSignal.timeout(10000),
    });

    return {
      sent: response.ok,
      status: response.status,
      message: response.ok ? "ok" : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      sent: false,
      status: 0,
      message: error instanceof Error ? error.message : "Webhook request failed.",
    };
  }
}

async function main() {
  const options = parseScriptOptions("script:check-admin-api-failure-alerts");
  const windowMinutes = parseIntegerEnv("API_FAILURE_ALERT_WINDOW_MINUTES", 15, 1, 1440);
  const perActionThreshold = parseIntegerEnv("API_FAILURE_ALERT_THRESHOLD", 3, 1, 10000);
  const totalThreshold = parseIntegerEnv(
    "API_FAILURE_ALERT_TOTAL_THRESHOLD",
    perActionThreshold,
    1,
    100000,
  );
  const maxRows = parseIntegerEnv("API_FAILURE_ALERT_MAX_ROWS", 2000, 100, 20000);

  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);
  const windowStartTimestamp = Timestamp.fromDate(windowStart);

  const snap = await db
    .collection(ADMIN_AUDIT_LOGS_COLLECTION)
    .where("createdAt", ">=", windowStartTimestamp)
    .limit(maxRows)
    .get();

  const failureActionSet = new Set<string>(API_FAILURE_ACTIONS);
  const failures: FailureRow[] = snap.docs
    .map((doc) => {
      const data = doc.data() ?? {};
      const action = (data.action ?? "").toString().trim();
      const createdAt = toDate(data.createdAt);
      return {
        id: doc.id,
        actor: (data.actor ?? "").toString(),
        action,
        target: (data.target ?? "").toString(),
        diffSummary: (data.diffSummary ?? "").toString().slice(0, 240),
        createdAtMs: createdAt?.getTime() ?? 0,
        createdAtIso: createdAt?.toISOString() ?? "",
      };
    })
    .filter((row) => failureActionSet.has(row.action));

  const perActionCounts: Record<string, number> = Object.fromEntries(
    API_FAILURE_ACTIONS.map((action) => [action, 0]),
  ) as Record<string, number>;
  for (const row of failures) {
    perActionCounts[row.action] = (perActionCounts[row.action] ?? 0) + 1;
  }

  const breachedActions = Object.entries(perActionCounts)
    .filter(([, count]) => count >= perActionThreshold)
    .map(([action]) => action);
  const totalThresholdBreached = failures.length >= totalThreshold;
  const thresholdExceeded = breachedActions.length > 0 || totalThresholdBreached;

  const summary: AlertSummary = {
    actor: options.actor,
    dryRun: options.dryRun,
    windowMinutes,
    checkedFromIso: windowStart.toISOString(),
    checkedToIso: now.toISOString(),
    rowCountInWindow: snap.size,
    failureCount: failures.length,
    perActionThreshold,
    totalThreshold,
    perActionCounts,
    breachedActions,
    totalThresholdBreached,
    topFailures: failures
      .sort((a, b) => b.createdAtMs - a.createdAtMs)
      .slice(0, 20),
    webhookConfigured: Boolean(readEnv("ADMIN_FAILURE_ALERT_WEBHOOK_URL")),
    notificationSent: false,
    notificationStatus: 0,
    notificationMessage: options.dryRun ? "skipped (dry-run)" : "not sent",
  };

  if (thresholdExceeded && !options.dryRun) {
    const webhookUrl = readEnv("ADMIN_FAILURE_ALERT_WEBHOOK_URL");
    if (webhookUrl) {
      const webhookResult = await sendWebhook({ url: webhookUrl, summary });
      summary.notificationSent = webhookResult.sent;
      summary.notificationStatus = webhookResult.status;
      summary.notificationMessage = webhookResult.message;
    } else {
      summary.notificationMessage = "threshold exceeded; webhook not configured";
    }
  }

  emitScriptSummary({
    script: "check-admin-api-failure-alerts",
    dryRun: options.dryRun,
    driftDetected: thresholdExceeded,
    ok: !thresholdExceeded,
    summary,
  });

  if (thresholdExceeded) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
