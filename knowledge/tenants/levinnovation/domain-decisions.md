# LEV Innovation - domain decisions

## sales-prospecting

**Intent:** Bounded context for deterministic outbound execution and lead
operations.

**Notes:**

- Domain YAML: `tenants/levinnovation/domains/sales-prospecting/domain.yaml`
- Initial capability: `linkedin-lead-prospecting`
- Design favors auditable workflow branching over autonomous agent routing.

## customer-service

**Notes:**

- Tenant email output now uses portal-hosted template assets to avoid markdown-as-plain-text delivery in Gmail/Outlook.
- `customer-service-core` supports dual strategy: Method A prompt enforcement and optional Method B interception via `USE_TEMPLATE_INTERCEPT` flag.

## internal-operations

**Intent:** Bounded context for internal LEV Innovation operations workflows,
including meeting capture, minutes, follow-ups, and back-office coordination.

**Notes:**

- Domain YAML: `tenants/levinnovation/domains/internal-operations/domain.yaml`
- Initial capability: `meeting-minutes-and-followups`
- `meetings-agent-core` uses multiple n8n AI Agent nodes to separate intake, extraction, artifact composition, and MCP side effects.

