# LEV Innovation Railway deployment

This directory is the tenant-specific source of truth for Railway runtime assets.

## n8n cluster topology

- `n8n-main` (1 replica): UI/API/scheduler.
- `n8n-worker` (3 replicas): execution workers.
- `n8n-webhook` (2 replicas): webhook ingress.
- `redis`: Bull queue backend.

Ingress remains `levinnovation.n8n.agentyx.one` behind `auth-proxy`, with path-based routing:

- UI/API -> `n8n-main` (forward-auth protected)
- webhook/form/oauth callbacks -> `n8n-webhook` (no forward-auth)
