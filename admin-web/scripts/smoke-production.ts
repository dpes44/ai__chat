import {
  FIRESTORE_BOOTSTRAP_REQUIRED_COLLECTIONS,
  FIRESTORE_BOOTSTRAP_REQUIRED_DOCS,
} from "../lib/constants";
import { emitScriptSummary, parseScriptOptions } from "./lib/script-runtime";

type JsonRecord = Record<string, unknown>;

type SmokeHttpCheck = {
  name: string;
  path: string;
  ok: boolean;
  status: number;
  message: string;
  durationMs: number;
};

type FirestoreStructureCheck = {
  ok: boolean;
  checkedDocs: string[];
  missingDocs: string[];
  requiredCollections: string[];
  missingFromBootstrap: string[];
  message: string;
};

type SmokeSummary = {
  actor: string;
  dryRun: boolean;
  baseUrl: string;
  includeFirestoreChecks: boolean;
  requestTimeoutMs: number;
  csrf: {
    ok: boolean;
    status: number;
    message: string;
  };
  login: {
    ok: boolean;
    status: number;
    message: string;
  };
  endpointChecks: SmokeHttpCheck[];
  firestore: FirestoreStructureCheck;
};

const REQUIRED_DOCS = FIRESTORE_BOOTSTRAP_REQUIRED_DOCS;
const REQUIRED_COLLECTION_NAMES = FIRESTORE_BOOTSTRAP_REQUIRED_COLLECTIONS;

function readEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, "");
}

function parseTimeoutMs(): number {
  const raw = Number(readEnv("SMOKE_HTTP_TIMEOUT_MS") || "12000");
  if (!Number.isFinite(raw)) {
    return 12000;
  }
  return Math.max(2000, Math.trunc(raw));
}

function parseSetCookie(headerValue: string): { key: string; value: string } | null {
  const firstPart = headerValue.split(";")[0] ?? "";
  const separatorIndex = firstPart.indexOf("=");
  if (separatorIndex <= 0) {
    return null;
  }
  return {
    key: firstPart.slice(0, separatorIndex).trim(),
    value: firstPart.slice(separatorIndex + 1).trim(),
  };
}

function updateCookieJar(jar: Map<string, string>, response: Response): void {
  const headersWithSetCookie = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookieHeaders = headersWithSetCookie.getSetCookie?.() ?? [];
  if (setCookieHeaders.length === 0) {
    const single = response.headers.get("set-cookie");
    if (single) {
      setCookieHeaders.push(single);
    }
  }

  for (const headerValue of setCookieHeaders) {
    const parsed = parseSetCookie(headerValue);
    if (!parsed || !parsed.key) {
      continue;
    }
    jar.set(parsed.key, parsed.value);
  }
}

function buildCookieHeader(jar: Map<string, string>): string {
  const segments: string[] = [];
  for (const [key, value] of jar.entries()) {
    segments.push(`${key}=${value}`);
  }
  return segments.join("; ");
}

