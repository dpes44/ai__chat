# AI Gateway + Admin Setup (No GCP Billing Required)

This setup removes Secret Manager and Cloud Functions from the critical path.

## Architecture

- `admin-web/` hosts:
  - Admin dashboard (`/dashboard/*`)
  - AI gateway API (`POST /api/ai/chat`)
- Firestore stores:
  - Router config (`app_config/ai_routing`)
  - Encrypted provider keys metadata + ciphertext (`app_config/provider_keys`)
  - Emergency numbers (`content_emergency_numbers/{key}`)
  - Assessment tools (`content_tools/{id}`)
  - Therapist subscriptions (`content_therapist_subscriptions/{id}`)
  - Legal content (`content_legal/terms`, `content_legal/privacy`)
  - Request logs (`ai_request_logs`)
  - Admin auth + audit logs
- Flutter app calls `POST /api/ai/chat` with Firebase ID token.

## 1) Admin env config

Create `admin-web/.env.local`:

```bash
GCP_PROJECT_ID=your-firebase-project-id
GOOGLE_APPLICATION_CREDENTIALS=/abs/path/to/service-account.json
ADMIN_SESSION_SECRET=your-32-plus-char-session-secret
ADMIN_KEYS_ENCRYPTION_SECRET=your-32-plus-char-encryption-secret
AI_GATEWAY_ALLOWED_ORIGINS=http://localhost:8080,http://127.0.0.1:8080
ADMIN_RATE_LIMIT_MAX=20
ADMIN_RATE_LIMIT_WINDOW_MS=300000
ADMIN_LOCKOUT_ATTEMPTS=5
ADMIN_LOCKOUT_MINUTES=15
```

Notes:
- `ADMIN_SESSION_SECRET` secures admin cookies.
- `ADMIN_KEYS_ENCRYPTION_SECRET` encrypts provider keys before they are written to Firestore.
- `AI_GATEWAY_ALLOWED_ORIGINS` controls browser CORS for Flutter Web.
- If you cannot mount a JSON file in your host, set `FIREBASE_SERVICE_ACCOUNT_JSON` instead.

## 2) Seed admin login

```bash
cd admin-web
npm install
npm run hash:password -- 'YOUR_PASSWORD'
```

Use the generated Argon2id hash:

```bash
GCP_PROJECT_ID=your-firebase-project-id \
GOOGLE_APPLICATION_CREDENTIALS=/abs/path/to/service-account.json \
npm run seed:admin -- 'your-username' 'ARGON2ID_HASH'
```

## 3) Run admin portal

```bash
cd admin-web
npm run dev
```

Open `http://localhost:3000/login`, sign in, then:

1. `Provider Keys`: add OpenAI and/or Anthropic key.
2. `Model Router`: select active/fallback provider + model and save.

## 4) Firestore docs used

- `app_config/ai_routing`
  - `activeProvider`, `activeModel`, `fallbackProvider`, `fallbackModel`
  - `temperature`, `maxTokens`, `enabled`, `systemPromptTemplate`
  - `updatedAt`, `updatedBy`
- `app_config/provider_keys`
  - `openaiKeyCiphertext`, `anthropicKeyCiphertext`
  - `openaiVersion`, `anthropicVersion`
  - `openaiUpdatedAt`, `anthropicUpdatedAt`
  - `updatedAt`, `updatedBy`
- `content_emergency_numbers/{key}`
  - `value`, `updatedAt`, `updatedBy`
  - Keys: `suicideHelpline`, `policeEmergency`, `ambulanceNumber`,
    `childHelpline`, `womenGbvHelpline`, `psychosocialHelpline`
- `content_tools/{id}`
  - Tool definition record + `order`, `updatedAt`, `updatedBy`
- `content_therapist_subscriptions/{id}`
  - Subscription record + `order`, `updatedAt`, `updatedBy`
- `content_legal/terms`
  - `title`, `body`, `updatedAt`, `updatedBy`
- `content_legal/privacy`
  - `title`, `body`, `updatedAt`, `updatedBy`
- `ai_request_logs/{requestId}` (set TTL on `expireAt`)
- `admin_auth/root_admin`
- `admin_audit_logs/{id}`

Notes:
- Firestore only shows collections that already contain at least one document.
- Rules deployment does not create documents.
- `content_tools` and `content_therapist_subscriptions` keep a `_meta` doc so the collections stay visible even when there are no active items.

## 5) Deploy Firestore rules

This repo now includes `firestore.rules` and `firestore.indexes.json`.

Deploy them before testing nickname/forum flows:

```bash
firebase use dev
firebase deploy --only firestore:rules,firestore:indexes
```

If you cannot use CLI, paste `firestore.rules` into Firebase Console:
Firestore Database -> Rules.

## 6) Backfill/create content collections

Run this once after deploying rules (or after clearing Firestore) to copy legacy content into the new per-type collections and create visibility docs:

```bash
cd admin-web
GCP_PROJECT_ID=your-firebase-project-id \
GOOGLE_APPLICATION_CREDENTIALS=/abs/path/to/service-account.json \
npm run migrate:content -- 'setup:migration'
```

You can preview without writing:

```bash
npm run migrate:content -- --dry-run
```

## 7) Ensure full Firestore structure

This command ensures all admin/mobile datasets exist with safe bootstrap docs (including users, doctors, appointments, forum, mood, router/prompts, keys, health logs, and audit log):

```bash
cd admin-web
GCP_PROJECT_ID=your-firebase-project-id \
GOOGLE_APPLICATION_CREDENTIALS=/abs/path/to/service-account.json \
npm run ensure:firestore -- 'setup:ensure-structure'
```

## 8) Flutter app gateway config

Run app with gateway URL:

```bash
flutter run --dart-define=AI_GATEWAY_BASE_URL=http://localhost:3000
```

For Android emulator, use:

```bash
flutter run --dart-define=AI_GATEWAY_BASE_URL=http://10.0.2.2:3000
```

For physical device, use your machine LAN IP:

```bash
flutter run --dart-define=AI_GATEWAY_BASE_URL=http://<your-lan-ip>:3000
```

## 9) Important security notes

- Never put provider keys in Flutter code or `.env` shipped to clients.
- Keep `ADMIN_KEYS_ENCRYPTION_SECRET` only on server runtime.
- Restrict Firestore rules so clients cannot read admin collections/docs.
- Rotate provider keys from dashboard when needed.
