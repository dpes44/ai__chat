import { readContentSettings, writeContentSettings } from "../lib/content-store";
import { emitScriptSummary, parseScriptOptions } from "./lib/script-runtime";

function stable(value: unknown): string {
  return JSON.stringify(value);
}

async function main() {
  const options = parseScriptOptions("script:migrate-content-collections");
  const existingCollections = await readContentSettings({
    includeLegacyFallback: false,
  });
  const payload = await readContentSettings({ includeLegacyFallback: true });
  const driftBefore = stable(existingCollections) !== stable(payload);

  const summary = {
    actor: options.actor,
    emergencyNumbers: Object.keys(payload.promptContext).length,
    tools: payload.tools.length,
    therapistSubscriptions: payload.therapistSubscriptions.length,
    legalDocs: 2,
    driftBefore,
    driftAfter: driftBefore,
  };

  if (options.dryRun) {
    emitScriptSummary({
      script: "migrate-content-collections",
      dryRun: true,
      driftDetected: driftBefore,
      ok: !driftBefore,
      summary,
    });
    if (driftBefore) {
      process.exit(1);
    }
    return;
  }

  if (driftBefore) {
    await writeContentSettings(payload, options.actor);
  }

  const postWriteCollections = await readContentSettings({
    includeLegacyFallback: false,
  });
  const driftAfter = stable(postWriteCollections) !== stable(payload);

  emitScriptSummary({
    script: "migrate-content-collections",
    dryRun: false,
    driftDetected: driftAfter,
    ok: !driftAfter,
    summary: {
      ...summary,
      driftAfter,
    },
  });

  if (driftAfter) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
