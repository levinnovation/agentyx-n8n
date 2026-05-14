# ADR-0031: Tenant Email Template Delivery and Intercept Branch

## Status
Accepted

## Date
2026-05-13

## Context
LEV Innovation email automation was sending AI-generated markdown as plain text when routed through Composio Gmail tools. We implemented a tenant-scoped template system in the portal and wired n8n flows to fetch template context, but only Method A (prompt enforcement) was active.

We needed a governed fallback path that can be turned on without rewriting the flows:

- Method A: prompt-enforced HTML generation by the agent.
- Method B: workflow-level interception that composes final HTML before tool execution.

## Decision
Adopt dual-path template delivery for tenant `levinnovation` with a runtime feature flag:

1. Keep Method A as default behavior in both `customer-service-core` and `personal-assistant-core`.
2. Add Method B branch behind `USE_TEMPLATE_INTERCEPT` in both flows:
   - `Template Intercept Enabled?` (IF)
   - `Apply Template Intercept` (Code)
   - `Skip Template Intercept` (Code)
3. Keep the existing portal template API (`/api/public/templates/email`) as the single source for tenant email HTML shell and brand fields.

## Consequences

### Positive
- Adds a rollback-safe execution mode without replacing current prompt behavior.
- Allows operations to force deterministic HTML envelope behavior using env configuration.
- Keeps template ownership and branding in the portal instead of in workflow-local literals.

### Negative
- Introduces additional workflow complexity and branch maintenance overhead.
- Method B currently injects fallback HTML from available message context when explicit markdown output is absent.

## Rejected alternatives
- Hard switch to Method B only: rejected because Method A is already live and lower-friction for normal operation.
- Duplicating tenant template in n8n static nodes: rejected due to drift risk and governance mismatch.

## Follow-up
- Add execution telemetry field standardization for `template_intercept_applied`.
- Add a tenant runbook section for when to toggle `USE_TEMPLATE_INTERCEPT=true`.
