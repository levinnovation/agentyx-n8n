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
| `kapso-inbound-quotation` | **Active** | `POST http://187.127.252.161/webhook/kapso-inbound` | Receives Kapso WhatsApp messages, normalizes payload, calls agent, sends reply |
| `quote-document-generation` | **Active** | `POST http://187.127.252.161/webhook/quote-document-generation` | Receives quote JSON, generates PDF via Supabase function, sends via Kapso |
| `kb-ingest` | **Active** | (schedule trigger) | Daily sync of knowledge base via agent invoke |
| `human-handoff` | **Inactive** | `POST http://187.127.252.161/webhook/euromobilia-handoff` | Receives handoff trigger, notifies Slack. **Activate manually in n8n UI after setting SLACK_WEBHOOK_URL.** |

## Environment Variables

Set these in `/opt/n8n/.env` and restart n8n:

```bash
KAPSO_API_KEY=...
KAPSO_BASE_URL=https://api.kapso.io
SUPABASE_URL=https://ujqogkcllqcwtefqimba.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
AGENT_BASE_URL=http://localhost:8000   # UPDATE when agent is deployed
```

## Kapso Webhook Configuration

In Kapso dashboard, set the inbound webhook URL to:

```
http://187.127.252.161/webhook/kapso-inbound
```

## Notes

- Do not commit credentials to Git.
- `AGENT_BASE_URL` must be updated when the quotation-assistant is deployed to Render or another host.
- The human-handoff workflow requires `SLACK_WEBHOOK_URL` to be set before activation.
