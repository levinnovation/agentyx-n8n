# n8n Workflows

n8n workflow assets for Euromobilia. Workflows orchestrate **ingress and routing**; they are not the architectural root. Multiple customer interfaces can each have workflows (or shared branches) that normalize traffic before calling the same LangGraph agent (ADR-0007).

## Workflows

- `kapso-inbound-quotation.json` — Inbound flow for the **Kapso WhatsApp** channel asset (first example surface)
- `kb-ingest.json` — Knowledge base / catalog ingestion
- `human-handoff.json` — Human escalation notifications

## Import/Export

```bash
make compile-n8n TENANT=euromobilia DOMAIN=kitchen-commerce CAPABILITY=kitchen-quotation ASSET=kapso-inbound-quotation
```