async function fetchJson(params: {
  baseUrl: string;
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
  jar: Map<string, string>;
  timeoutMs: number;
}): Promise<{
  ok: boolean;
  status: number;
  body: unknown;
  message: string;
}> {
  const url = `${params.baseUrl}${params.path}`;
  const headers = new Headers();
  headers.set("Accept", "application/json");

  const cookieHeader = buildCookieHeader(params.jar);
  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }

  let requestBody: string | undefined;
  if (params.body !== undefined) {
    headers.set("Content-Type", "application/json");
    requestBody = JSON.stringify(params.body);
  }

  try {
    const response = await fetch(url, {
      method: params.method ?? "GET",
      headers,
      body: requestBody,
      signal: AbortSignal.timeout(params.timeoutMs),
      cache: "no-store",
    });

    updateCookieJar(params.jar, response);

    const text = await response.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text.slice(0, 400) };
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      body,
      message: response.ok ? "ok" : `HTTP ${response.status}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown network error";
    return {
      ok: false,
      status: 0,
      body: null,
      message,
    };
  }
}

function ensureRecord(value: unknown): JsonRecord {
  if (value && typeof value === "object") {
    return value as JsonRecord;
  }
  return {};
}

function validateUsersResponse(body: unknown): string | null {
  const root = ensureRecord(body);
  const data = ensureRecord(root.data);
  if (!Array.isArray(data.users)) {
    return "Expected data.users array.";
  }
  if (typeof data.total !== "number") {
    return "Expected data.total number.";
  }
  return null;
}

function validateForumResponse(body: unknown): string | null {
  const root = ensureRecord(body);
  const data = ensureRecord(root.data);
  if (!Array.isArray(data.threads)) {
    return "Expected data.threads array.";
  }
  if (!Array.isArray(data.replies)) {
    return "Expected data.replies array.";
  }
  return null;
}

function validateRouterResponse(body: unknown): string | null {
  const root = ensureRecord(body);
  const data = ensureRecord(root.data);
  if (typeof data.activeProvider !== "string" || data.activeProvider.length === 0) {
    return "Expected non-empty data.activeProvider.";
  }
  if (typeof data.activeModel !== "string" || data.activeModel.length === 0) {
    return "Expected non-empty data.activeModel.";
  }
  return null;
}

function validatePromptsResponse(body: unknown): string | null {
  const root = ensureRecord(body);
  const data = ensureRecord(root.data);
  if (typeof data.systemPromptTemplate !== "string") {
    return "Expected data.systemPromptTemplate string.";
  }
  return null;
}

function validateKeysResponse(body: unknown): string | null {
  const root = ensureRecord(body);
  if (!("data" in root)) {
    return "Expected data field.";
  }
  if (!root.data || typeof root.data !== "object") {
    return "Expected object data payload.";
  }
  return null;
}

async function runFirestoreStructureCheck(): Promise<FirestoreStructureCheck> {
  try {
    const { db } = await import("../lib/firebase-admin");

    const docSnaps = await Promise.all(REQUIRED_DOCS.map((path) => db.doc(path).get()));
    const missingDocs = REQUIRED_DOCS.filter((_, index) => !docSnaps[index]?.exists);

    const bootstrapSnap = docSnaps[REQUIRED_DOCS.length - 1];
    const bootstrapCollections = new Set<string>(
      Array.isArray(bootstrapSnap?.data()?.collections)
        ? (bootstrapSnap?.data()?.collections as string[])
        : [],
    );

    const missingFromBootstrap = REQUIRED_COLLECTION_NAMES.filter(
      (name) => !bootstrapCollections.has(name),
    );

    const ok = missingDocs.length === 0 && missingFromBootstrap.length === 0;
    return {
      ok,
      checkedDocs: [...REQUIRED_DOCS],
      missingDocs,
      requiredCollections: [...REQUIRED_COLLECTION_NAMES],
      missingFromBootstrap,
      message: ok ? "ok" : "Firestore structure mismatch.",
    };
  } catch (error) {
    return {
      ok: false,
      checkedDocs: [...REQUIRED_DOCS],
      missingDocs: [],
      requiredCollections: [...REQUIRED_COLLECTION_NAMES],
      missingFromBootstrap: [],
      message: error instanceof Error ? error.message : "Failed to query Firestore.",
    };
  }
}

async function main() {
  const options = parseScriptOptions("script:smoke-production");
  const baseUrl = normalizeBaseUrl(readEnv("ADMIN_WEB_BASE_URL"));
  const username = readEnv("ADMIN_SMOKE_USERNAME");
  const password = readEnv("ADMIN_SMOKE_PASSWORD");
  const includeFirestoreChecks = readEnv("SMOKE_SKIP_FIRESTORE") !== "1";
  const timeoutMs = parseTimeoutMs();

  const summary: SmokeSummary = {
    actor: options.actor,
    dryRun: options.dryRun,
    baseUrl,
    includeFirestoreChecks,
    requestTimeoutMs: timeoutMs,
    csrf: {
      ok: false,
      status: 0,
      message: "not started",
    },
    login: {
      ok: false,
      status: 0,
      message: "not started",
    },
    endpointChecks: [],
    firestore: {
      ok: false,
      checkedDocs: [...REQUIRED_DOCS],
      missingDocs: [],
      requiredCollections: [...REQUIRED_COLLECTION_NAMES],
      missingFromBootstrap: [],
      message: includeFirestoreChecks ? "not started" : "skipped",
    },
  };

  if (!baseUrl) {
    emitScriptSummary({
      script: "smoke-production",
      dryRun: options.dryRun,
      driftDetected: true,
      ok: false,
      summary: {
        ...summary,
        error: "Missing ADMIN_WEB_BASE_URL.",
      },
    });
    process.exit(1);
  }

  if (!username || !password) {
    emitScriptSummary({
      script: "smoke-production",
      dryRun: options.dryRun,
      driftDetected: true,
      ok: false,
      summary: {
        ...summary,
        error: "Missing ADMIN_SMOKE_USERNAME or ADMIN_SMOKE_PASSWORD.",
      },
    });
    process.exit(1);
  }

  const jar = new Map<string, string>();

  const csrfResponse = await fetchJson({
    baseUrl,
    path: "/api/csrf",
    jar,
    timeoutMs,
  });
  const csrfToken = ensureRecord(csrfResponse.body).token;
  summary.csrf = {
    ok: csrfResponse.ok && typeof csrfToken === "string" && csrfToken.length > 0,
    status: csrfResponse.status,
    message:
      csrfResponse.ok && typeof csrfToken === "string" && csrfToken.length > 0
        ? "ok"
        : `Failed csrf fetch: ${csrfResponse.message}`,
  };

  if (!summary.csrf.ok) {
    emitScriptSummary({
      script: "smoke-production",
      dryRun: options.dryRun,
      driftDetected: true,
      ok: false,
      summary,
    });
    process.exit(1);
  }

  const loginResponse = await fetchJson({
    baseUrl,
    path: "/api/auth/login",
    method: "POST",
    jar,
    timeoutMs,
    body: {
      username,
      password,
      csrfToken,
    },
  });
  const loginBody = ensureRecord(loginResponse.body);
  summary.login = {
    ok: loginResponse.ok && loginBody.ok === true,
    status: loginResponse.status,
    message:
      loginResponse.ok && loginBody.ok === true
        ? "ok"
        : `Login failed: ${loginResponse.message}`,
  };

  if (!summary.login.ok) {
    emitScriptSummary({
      script: "smoke-production",
      dryRun: options.dryRun,
      driftDetected: true,
      ok: false,
      summary,
    });
    process.exit(1);
  }

  const endpointDefinitions: Array<{
    name: string;
    path: string;
    validate: (body: unknown) => string | null;
  }> = [
    {
      name: "users",
      path: "/api/users?scope=withProfile",
      validate: validateUsersResponse,
    },
    {
      name: "forum",
      path: "/api/forum/moderation",
      validate: validateForumResponse,
    },
    {
      name: "router",
      path: "/api/router",
      validate: validateRouterResponse,
    },
    {
      name: "prompts",
      path: "/api/prompts",
      validate: validatePromptsResponse,
    },
    {
      name: "keys",
      path: "/api/keys/rotate",
      validate: validateKeysResponse,
    },
  ];

  for (const endpoint of endpointDefinitions) {
    const startedAt = Date.now();
    const response = await fetchJson({
      baseUrl,
      path: endpoint.path,
      jar,
      timeoutMs,
    });
    const durationMs = Date.now() - startedAt;
    const validationError = response.ok ? endpoint.validate(response.body) : null;

    summary.endpointChecks.push({
      name: endpoint.name,
      path: endpoint.path,
      ok: response.ok && !validationError,
      status: response.status,
      durationMs,
      message: validationError ?? response.message,
    });
  }

  if (includeFirestoreChecks) {
    summary.firestore = await runFirestoreStructureCheck();
  }

  const failedEndpointChecks = summary.endpointChecks.filter((check) => !check.ok);
  const overallOk =
    summary.csrf.ok &&
    summary.login.ok &&
    failedEndpointChecks.length === 0 &&
    (!includeFirestoreChecks || summary.firestore.ok);

  emitScriptSummary({
    script: "smoke-production",
    dryRun: options.dryRun,
    driftDetected: !overallOk,
    ok: overallOk,
    summary,
  });

  if (!overallOk) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
