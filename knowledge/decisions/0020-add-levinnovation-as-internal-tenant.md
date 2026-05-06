# ADR-0020: Add `levinnovation` as Internal Tenant for Sales Prospecting

**Status:** Accepted  
**Date:** 2026-05-06

## Context

The repository already uses tenant-centric architecture, but LEV Innovation's
own outbound process was not modeled as a first-class tenant. This caused
internal GTM automation experiments to live outside the same standards applied
to client tenants.

We need an internal tenant that:

1. Dogfoods the same tenant -> domain -> capability -> assets model.
2. Stores deterministic sales prospecting workflows as versioned assets.
3. Integrates lead sourcing, AI qualification, CRM updates, and scheduling in a
   reproducible pipeline.

## Decision

1. Create tenant `levinnovation` under `tenants/levinnovation/`.
2. Create domain `sales-prospecting` with capability
   `linkedin-lead-prospecting`.
3. Implement deterministic n8n workflow `agente-prospectador-ai` under
   `tenants/levinnovation/assets/workflows/n8n/`.
4. Use the following technology choices for v1:
   - LinkedIn source: RapidAPI endpoint configured by env vars.
   - LLM: OpenRouter Chat Completions via `OPENROUTER_API_KEY`.
   - CRM: HubSpot contacts/tasks/deal metadata.
   - Scheduling context: Google Calendar slot proposal.
   - Knowledge context: n8n Simple Vector Store (in-memory).
   - Notifications: Slack webhook to `#levinnovation`.
5. Keep LinkedIn DM as human-in-the-loop execution in v1 (generate copy +
   HubSpot task), because chosen RapidAPI source is read-only.

## Consequences

### Positive

- Internal operations now follow the same governance and traceability as client
  tenants.
- Workflow is deterministic and easier to audit than fully agentic orchestration.
- Lead lifecycle is unified across sourcing, qualification, CRM update, and
  outreach handoff.

### Negative

- Simple Vector Store is ephemeral and not suitable for larger long-term memory.
- RapidAPI provider stability and schema may vary across vendors.
- LinkedIn DM remains semi-manual until a writable provider is adopted.

## Rejected alternatives

- Keep LEV internal automation outside tenant model - rejected due to governance
  drift.
- Use n8n AI Agent node as orchestration root - rejected for lower
  determinism/auditability.
- Start with external vector DB immediately - rejected for unnecessary v1
  complexity.

## Follow-up

- Add phase-2 workflow for inbound email reply handling and automatic event
  creation in Google Calendar.
- Evaluate migration from in-memory vector store to Supabase pgvector.
- Evaluate Unipile/PhantomBuster if direct LinkedIn DM automation is required.
