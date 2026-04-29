# n8n Workflows

n8n workflow assets for Euromobilia.

## Workflows

- `kapso-inbound-quotation.json` — Main WhatsApp inbound flow
- `kb-ingest.json` — Knowledge base / catalog ingestion
- `human-handoff.json` — Human escalation notifications

## Import/Export

```bash
make compile-n8n TENANT=euromobilia DOMAIN=kitchen-commerce CAPABILITY=kitchen-quotation ASSET=kapso-inbound-quotation
```
