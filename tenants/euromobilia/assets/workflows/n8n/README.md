# n8n Workflows

**Runtime (Euromobilia / kitchen-quotation):** self-hosted n8n Community Edition on Hostinger.

| Bootstrap URL | Notes |
|----------------|--------|
| `http://187.127.252.161/` | HTTP on port **80** (Caddy → n8n). **Bootstrap only** — add DNS + TLS before production. |

Deployment asset (Compose, `.env.example`, runbook): `tenants/euromobilia/assets/deploy/n8n-hostinger/`.

**Hostname (non-URL):** `srv1616787.hstgr.cloud` — useful for Hostinger panel / DNS; webhook base URL should match what you configure in n8n (`WEBHOOK_URL` / `N8N_EDITOR_BASE_URL`).

## Source of truth

- Workflow JSON in **this directory** is authoritative.
- n8n CE does **not** replace Git for workflow history (no built-in Git source control in CE). Import changes back into the repo via PR.

## Active Workflows

| Workflow | Status | Webhook URL | Description |
|----------|--------|-------------|-------------|
| `kapso-intake-quotation` | **Active** | `POST http://187.127.252.161/webhook/kapso-inbound` | **Intake router.** Receives Kapso messages, runs state-machine intake forms via WhatsApp interactive buttons/lists, forwards to agent with enriched context on completion. |
| `kapso-inbound-quotation` | **Inactive** | `POST http://187.127.252.161/webhook/kapso-inbound` | Legacy passthrough to agent. Deactivated; kept for rollback. |
| `quote-document-generation` | **Active** | `POST http://187.127.252.161/webhook/quote-document-generation` | Receives quote JSON, generates PDF via Supabase function, sends via Kapso |
| `kb-ingest` | **Active** | (schedule trigger) | Daily sync of knowledge base via agent invoke |
| `human-handoff` | **Inactive** | `POST http://187.127.252.161/webhook/euromobilia-handoff` | Receives handoff trigger, notifies admin via WhatsApp. **Activate manually in n8n UI after verifying ADMIN_PHONE_NUMBER.** |

## Environment Variables

Set these in `/opt/n8n/.env` and restart n8n:

```bash
# Kapso (Meta WhatsApp API v24.0)
KAPSO_API_KEY=...
KAPSO_BASE_URL=https://api.kapso.ai/meta/whatsapp/v24.0
KAPSO_PHONE_NUMBER_ID=977335052138446

# Supabase
SUPABASE_URL=https://ujqogkcllqcwtefqimba.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...

# Agent
AGENT_BASE_URL=http://localhost:8000   # UPDATE when agent is deployed

# Admin notifications
ADMIN_PHONE_NUMBER=+50672249451

# Legacy (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

## Kapso Webhook Configuration

In Kapso dashboard, set the inbound webhook URL to:

```
http://187.127.252.161/webhook/kapso-inbound
```

## Intake Form Flow

1. User sends `hola`, `cotizar`, or `menu` → receives **welcome list** (Cotizar Cocina, Hablar libre, Hablar con humano)
2. User taps **Cotizar Cocina** → intake session created in Supabase
3. Step-by-step interactive questions: project type → budget → appliances → style → timeline → contact method → summary
4. User taps **Confirmar** → session marked complete, admin notified, agent invoked with `intake_data`
5. Agent generates contextual quotation based on structured preferences

Free text at any time cancels the active intake and forwards to the agent directly.

## Notes

- Do not commit credentials to Git.
- `AGENT_BASE_URL` must be updated when the quotation-assistant is deployed to Render or another host.
- The human-handoff workflow requires `ADMIN_PHONE_NUMBER` to be set before activation.
- Only one workflow can own the `kapso-inbound` webhook path. To rollback to legacy, deactivate `kapso-intake-quotation` and reactivate `kapso-inbound-quotation`.
