import { NextResponse } from "next/server";
import { z } from "zod";

import { assertCsrfToken } from "@/lib/csrf";
import { invalidCsrfResponse, invalidPayloadResponse } from "./http";

type InvalidPayloadMessage =
  | string
  | ((error: z.ZodError<unknown>) => string);

type ParseJsonBodyResult<S extends z.ZodTypeAny> =
  | { data: z.output<S> }
  | { response: NextResponse };

function resolvePayloadMessage(
  invalidPayloadMessage: InvalidPayloadMessage | undefined,
  error: z.ZodError<unknown>,
): string {
  if (!invalidPayloadMessage) {
    return "Invalid payload.";
  }
  if (typeof invalidPayloadMessage === "string") {
    return invalidPayloadMessage;
  }
  return invalidPayloadMessage(error);
}

export async function parseJsonBody<S extends z.ZodTypeAny>(params: {
  request: Request;
  schema: S;
  invalidPayloadMessage?: InvalidPayloadMessage;
}): Promise<ParseJsonBodyResult<S>> {
  let body: unknown;
  try {
    body = await params.request.json();
  } catch {
    return { response: invalidPayloadResponse() };
  }

  const parsed = params.schema.safeParse(body);
  if (!parsed.success) {
    return {
      response: invalidPayloadResponse(
        resolvePayloadMessage(params.invalidPayloadMessage, parsed.error),
      ),
    };
  }

  return { data: parsed.data };
}

export async function parseJsonBodyWithCsrf<S extends z.ZodTypeAny>(
  params: {
    request: Request;
    schema: S;
    invalidPayloadMessage?: InvalidPayloadMessage;
  },
): Promise<ParseJsonBodyResult<S>> {
  const parsed = await parseJsonBody(params);
  if ("response" in parsed) {
    return parsed;
  }

  const csrfToken = (parsed.data as { csrfToken?: unknown }).csrfToken;
  if (typeof csrfToken !== "string" || !assertCsrfToken(csrfToken)) {
    return { response: invalidCsrfResponse() };
  }

  return parsed;
}
