# n8n queue-mode runbook

## Purpose

Operational runbook for Railway deployments using:

- `n8n-main`,
- `n8n-worker`,
- `n8n-webhook`,
- `redis`.

## Baseline configuration

- `EXECUTIONS_MODE=queue` on all n8n roles.
- Shared `N8N_ENCRYPTION_KEY` on all n8n roles.
- Runtime parity invariant: `n8n-main`, `n8n-worker`, and `n8n-webhook` must use the same n8n runtime source/version.
  - Canonical image policy: `ghcr.io/levinnovation/agentyx-vertical-assets/agentyx-n8n:latest` on all three.
- Shared Postgres (`DB_POSTGRESDB_*`) and schema `n8n`.
- Shared Redis queue vars:
  - `QUEUE_BULL_REDIS_HOST`,
  - `QUEUE_BULL_REDIS_PORT`,
  - `QUEUE_BULL_REDIS_PASSWORD`,
  - `QUEUE_BULL_REDIS_DB`.
- `auth-proxy` n8n split routing:
  - UI/API -> `N8N_INTERNAL_URL` (`n8n-main`),
  - webhook/form/oauth callback paths -> `N8N_WEBHOOK_INTERNAL_URL` (`n8n-webhook`).

## Scaling guidance

### Workers

- Scale `n8n-worker` replicas first when queue backlog increases.
- Increase `N8N_CONCURRENCY_PRODUCTION_LIMIT` only after observing CPU/memory behavior.

### Webhook processors

- Scale `n8n-webhook` replicas when webhook throughput or burstiness grows.
- Keep at least 2 replicas for restart tolerance.

### Main

- Keep `n8n-main` single replica in Community Edition.

## Maintenance procedures

### Validate runtime parity

Run before/after any deploy that touches n8n:

```bash
python3 scripts/railway/check-n8n-runtime-parity.py --enforce-image
```

This command fails if any queue role drifts away from the shared runtime.

### One-command remediation (demo stack)

If parity drifts in `client-demo-agentyx`, re-apply the same n8n image to all queue roles:

```bash
N8N_RUNTIME_IMAGE=ghcr.io/levinnovation/agentyx-vertical-assets/agentyx-n8n:latest \
bash scripts/railway/replicate-reference-to-scratch.sh
```

Then validate again:

```bash
python3 scripts/railway/check-n8n-runtime-parity.py --enforce-image
```

### Rotate `N8N_ENCRYPTION_KEY`

1. Generate a new key.
2. Apply the same value to `n8n-main`, `n8n-worker`, and `n8n-webhook`.
3. Redeploy all n8n roles in close succession.
4. Verify credential access from n8n UI and execute a smoke workflow.

### Drain a worker safely

1. Temporarily scale up remaining workers by +1.
2. Redeploy or scale down one target worker replica.
3. Confirm queue depth stabilizes and no stuck executions are accumulating.

## Incident troubleshooting

### Symptom: Executions remain queued

Check:

- `n8n-worker` replicas are >0.
- Redis connectivity vars match across all n8n roles.
- Redis password matches service `REDIS_PASSWORD`.
- Worker logs show successful queue subscription.

### Symptom: Webhooks fail during main redeploy

Check:

- `auth-proxy` has `N8N_WEBHOOK_INTERNAL_URL` set.
- Caddy template includes path-based webhook `handle`.
- `n8n-webhook` replicas are healthy and reachable internally.

### Symptom: Credentials fail to decrypt

Check:

- `N8N_ENCRYPTION_KEY` equality across main/worker/webhook.
- No stale deployment still running with an older key.

## Minimal smoke test set

1. Trigger webhook-based workflow (`personal-assistant` chat trigger).
2. Trigger schedule/manual workflow (`agente-prospectador-ai`).
3. Redeploy `n8n-main` while webhooks are active and confirm webhook success continuity.
4. Execute a workflow that uses MCP Client Tool / LangGraph-related nodes and verify it succeeds from queue execution path (worker) and webhook path.
