import { randomUUID } from "node:crypto";

import { logAudit } from "@/lib/audit";
import { HttpError } from "@/lib/server/core/errors";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const DEFAULT_SUPABASE_BUCKET = "doctor-photos";

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

export async function uploadDoctorPhoto(params: {
  actor: string;
  formData: FormData;
}): Promise<{
  photoUrl: string;
  objectPath: string;
  bucket: string;
  provider: "supabase";
}> {
  const entry = params.formData.get("file");
  if (!entry || typeof entry === "string" || typeof entry.arrayBuffer !== "function") {
    throw new HttpError("Image file is required.", 400);
  }
  const fileUpload = entry as File;

  const mimeType = fileUpload.type.trim().toLowerCase();
  if (!mimeType.startsWith("image/")) {
    throw new HttpError("Only image files are allowed.", 400);
  }

  if (fileUpload.size <= 0 || fileUpload.size > MAX_FILE_SIZE_BYTES) {
    throw new HttpError("Image must be between 1 byte and 5 MB.", 400);
  }

  const extension = extensionFromMime(mimeType);
  const objectPath = `doctor_photos/${Date.now()}_${randomUUID()}${extension}`;
  const bytes = await fileUpload.arrayBuffer();
  const config = readSupabaseConfig();
  if ("error" in config) {
    throw new HttpError(config.error, 500, "SUPABASE_CONFIG_ERROR");
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
    throw new HttpError(
      error instanceof Error ? error.message : "Could not upload doctor photo.",
      500,
      "SUPABASE_UPLOAD_FAILED",
    );
  }

  const photoUrl = buildPublicUrl(config.supabaseUrl, config.bucket, objectPath);

  await logAudit({
    actor: params.actor,
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

  return {
    photoUrl,
    objectPath,
    bucket: config.bucket,
    provider: "supabase",
  };
}
