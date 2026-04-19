export class ApiTimeoutError extends Error {
  constructor(message = "Request timed out.") {
    super(message);
    this.name = "ApiTimeoutError";
  }
}

export async function fetchJson<T = any>(
  input: string,
  init?: RequestInit,
  timeoutMs = 12000,
): Promise<{ ok: boolean; status: number; data: T }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      cache: "no-store",
      ...init,
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      status: response.status,
      data: payload as T,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiTimeoutError();
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

