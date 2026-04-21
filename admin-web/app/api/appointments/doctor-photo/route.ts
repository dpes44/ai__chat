import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { logAudit } from "@/lib/audit";
import { assertCsrfToken } from "@/lib/csrf";
import { getAdminSession } from "@/lib/session";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const DEFAULT_SUPABASE_BUCKET = "doctor-photos";
export const runtime = "nodejs";

function extensionFromMime(mime: string): string {
  const normalized = mime.trim().toLowerCase();
  if (normalized === "image/png") return ".png";
  if (normalized === "image/webp") return ".webp";
  if (normalized === "image/gif") return ".gif";
  return ".jpg";
}

function encodeObjectPath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function normalizeSupabaseBaseUrl(input: string): string | null {
  try {
    const parsed = new URL(input.trim());
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

function buildPublicUrl(baseUrl: string, bucket: string, objectPath: string): string {
  return `${stripTrailingSlash(baseUrl)}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodeObjectPath(objectPath)}`;
}

function readSupabaseConfig():
  | {
      supabaseUrl: string;
      serviceRoleKey: string;
      bucket: string;
    }
  | { error: string } {
  const supabaseUrlRaw = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_SUPABASE_BUCKET;

  if (!supabaseUrlRaw) {
    return { error: "Missing SUPABASE_URL in admin-web/.env.local." };
  }
  const supabaseUrl = normalizeSupabaseBaseUrl(supabaseUrlRaw);
  if (!supabaseUrl) {
    return {
      error:
        "Invalid SUPABASE_URL. Use your project base URL, e.g. https://your-ref.supabase.co",
    };
  }

  if (!serviceRoleKey) {
    return {
      error:
        "Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) in admin-web/.env.local.",
    };
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    bucket,
  };
}

async function uploadToSupabase(params: {
  supabaseUrl: string;
  serviceRoleKey: string;
  bucket: string;
  objectPath: string;
  mimeType: string;
  bytes: ArrayBuffer;
}) {
  const uploadUrl =
    `${params.supabaseUrl}/storage/v1/object/` +
    `${encodeURIComponent(params.bucket)}/${encodeObjectPath(params.objectPath)}`;

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${params.serviceRoleKey}`,
      apikey: params.serviceRoleKey,
      "content-type": params.mimeType,
      "x-upsert": "false",
    },
    body: params.bytes,
    cache: "no-store",
  });

  if (response.ok) {
    return;
  }

  const raw = await response.text();
  let detail = `Supabase upload failed (${response.status}).`;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { error?: string; message?: string };
      detail = parsed.error || parsed.message || detail;
    } catch {
      detail = raw.slice(0, 220);
    }
  }

  throw new Error(detail);
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const csrfToken = formData.get("csrfToken")?.toString().trim() ?? "";
  if (!assertCsrfToken(csrfToken)) {
    return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
  }

  const entry = formData.get("file");
  if (!entry || typeof entry === "string" || typeof entry.arrayBuffer !== "function") {
    return NextResponse.json({ error: "Image file is required." }, { status: 400 });
  }
  const fileUpload = entry as File;

  const mimeType = fileUpload.type.trim().toLowerCase();
  if (!mimeType.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
  }

  if (fileUpload.size <= 0 || fileUpload.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Image must be between 1 byte and 5 MB." },
      { status: 400 },
    );
  }

  const extension = extensionFromMime(mimeType);
  const objectPath = `doctor_photos/${Date.now()}_${randomUUID()}${extension}`;
  const bytes = await fileUpload.arrayBuffer();
  const config = readSupabaseConfig();
  if ("error" in config) {
    return NextResponse.json({ error: config.error }, { status: 500 });
  }

  try {
    await uploadToSupabase({
      supabaseUrl: config.supabaseUrl,
      serviceRoleKey: config.serviceRoleKey,
      bucket: config.bucket,
      objectPath,
      mimeType,
      bytes,
    });
  } catch (error) {
    console.error("Doctor photo upload failed.", error);
    const message =
      error instanceof Error ? error.message : "Could not upload doctor photo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const photoUrl = buildPublicUrl(config.supabaseUrl, config.bucket, objectPath);

  await logAudit({
    actor: session.sub,
    action: "DOCTOR_PHOTO_UPLOADED",
    target: `supabase/${config.bucket}/${objectPath}`,
    diffSummary: JSON.stringify({
      provider: "supabase",
      bucket: config.bucket,
      objectPath,
      size: fileUpload.size,
      mimeType,
    }).slice(0, 900),
  });

  return NextResponse.json({
    ok: true,
    data: {
      photoUrl,
      objectPath,
      bucket: config.bucket,
      provider: "supabase",
    },
  });
}
