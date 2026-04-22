# Admin Ops Runbook

Operational guardrails for `admin-web` after deploy.

## 1) Required GitHub Secrets

Set these in `Settings -> Secrets and variables -> Actions -> Secrets`.

- `GCP_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `ADMIN_SMOKE_USERNAME`
- `ADMIN_SMOKE_PASSWORD`

Optional:

- `ADMIN_FAILURE_ALERT_WEBHOOK_URL`

Notes:

- `ADMIN_SMOKE_USERNAME` and `ADMIN_SMOKE_PASSWORD` can be any dedicated admin account you control.
- `FIREBASE_SERVICE_ACCOUNT_JSON` must be the full JSON key (same Firebase project as `GCP_PROJECT_ID`).
- For automation, prefer GitHub Secrets/Variables over committing env values.

## 2) Optional GitHub Variables

Set these in `Settings -> Secrets and variables -> Actions -> Variables`.

- `API_FAILURE_ALERT_WINDOW_MINUTES` (default `15`)
- `API_FAILURE_ALERT_THRESHOLD` (per-action threshold, default `3`)
- `API_FAILURE_ALERT_TOTAL_THRESHOLD` (all actions combined, default `5`)

## 3) Post-Deploy Smoke Check

Workflow: `.github/workflows/post-deploy-smoke.yml`

Manual run:

1. Open `Actions -> Post-Deploy Smoke -> Run workflow`
2. Input `admin_base_url` as your deployed admin URL.
3. Keep `skip_firestore=false` unless you intentionally want HTTP-only checks.

Checks performed:

- Admin login/CSRF flow
- `GET /api/users?scope=withProfile`
- `GET /api/forum/moderation`
- `GET /api/router`
- `GET /api/prompts`
- `GET /api/keys/rotate`
- Firestore structure/doc checks

The run fails (`exit 1`) if any check fails.

## 4) API Failure Threshold Alerts

Workflow: `.github/workflows/admin-api-failure-alerts.yml`

Trigger:

- Scheduled every 15 minutes
- Manual run via `workflow_dispatch`

Source:

- Reads `admin_audit_logs` and counts:
  - `ADMIN_USERS_API_FAILED`
  - `ADMIN_FORUM_MODERATION_API_FAILED`
  - `ADMIN_ROUTER_API_FAILED`
  - `ADMIN_PROMPTS_API_FAILED`
  - `ADMIN_KEYS_API_FAILED`

Failure policy:

- Workflow fails when any per-action threshold is reached or total threshold is reached.
- If `ADMIN_FAILURE_ALERT_WEBHOOK_URL` is configured, it posts a JSON alert payload.

## 5) Local Commands (Optional)

From `admin-web/` with `.env.local` loaded:

```bash
npm run smoke:prod
npm run alert:audit-failures -- --dry-run
```

If you run locally without `.env.local`, export required vars in your shell first.
