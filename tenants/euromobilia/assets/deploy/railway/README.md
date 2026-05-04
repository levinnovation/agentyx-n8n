# Euromobilia Railway Stack

Per-tenant Railway project for Euromobilia. Hosts postgres, n8n, librechat, paperclip, langfuse, agent, agentyx-portal, better-auth, auth-proxy, and optional flowise.

## Railway Projects

| Role | Project ID | URL | Current state |
|---|---|---|---|
| **REFERENCE** (armed, read-only target shape) | `7d70063b-f1b4-415f-b57a-627d24ba0225` | [railway.com/project/7d70063b-f1b4-415f-b57a-627d24ba0225](https://railway.com/project/7d70063b-f1b4-415f-b57a-627d24ba0225) | Armed by VP; shows desired tenant stack shape. We do **not** deploy into this project. |
| **SCRATCH** (workspace) | `2321232d-b384-45b3-8f0c-e608ddb688d1` | [railway.com/project/2321232d-b384-45b3-8f0c-e608ddb688d1](https://railway.com/project/2321232d-b384-45b3-8f0c-e608ddb688d1) | Empty except for one n8n image. All ADR-0013 → 0016 work iterates here. |

## GitHub Variables

- `EUROMOBILIA_RAILWAY_PROJECT_REFERENCE_ID = 7d70063b-f1b4-415f-b57a-627d24ba0225`
- `EUROMOBILIA_RAILWAY_PROJECT_SCRATCH_ID = 2321232d-b384-45b3-8f0c-e608ddb688d1`
- `EUROMOBILIA_RAILWAY_PROJECT_ID = 2321232d-b384-45b3-8f0c-e608ddb688d1` (alias, points at scratch during dev)

## Bootstrap

```bash
export RAILWAY_TOKEN=<token>
bash scripts/railway/bootstrap-tenant.sh --tenant euromobilia
```

## Deploy

```bash
bash scripts/railway/deploy-service.sh --tenant euromobilia --service <svc>
```

## Link scratch project locally

```bash
bash scripts/railway/link-scratch.sh
```

## Diff reference vs scratch

```bash
bash scripts/railway/diff-projects.sh
```
