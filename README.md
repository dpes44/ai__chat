# Man Ko Sathi

Mental health support app (Flutter) with a server-side AI gateway and admin dashboard (Next.js + Firebase).

## Repository Structure

- `lib/` Flutter app source
- `admin-web/` Admin portal + AI gateway API (`POST /api/ai/chat`)
- `functions/` legacy Firebase Functions path (kept for reference)
- `docs/ai-admin-setup.md` setup guide for admin/gateway
- `docs/admin-ops-runbook.md` post-deploy smoke + alerting runbook
- `firestore.rules` + `firestore.indexes.json` Firestore security/index config

## Quick Start

### 1) Start Admin Portal + AI Gateway

```bash
cd admin-web
npm install
npm run dev
```

Open `http://localhost:3000/login`.

### 2) Run Flutter App Against Gateway

```bash
flutter pub get
flutter run --dart-define=AI_GATEWAY_BASE_URL=http://localhost:3000
```

Android emulator:

```bash
flutter run --dart-define=AI_GATEWAY_BASE_URL=http://10.0.2.2:3000
```

## Architecture Guard

To prevent regressions back to legacy import paths (`src/models`, `src/services`):

```bash
bash scripts/check_legacy_imports.sh
```

Firestore structure contract is source-of-truth in
`contracts/firestore-structure.json`. Regenerate typed constants for both
`admin-web` and `mobile` after edits:

```bash
cd admin-web
npm run generate:firestore-contract
```

## Admin Features

- Router: active/fallback provider + model
- Prompt Settings: system prompt template + runtime prompt context
- Provider Keys: encrypted key storage metadata + rotation
- Health: usage/errors/latency/cost views
- Audit: admin action history

## Required Admin Environment

Create `admin-web/.env.local` with at least:

```bash
GCP_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
ADMIN_SESSION_SECRET=32+char-random-string
ADMIN_KEYS_ENCRYPTION_SECRET=32+char-random-string
```

Optional:

```bash
AI_GATEWAY_ALLOWED_ORIGINS=http://localhost:8080,http://127.0.0.1:8080
ADMIN_RATE_LIMIT_MAX=20
ADMIN_RATE_LIMIT_WINDOW_MS=300000
ADMIN_LOCKOUT_ATTEMPTS=5
ADMIN_LOCKOUT_MINUTES=15
```

## Notes

- Keep provider API keys server-side only (never in Flutter client).
- Firestore rules must be deployed before full app testing.
- For full setup and seeding admin credentials, see [`docs/ai-admin-setup.md`](docs/ai-admin-setup.md).
- For post-deploy smoke checks and alert thresholds, see [`docs/admin-ops-runbook.md`](docs/admin-ops-runbook.md).
