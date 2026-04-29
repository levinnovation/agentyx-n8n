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

## Import order

1. `kapso-inbound-quotation.json` — Main inbound webhook flow
2. `kb-ingest.json` — Knowledge base sync trigger
3. `human-handoff.json` — Human escalation flow
4. `quote-document-generation.json` — PDF generation and delivery

After editing in n8n, export JSON and update the matching file here, then open a PR.

## Webhook base URL

With IP bootstrap, webhooks are under:

`http://187.127.252.161/` + n8n webhook path (see each workflow’s Webhook node).

When you move to HTTPS + domain, update **both** the VPS `.env` (`WEBHOOK_URL`, `N8N_EDITOR_BASE_URL`, `N8N_PROTOCOL`, `N8N_SECURE_COOKIE`) and any external systems (e.g. Kapso) that call n8n.

## Credential setup

All workflows reference environment variables only. Set these **in the n8n instance** (UI or n8n env), not in Git:

- `KAPSO_API_KEY`
- `KAPSO_BASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AGENT_BASE_URL` (for `/agent/invoke`)
- `SLACK_WEBHOOK_URL`

## Notes

- Do not commit credentials to Git.
- These are starter scaffolds; customize nodes as needed.
- Replace placeholder URLs inside JSON scaffolds (e.g. `https://your-runtime.com/...`) with `AGENT_BASE_URL` or your real agent endpoint as you wire nodes.
