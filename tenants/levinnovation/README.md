# LEV Innovation

Internal tenant for LEV Innovation commercial automation and customer-facing agent operations.

## Domains

- `customer-service/` - inbound customer engagement, qualification, routing, scheduling, CRM enrichment
- `sales/` - CRM management and sales operations
- `sales-prospecting/` - outbound prospecting and enrichment workflows

## Capabilities

- `customer-service/lead-qualification-and-scheduling`
- `sales/crm-management`
- `sales-prospecting/linkedin-lead-prospecting`

## Key Assets

### Customer Service Stack

- `assets/workflows/n8n/customer-service-core/` - customer-service AI core workflow
- `assets/workflows/n8n/customer-service-kb-search/` - KB search webhook (Postgres/pgvector hybrid retrieval)
- `assets/workflows/n8n/customer-service-kb-sync/` - KB ingestion/sync workflow
- `assets/workflows/n8n/customer-service-router/` - action vs FAQ route orchestration
- `assets/workflows/n8n/customer-service-action-core/` - action-focused delegated core
- `assets/workflows/n8n/customer-service-faq-rag-core/` - FAQ/RAG delegated core
- `assets/workflows/n8n/chan-kapso-wa-customer-service/` - Kapso WhatsApp adapter
- `assets/workflows/n8n/chan-telegram-customer-service/` - Telegram adapter
- `assets/workflows/n8n/chan-meta-comments-customer-service/` - Meta comments adapter
- `assets/workflows/n8n/chan-twenty-webhook-customer-service/` - Twenty webhook adapter
- `assets/workflows/n8n/twenty-crm-read-context/` - CRM read subflow
- `assets/workflows/n8n/twenty-crm-write-actions/` - CRM write subflow
- `assets/workflows/n8n/twenty-crm-on-update-interactions/` - CRM interaction/update subflow
- `assets/prompts/agente-prospectador.system.md` - actively used prompt asset for Levi-family behavior constraints
- `assets/data/product-catalog/` - static product catalog fallback source

### Sales Prospecting

- `assets/workflows/n8n/agente-prospectador-ai.json` - deterministic prospecting workflow
- `assets/prompts/agente-prospectador.system.md` - qualification/outreach policy prompt
- `assets/data/lev-innovation-knowledge.md` - prospecting seed knowledge

### CRM / Sales Operations

- `domains/sales/capabilities/crm-management/assets/twenty-crm/` - Twenty CRM capability asset docs/contracts

### Deployment / Runtime Assets

- `assets/deploy/railway/` - tenant runtime stack contracts and service descriptors
- `assets/integrations/composio-mcp/` - MCP integration surface for external actions/tools

## Operational Notes

- Customer-service KB now depends on tenant-scoped document ingestion and retrieval consistency.
- Workflow IDs and adapter-to-core wiring must remain aligned in n8n runtime (avoid stale core IDs in channel adapters).
- See tenant-specific operating records in `knowledge/tenants/levinnovation/` and runbooks in `knowledge/operations/`.
