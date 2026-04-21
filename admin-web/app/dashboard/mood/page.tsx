import crypto from "node:crypto";

import { requireAdminSession } from "@/lib/session";
import { db } from "@/lib/firebase-admin";
import {
  MOOD_LOGS_SUBCOLLECTION,
  MOOD_METRICS_DAILY_COLLECTION,
} from "@/lib/constants";
import ContentMenu from "@/components/ContentMenu";

type MoodId = "great" | "good" | "okay" | "bad" | "terrible";

type MoodDistribution = Record<MoodId, number>;

type DailyMoodRow = {
  date: string;
  totalEntries: number;
  uniqueUsers: number;
  averageMoodScore: number;
  withNotes: number;
  distribution: MoodDistribution;
};

type QuerySnapshotLike = {
  docs: Array<{
    id: string;
    data: () => Record<string, unknown>;
  }>;
};

function buildDateKeys(days: number): string[] {
  const keys: string[] = [];
  const today = new Date();
  for (let i = 0; i < days; i += 1) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - i);
    keys.push(date.toISOString().slice(0, 10));
  }
  return keys;
}

function isFailedPreconditionError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  if (code === 9 || code === "9" || code === "failed-precondition") {
    return true;
  }

  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === "string" && message.includes("FAILED_PRECONDITION");
}

async function safeQuery(label: string, run: () => Promise<QuerySnapshotLike | null>) {
  try {
    const snapshot = await run();
    return { snapshot, failedPrecondition: false };
  } catch (error) {
    const failedPrecondition = isFailedPreconditionError(error);
    const level = failedPrecondition ? "warn" : "error";
    console[level](`Mood dashboard: ${label}`, error);
    return { snapshot: null, failedPrecondition };
  }
}

const emptyDistribution = (): MoodDistribution => ({
  great: 0,
  good: 0,
  okay: 0,
  bad: 0,
  terrible: 0,
});

function normalizeMoodId(input: unknown): MoodId {
  const mood = (input ?? "").toString().trim().toLowerCase();
  if (mood === "great" || mood === "good" || mood === "okay" || mood === "bad" || mood === "terrible") {
    return mood;
  }
  return "okay";
}

function scoreFromMoodId(moodId: MoodId): number {
  switch (moodId) {
    case "great":
      return 5;
    case "good":
      return 4;
    case "okay":
      return 3;
    case "bad":
      return 2;
    case "terrible":
      return 1;
    default:
      return 3;
  }
}

function toFiniteNumber(input: unknown): number {
  const value = Number(input);
  return Number.isFinite(value) ? value : 0;
}

function obfuscateUid(uid: string): string {
  return crypto.createHash("sha256").update(uid).digest("hex").slice(0, 12);
}

function formatDateTime(value: unknown): string {
  const date = (value as { toDate?: () => Date } | null)?.toDate?.();
  if (!date) {
    return "";
  }
  return date.toISOString().replace("T", " ").slice(0, 16);
}

function parseDailyMetrics(data: Record<string, unknown>): DailyMoodRow {
  const rawDistribution = (data.distribution ?? {}) as Record<string, unknown>;
  return {
    date: (data.date ?? "").toString(),
    totalEntries: Math.max(0, Math.trunc(toFiniteNumber(data.totalEntries))),
    uniqueUsers: Math.max(0, Math.trunc(toFiniteNumber(data.uniqueUsers))),
    averageMoodScore: Number(toFiniteNumber(data.averageMoodScore).toFixed(4)),
    withNotes: Math.max(0, Math.trunc(toFiniteNumber(data.withNotes))),
    distribution: {
      great: Math.max(0, Math.trunc(toFiniteNumber(rawDistribution.great))),
      good: Math.max(0, Math.trunc(toFiniteNumber(rawDistribution.good))),
      okay: Math.max(0, Math.trunc(toFiniteNumber(rawDistribution.okay))),
      bad: Math.max(0, Math.trunc(toFiniteNumber(rawDistribution.bad))),
      terrible: Math.max(0, Math.trunc(toFiniteNumber(rawDistribution.terrible))),
    },
  };
}

