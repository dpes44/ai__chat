import { logAudit } from "@/lib/audit";
import { Provider } from "@/lib/ai";
import { KEYS_DOC_PATH } from "@/lib/constants";
import { getProviderKeyStatuses, setProviderApiKey } from "@/lib/provider-keys";

export async function listProviderKeyStatuses() {
  return getProviderKeyStatuses();
}

export async function rotateProviderKey(params: {
  actor: string;
  provider: Provider;
  newApiKey: string;
}): Promise<{ version: number }> {
  const result = await setProviderApiKey({
    provider: params.provider,
    newApiKey: params.newApiKey,
    actor: params.actor,
  });

  await logAudit({
    actor: params.actor,
    action: "AI_PROVIDER_KEY_ROTATED",
    target: `${KEYS_DOC_PATH}:${params.provider}`,
    diffSummary: `Updated ${params.provider} key. Version: ${result.version}`,
  });

  return result;
}
