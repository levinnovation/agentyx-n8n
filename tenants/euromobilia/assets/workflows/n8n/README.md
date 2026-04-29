# n8n Workflows

## Import Order

1. `kapso-inbound-quotation.json` — Main inbound webhook flow
2. `kb-ingest.json` — Knowledge base sync trigger
3. `human-handoff.json` — Human escalation flow
4. `quote-document-generation.json` — PDF generation and delivery

## Credential Setup

All workflows reference environment variables only. Set these in your n8n instance:

- `KAPSO_API_KEY`
- `KAPSO_BASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AGENT_BASE_URL` (for `/agent/invoke`)
- `SLACK_WEBHOOK_URL`

## Notes

- Do not commit credentials to Git.
- These are starter scaffolds; customize nodes as needed.
