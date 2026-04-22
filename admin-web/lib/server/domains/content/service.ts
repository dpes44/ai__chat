import { logAudit } from "@/lib/audit";
import {
  ContentSettingsPayload,
  readContentSettings,
  writeContentSettings,
} from "@/lib/content-store";

export async function getAdminContentSettings(): Promise<ContentSettingsPayload> {
  return readContentSettings({ includeLegacyFallback: true });
}

export async function updateAdminContentSettings(params: {
  actor: string;
  nextConfig: ContentSettingsPayload;
}): Promise<void> {
  const before = await readContentSettings({ includeLegacyFallback: true });
  await writeContentSettings(params.nextConfig, params.actor);

  await logAudit({
    actor: params.actor,
    action: "AI_CONTENT_UPDATED",
    target: "content_collections/*",
    diffSummary: JSON.stringify({ before, after: params.nextConfig }).slice(0, 900),
  });
}
