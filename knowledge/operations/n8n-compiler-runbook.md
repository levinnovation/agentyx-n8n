# n8n Compiler Runbook

> Operational procedures for the `n8n-yaml-compiler` service.

## Service Identity

- **Name**: `n8n-yaml-compiler`
- **Repository**: `services/n8n-yaml-compiler/`
- **Runtime**: Node.js 20 + Express, TypeORM, direct Postgres
- **Health endpoint**: `GET /healthz`
- **Port**: `3000` (default)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | HTTP port (default 3000) |
| `N8N_API_URL` | Yes | Base URL of target n8n instance |
| `N8N_API_KEY` | Yes | n8n API key for REST calls |
| `N8N_ENCRYPTION_KEY` | Yes | Must match n8n instance encryption key |
| `DB_HOST` | Yes | Postgres host (n8n system DB) |
| `DB_PORT` | No | Postgres port (default 5432) |
| `DB_USER` | Yes | Postgres user |
| `DB_PASSWORD` | Yes | Postgres password |
| `DB_DATABASE` | Yes | Database name (usually `railway`) |
| `DB_SCHEMA` | Yes | n8n schema (usually `n8n`) |
| `AUDIT_SCHEMA` | No | Audit schema (default `agentyx_audit`) |
| `COMPILER_TOKEN` | Yes | Bearer token for CLI/auth-proxy access |
| `N8N_VERSION` | Yes | Pinned n8n version string (e.g. `1.84.0`) |

## Startup Checklist

1. Verify `N8N_ENCRYPTION_KEY` matches the n8n-main/worker/webhook env var.
2. Verify TypeORM entities load without schema mismatch errors.
3. Verify `agentyx_audit.n8n_change_log` table exists (auto-created on first start if missing).
4. Check `GET /healthz` returns `200` with `n8nVersion` and `auditConnected`.

## Common Operations

### Check compiler health
```bash
curl -s http://n8n-yaml-compiler.railway.internal:3000/healthz | jq .
```

### Deploy a single tenant asset
```bash
curl -X POST http://n8n-yaml-compiler.railway.internal:3000/deploy \
  -H "Authorization: Bearer $COMPILER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant": "levinnovation",
    "assets": ["customer-service-core"],
    "commitHash": "abc123",
    "author": "Dev <dev@levinnovation.com>",
    "agentSkill": "n8n-deploy",
    "cliVersion": "1.0.0"
  }'
```

### Diff repo vs live
```bash
curl -X POST http://n8n-yaml-compiler.railway.internal:3000/diff \
  -H "Authorization: Bearer $COMPILER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tenant": "levinnovation"}'
```

### Query audit log
```bash
curl -X GET "http://n8n-yaml-compiler.railway.internal:3000/audit?tenant=levinnovation&limit=20" \
  -H "Authorization: Bearer $COMPILER_TOKEN"
```

## Troubleshooting

### Schema mismatch on startup
If TypeORM reports missing columns, the n8n instance may have been upgraded past the pinned version. **Do not proceed.** Pin the compiler's `N8N_VERSION` to match the live n8n image, or upgrade both in lockstep.

### Encryption errors on credential deploy
`N8N_ENCRYPTION_KEY` does not match the n8n instance. Verify the key is identical across `n8n-main`, `n8n-worker`, `n8n-webhook`, and `n8n-yaml-compiler`.

### Audit table missing
The service auto-creates the audit schema and table on first connection. If it fails, check Postgres permissions for the compiler DB user.

### Deployment receipt shows `failed`
Check the `error_message` column in `agentyx_audit.n8n_change_log`. Common causes:
- n8n API unreachable (network / auth-proxy issue)
- Workflow JSON rejected by n8n API (sanitize error)
- Postgres deadlock during concurrent credential inserts

## Rollback

To roll back a workflow to a previous commit:

1. Check out the target commit in the repo.
2. Run `agentyx n8n deploy --tenant <t> --env <e>`.
3. The audit log will record a new `UPDATE` entry with `rollback_hash` pointing to the previous state.

## Monitoring

- **Health**: `GET /healthz`
- **Metrics**: Structured JSON logs to stdout (`level`, `msg`, `correlationId`, `tenant`, `action`).
- **Alerts**: Failed deployment rate > 5% in 10 minutes.

## References

- ADR-0035: `knowledge/decisions/0035-n8n-sdk-and-deterministic-sdlc.md`
- n8n SDK setup: `knowledge/operations/n8n-sdk-setup.md`
- Migration playbook: `knowledge/operations/n8n-migration-playbook.md`