export default async function MoodPage() {
  await requireAdminSession();
  try {

  const recentDateKeys = buildDateKeys(30);
  const metricDocSnaps = await Promise.all(
    recentDateKeys.map(async (dateKey) => {
      try {
        return await db.collection(MOOD_METRICS_DAILY_COLLECTION).doc(dateKey).get();
      } catch (error) {
        console.error(`Mood dashboard: failed to load daily metric doc ${dateKey}`, error);
        return null;
      }
    }),
  );

  const dailyFromMetrics: DailyMoodRow[] = metricDocSnaps
    .filter((doc): doc is NonNullable<typeof doc> => Boolean(doc?.exists))
    .map((doc) => parseDailyMetrics(doc.data() as Record<string, unknown>))
    .filter((row) => row.date)
    .sort((a, b) => b.date.localeCompare(a.date));

  const rawQueriesEnabled = process.env.ENABLE_MOOD_RAW_LOG_QUERIES === "1";
  const oldestDateKey = recentDateKeys[recentDateKeys.length - 1];

  const logs30dResult = rawQueriesEnabled
    ? await safeQuery("raw 30-day mood logs unavailable (likely missing index)", async () =>
        db
          .collectionGroup(MOOD_LOGS_SUBCOLLECTION)
          .where("dateKey", ">=", oldestDateKey)
          .orderBy("dateKey", "desc")
          .limit(7000)
          .get(),
      )
    : { snapshot: null, failedPrecondition: false };

  const recentResult = rawQueriesEnabled
    ? await safeQuery("recent mood logs unavailable (likely missing index)", async () =>
        db
          .collectionGroup(MOOD_LOGS_SUBCOLLECTION)
          .orderBy("updatedAt", "desc")
          .limit(50)
          .get(),
      )
    : { snapshot: null, failedPrecondition: false };

  const dailyMap = new Map<
    string,
    {
      date: string;
      totalEntries: number;
      withNotes: number;
      totalScore: number;
      users: Set<string>;
      distribution: MoodDistribution;
    }
  >();

  for (const doc of logs30dResult.snapshot?.docs ?? []) {
    const data = doc.data() as Record<string, unknown>;
    const date = (data.dateKey ?? "").toString();
    if (!date) continue;

    const moodId = normalizeMoodId(data.moodId);
    const scoreRaw = Math.trunc(toFiniteNumber(data.moodScore));
    const score = scoreRaw >= 1 && scoreRaw <= 5 ? scoreRaw : scoreFromMoodId(moodId);
    const uid = (data.uid ?? "").toString();
    const note = (data.note ?? "").toString().trim();

    const current =
      dailyMap.get(date) ??
      {
        date,
        totalEntries: 0,
        withNotes: 0,
        totalScore: 0,
        users: new Set<string>(),
        distribution: emptyDistribution(),
      };

    current.totalEntries += 1;
    current.totalScore += score;
    current.distribution[moodId] += 1;
    if (uid) {
      current.users.add(uid);
    }
    if (note.length > 0) {
      current.withNotes += 1;
    }

    dailyMap.set(date, current);
  }

  const dailyFromRaw: DailyMoodRow[] = [...dailyMap.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30)
    .map((row) => ({
      date: row.date,
      totalEntries: row.totalEntries,
      uniqueUsers: row.users.size,
      averageMoodScore:
        row.totalEntries > 0
          ? Number((row.totalScore / row.totalEntries).toFixed(4))
          : 0,
      withNotes: row.withNotes,
      distribution: row.distribution,
    }));

  const daily = dailyFromMetrics.length > 0 ? dailyFromMetrics : dailyFromRaw;

  const recent = (recentResult.snapshot?.docs ?? []).map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const moodId = normalizeMoodId(data.moodId);
    const scoreRaw = Math.trunc(toFiniteNumber(data.moodScore));
    const score = scoreRaw >= 1 && scoreRaw <= 5 ? scoreRaw : scoreFromMoodId(moodId);

    return {
      id: doc.id,
      dateKey: (data.dateKey ?? "").toString(),
      userIdHash: obfuscateUid((data.uid ?? "").toString()),
      moodId,
      moodScore: score,
      note: (data.note ?? "").toString(),
      updatedAt: formatDateTime(data.updatedAt),
    };
  });

  return (
    <div className="content-layout">
      <ContentMenu active="mood" />
      <div className="content-main-window">
        <div className="desktop-window">
          <div className="window-title">Mood Trends</div>
          <div className="window-body">
            <p className="hint">
              Daily mood tracking rollup for the last 30 days. Aggregates are read from
              <code> mood_metrics_daily </code>
              when available, with automatic fallback to raw logs.
            </p>
            {!rawQueriesEnabled ? (
              <p className="hint" style={{ marginTop: 6 }}>
                Raw mood log queries are disabled by default. Set <code>ENABLE_MOOD_RAW_LOG_QUERIES=1</code> to enable them after Firestore indexes are ready.
              </p>
            ) : null}
            {(logs30dResult.failedPrecondition || recentResult.failedPrecondition) ? (
              <p className="hint" style={{ marginTop: 6 }}>
                Raw mood log queries are temporarily unavailable (index build in progress). The view is using available aggregated data only.
              </p>
            ) : null}
            <table className="table" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Entries</th>
                  <th>Unique Users</th>
                  <th>Avg Score</th>
                  <th>With Notes</th>
                  <th>Distribution (great/good/okay/bad/terrible)</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((row) => (
                  <tr key={row.date}>
                    <td>{row.date}</td>
                    <td>{row.totalEntries}</td>
                    <td>{row.uniqueUsers}</td>
                    <td>{row.averageMoodScore}</td>
                    <td>{row.withNotes}</td>
                    <td>
                      {row.distribution.great}/{row.distribution.good}/{row.distribution.okay}/
                      {row.distribution.bad}/{row.distribution.terrible}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="desktop-window">
          <div className="window-title">Recent Mood Logs</div>
          <div className="window-body">
            {!rawQueriesEnabled ? (
              <p className="hint">
                Recent raw logs are disabled. Set <code>ENABLE_MOOD_RAW_LOG_QUERIES=1</code> after index creation to show this table.
              </p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Date Key</th>
                    <th>User Hash</th>
                    <th>Mood</th>
                    <th>Score</th>
                    <th>Note</th>
                    <th>Updated At</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((row) => (
                    <tr key={row.id}>
                      <td>{row.dateKey}</td>
                      <td>{row.userIdHash}</td>
                      <td>{row.moodId}</td>
                      <td>{row.moodScore}</td>
                      <td>{row.note.slice(0, 120)}</td>
                      <td>{row.updatedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
  } catch (error) {
    console.error("Mood dashboard render failed", error);
    return (
      <div className="content-layout">
        <ContentMenu active="mood" />
        <div className="content-main-window">
          <div className="desktop-window">
            <div className="window-title">Mood Trends</div>
            <div className="window-body">
              <p className="error">Could not load mood dashboard right now.</p>
              <p className="hint">Please refresh this page and try again.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
