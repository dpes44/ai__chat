export class HttpError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

export function normalizeHttpError(
  error: unknown,
  fallbackMessage = "Internal server error.",
): { status: number; message: string; code?: string } {
  if (error instanceof HttpError) {
    return {
      status: error.status,
      message: error.message,
      code: error.code,
    };
  }

  if (error && typeof error === "object") {
    const candidate = error as {
      status?: unknown;
      message?: unknown;
      code?: unknown;
    };
    if (
      typeof candidate.status === "number" &&
      Number.isInteger(candidate.status) &&
      candidate.status >= 400 &&
      candidate.status <= 599 &&
      typeof candidate.message === "string"
    ) {
      return {
        status: candidate.status,
        message: candidate.message,
        code: typeof candidate.code === "string" ? candidate.code : undefined,
      };
    }
  }

  return {
    status: 500,
    message: error instanceof Error ? error.message : fallbackMessage,
  };
}
