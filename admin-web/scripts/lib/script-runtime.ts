export type ScriptOptions = {
  actor: string;
  dryRun: boolean;
};

export function parseScriptOptions(
  defaultActor: string,
  argv = process.argv.slice(2),
): ScriptOptions {
  let actor = defaultActor;
  let dryRun = false;
  let hasPositionalActor = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg.startsWith("--actor=")) {
      actor = arg.slice("--actor=".length).trim() || defaultActor;
      hasPositionalActor = true;
      continue;
    }
    if (arg === "--actor") {
      const value = (argv[i + 1] ?? "").trim();
      if (value && !value.startsWith("--")) {
        actor = value;
        hasPositionalActor = true;
        i += 1;
      }
      continue;
    }
    if (!arg.startsWith("--") && !hasPositionalActor) {
      actor = arg.trim() || defaultActor;
      hasPositionalActor = true;
    }
  }

  return {
    actor,
    dryRun,
  };
}

export function emitScriptSummary(params: {
  script: string;
  dryRun: boolean;
  driftDetected: boolean;
  ok: boolean;
  summary: unknown;
}): void {
  const payload = {
    script: params.script,
    ok: params.ok,
    dryRun: params.dryRun,
    driftDetected: params.driftDetected,
    timestamp: new Date().toISOString(),
    summary: params.summary,
  };

  const output = JSON.stringify(payload, null, 2);
  if (params.ok) {
    console.log(output);
    return;
  }
  console.error(output);
}
