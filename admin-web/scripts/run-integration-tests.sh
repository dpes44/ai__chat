#!/usr/bin/env bash
set -euo pipefail

if ! command -v firebase >/dev/null 2>&1; then
  echo "firebase CLI is required for emulator integration tests." >&2
  exit 1
fi

if ! command -v java >/dev/null 2>&1; then
  echo "Java 21+ is required for Firestore emulator integration tests." >&2
  exit 1
fi

JAVA_MAJOR="$(java -version 2>&1 | awk -F[\".] '/version/ {print $2; exit}')"
if [[ -z "$JAVA_MAJOR" || "$JAVA_MAJOR" -lt 21 ]]; then
  echo "Detected Java $JAVA_MAJOR. Please install Java 21+ for firebase emulators." >&2
  exit 1
fi

PROJECT_ID="${GCP_PROJECT_ID:-demo-ai-chat}"
CONFIG_HOME="${XDG_CONFIG_HOME:-/tmp/firebase-tools-config}"

mkdir -p "$CONFIG_HOME"

export GCP_PROJECT_ID="$PROJECT_ID"
export XDG_CONFIG_HOME="$CONFIG_HOME"
export FIRESTORE_EMULATOR_HOST="${FIRESTORE_EMULATOR_HOST:-127.0.0.1:8080}"
export FIREBASE_AUTH_EMULATOR_HOST="${FIREBASE_AUTH_EMULATOR_HOST:-127.0.0.1:9099}"
export ADMIN_KEYS_ENCRYPTION_SECRET="${ADMIN_KEYS_ENCRYPTION_SECRET:-integration-test-secret-0123456789abcdef}"

firebase emulators:exec \
  --config ../firebase.json \
  --project "$PROJECT_ID" \
  --only auth,firestore \
  "node --import tsx --test --test-concurrency=1 tests/integration/**/*.test.ts"
