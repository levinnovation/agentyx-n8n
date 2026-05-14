# LEV Innovation context pack

**Tenant:** `levinnovation`  
**Primary domains:** `customer-service`, `sales`, `sales-prospecting`

## Capability map

- `customer-service/lead-qualification-and-scheduling`
- `sales/crm-management`
- `sales-prospecting/linkedin-lead-prospecting`

## Where to look first

- Tenant overview: `tenants/levinnovation/README.md`
- Tenant spec: `tenants/levinnovation/tenant.yaml`
- Domains:
  - `tenants/levinnovation/domains/customer-service/`
  - `tenants/levinnovation/domains/sales/`
  - `tenants/levinnovation/domains/sales-prospecting/`
- Workflow assets: `tenants/levinnovation/assets/workflows/n8n/`
- Prompt assets: `tenants/levinnovation/assets/prompts/`
- Product catalog fallback: `tenants/levinnovation/assets/data/product-catalog/`

## Runtime and integration highlights

- Tenant Railway source of truth: `tenants/levinnovation/assets/deploy/railway/`
- n8n runtime split into queue-mode services (`n8n-main`, `n8n-worker`, `n8n-webhook`, `redis`) as part of tenant stack operation.
- Customer-service channel adapters currently include Kapso WhatsApp, Telegram, and Meta comments.
- CRM orchestration uses Twenty sub-workflows (`read-context`, `write-actions`, update interactions).
- MCP-facing integration contracts are tracked under `tenants/levinnovation/assets/integrations/composio-mcp/`.

## Customer-service RAG and document ingestion highlights

- Hybrid retrieval and KB rebuild decisions: `knowledge/decisions/0029-customer-service-rag-rebuild.md`
- Portal ingestion decision: `knowledge/decisions/0030-portal-document-ingestion.md`
- Operating runbook: `knowledge/operations/customer-service-rag-runbook.md`

Recent critical lessons:
- Keep channel adapters pointing to the active customer-service core workflow ID.
- Ensure tenant slug consistency during document ingestion/reprocess/delete flows.
- Remove malformed HTML-like document ingestions before re-indexing clean content.

## Tenant-specific knowledge references

- `knowledge/tenants/levinnovation/domain-decisions.md`
- `knowledge/tenants/levinnovation/capability-decisions.md`
- `knowledge/change-log/2026-05-11-customer-service-agent.md`
- `knowledge/change-log/2026-05-12-customer-service-rag-rebuild.md`
- `knowledge/change-log/2026-05-12-customer-service-mcp-router-rollout.md`

