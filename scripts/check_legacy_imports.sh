#!/usr/bin/env bash
set -euo pipefail

if ! command -v rg >/dev/null 2>&1; then
  echo "ripgrep (rg) is required for legacy import checks." >&2
  exit 1
fi

matches="$(rg -n "(import|export)\\s+['\\\"]package:ai_chat/src/(models|services)/" lib test -S || true)"

if [[ -n "$matches" ]]; then
  echo "Legacy import check failed. Use feature paths instead of src/models or src/services." >&2
  echo "$matches" >&2
  exit 1
fi

echo "Legacy import check passed."
