import { readContentSettings, writeContentSettings } from "../lib/content-store";

async function main() {
  const actor = process.argv[2]?.trim() || "script:migrate-content-collections";
  const dryRun = process.argv.includes("--dry-run");

  const payload = await readContentSettings({ includeLegacyFallback: true });
  const summary = {
    emergencyNumbers: Object.keys(payload.promptContext).length,
    tools: payload.tools.length,
    therapistSubscriptions: payload.therapistSubscriptions.length,
    legalDocs: 2,
  };

  if (dryRun) {
    console.log("Dry run: content payload resolved from Firestore.");
    console.log(summary);
    return;
  }

  await writeContentSettings(payload, actor);
  console.log("Migrated content into dedicated collections.");
  console.log(summary);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
