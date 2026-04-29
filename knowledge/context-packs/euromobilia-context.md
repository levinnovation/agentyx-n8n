# Euromobilia context pack

**Tenant:** `euromobilia`  
**Primary domain:** `kitchen-commerce`

## Capabilities (current examples)

- `kitchen-quotation`
- `human-handoff`
- `product-catalog-retrieval`
- `quote-document-generation`

## Where to look

- Tenant overview: `tenants/euromobilia/README.md`
- Domain: `tenants/euromobilia/domains/kitchen-commerce/`
- Assets: `tenants/euromobilia/assets/` (typed folders: `agents/`, `workflows/`, etc.)

## Interfaces (channels) vs core assets

**Architecture:** capabilities and agents are **not** tied to a single messaging product. **Kapso WhatsApp** (`whatsapp-kapso`) is the **first** channel asset wired for kitchen quotation; the same capability may later attach **Slack**, **Microsoft Teams**, **web widget**, **web chat**, **Telegram**, or other surfaces—each as its own channel/workflow asset with contracts.

See **ADR-0007** (`knowledge/decisions/0007-multi-interface-deployment-for-tenant-assets.md`).

## Tenant-specific knowledge

- `knowledge/tenants/euromobilia/domain-decisions.md`
- `knowledge/tenants/euromobilia/capability-decisions.md`
- `knowledge/tenants/euromobilia/migration-notes.md`

## Example asset IDs

- LangGraph agent asset: `quotation-assistant`
- n8n workflow asset: `kapso-inbound-quotation`
