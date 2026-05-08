# LEV Innovation context pack

**Tenant:** `levinnovation`  
**Primary domain:** `sales-prospecting`

## Capabilities

- `linkedin-lead-prospecting`

## Where to look

- Tenant overview: `tenants/levinnovation/README.md`
- Domain: `tenants/levinnovation/domains/sales-prospecting/`
- Capability: `tenants/levinnovation/domains/sales-prospecting/capabilities/linkedin-lead-prospecting/`
- Workflows: `tenants/levinnovation/assets/workflows/n8n/`
- Prompt: `tenants/levinnovation/assets/prompts/agente-prospectador.system.md`
- Knowledge seed: `tenants/levinnovation/assets/data/lev-innovation-knowledge.md`

## Workflow highlights

- Main workflow: `agente-prospectador-ai.json`
- Trigger: schedule (daily)
- External systems: RapidAPI (LinkedIn source), OpenRouter, HubSpot,
  Google Calendar, Gmail, Slack

## Deployment highlights

- Tenant Railway source of truth: `tenants/levinnovation/assets/deploy/railway/`
- n8n runs in queue mode cluster:
  - `n8n-main` (UI/API/scheduler),
  - `n8n-worker` (execution workers),
  - `n8n-webhook` (webhook ingress),
  - `redis` (Bull queue backend).
- Public entrypoint remains `levinnovation.n8n.agentyx.one` via `auth-proxy` path-based routing.

## Tenant-specific knowledge

- `knowledge/tenants/levinnovation/domain-decisions.md`
- `knowledge/tenants/levinnovation/capability-decisions.md`
- `knowledge/decisions/0025-n8n-queue-mode-cluster.md`
