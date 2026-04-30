---
id: ADR-0010
title: WhatsApp Interactive Intake Forms
status: accepted
date: 2026-04-30
authors:
  - ai-team@euromobilia.com
deciders:
  - ai-team@euromobilia.com
---

# ADR-0010: WhatsApp Interactive Intake Forms

## Context

The Euromobilia kitchen-quotation capability receives WhatsApp messages via Kapso. The current flow passes all messages directly to a LangGraph agent, which responds with free-text AI-generated replies. While this works for open-ended conversations, it is suboptimal for structured data collection (quotation intake, service requests, general inquiries) because:

- Users must type free text for structured fields (budget, timeline, appliance list)
- No guardrails prevent missing or invalid data
- The agent has no awareness of pre-collected structured preferences

## Decision

Build an **opt-in, template-driven intake form layer** using WhatsApp interactive messages (buttons and lists). The state machine lives in n8n; the agent receives enriched context only after intake completion.

## Consequences

### State Machine in n8n (not in the agent)

**Why n8n:**
- n8n persists execution state via Supabase (our existing DB)
- n8n can send HTTP requests to Kapso's Meta API without code deployment cycles
- The agent remains a pure AI inference service; no business logic changes required

**Why not in the agent:**
- LangGraph's state is per-invocation;跨-message state would require custom memory
- Changing agent code requires Docker rebuild + redeploy; n8n workflows update via API import
- The agent's role is NLU + tool use, not form orchestration

### Supabase for State (not Redis, not n8n staticData)

**Why Supabase:**
- Already the source of truth for conversations, messages, products, prices
- No new infrastructure to provision
- RLS-ready; service_role access from n8n
- 24-hour expiry handled via `expires_at` column + query filter

**Why not Redis:**
- Would require adding Redis to the Hostinger VPS
- Adds operational complexity for MVP

**Why not n8n staticData:**
- Not designed for multi-user concurrent state
- No TTL / expiry mechanism
- Difficult to inspect and debug

### Opt-in Routing (not Mandatory)

Users can still type free text at any time. If free text arrives during an active intake session, the session is cancelled and the message is forwarded to the agent. This preserves the existing user experience while adding the optional structured path.

Trigger keywords (`hola`, `cotizar`, `menu`, `/start`) send the welcome list. All other free text goes directly to the agent.

### Multi-Template from Day One

Three templates are seeded:
1. `kitchen-quotation` — full kitchen quotation intake
2. `servicio-tecnico` — technical service request
3. `consulta-general` — general inquiry

Templates live in `intake_templates.definition` (JSONB). Adding a new template requires only a seed SQL insert; no code changes.

### WhatsApp Interactive Constraints

- **Buttons:** max 3 per message. Budget range (5 options) uses `list`, not `button`.
- **Lists:** single-select only. Multi-select (e.g., appliances) uses a repeat pattern with a follow-up "Add another?" button.
- **WhatsApp Flows API** (true multi-select, richer forms) is out of MVP scope.

### Agent Enrichment

When intake completes, n8n calls `/agent/invoke` with:
```json
{
  "intake_data": { "project_type": "new", "budget_range": "25k_50k", ... },
  "template_slug": "kitchen-quotation"
}
```

The agent prepends a context block built from `intake_context.md` before invoking the graph. Backward compatible: calls without `intake_data` behave exactly as before.

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Build intake in the agent (LangGraph state) | Would couple form logic to AI inference; harder to iterate |
| Use n8n native Form Trigger | Requires public web URLs; WhatsApp users stay in-chat |
| Use WhatsApp Flows API | Requires Meta Business verification; not available via Kapso proxy in MVP |
| Use Airtable / Google Forms for intake | Breaks the in-chat experience; users leave WhatsApp |

## Related Decisions

- ADR-0008 (Migrate AUREA to Euromobilia) — establishes the tenant/domain/capability model
- ADR-0009 (Self-hosted n8n CE) — runtime for the state machine

## Links

- Workflow: `tenants/euromobilia/assets/workflows/n8n/kapso-intake-quotation.json`
- Migration: `tenants/euromobilia/assets/infra/supabase/migrations/0004_intake_sessions_and_templates.sql`
- Agent prompt: `tenants/euromobilia/assets/agents/quotation-assistant/app/prompts/intake_context.md`
