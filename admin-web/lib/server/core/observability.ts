import { logAudit } from "@/lib/audit";
import { normalizeHttpError } from "@/lib/server/core/errors";

function compactError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error payload";
  }
}

export async function logAdminApiFailure(params: {
  actor: string;
  action: string;
  target: string;
  error: unknown;
}): Promise<void> {
  const normalized = normalizeHttpError(params.error, "Internal server error.");
  const raw = compactError(params.error);
  await logAudit({
    actor: params.actor,
    action: params.action,
    target: params.target,
    diffSummary: JSON.stringify({
      status: normalized.status,
      code: normalized.code ?? "",
      message: normalized.message,
      rawError: raw.slice(0, 400),
    }).slice(0, 900),
  });
}
