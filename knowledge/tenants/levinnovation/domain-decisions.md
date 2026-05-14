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

