# Prompt Log: WhatsApp Interactive Intake Forms

**Tool:** cursor
**Date:** 2026-04-30
**Prompt ID:** 0006

## Original Prompt

> ok quiero ser capaz de usar whatsapp flows (kapso) para capturar datos en intake forms (and other types of general-use and specific-domain/biz/tenant use forms ) to enrich the quality of experience of our WA channels. so, how can i allow our agents and n8n workflows to populate WA interactive lists/buttons and ask questions that way instead of just raw free text like in this WA mobile thread here with Euromobilia Hogar ...

## Response Summary

Proposed a hybrid architecture:
- **n8n owns the state machine** (persists intake state in Supabase between messages)
- **Kapso Meta API v24.0** sends/receives interactive messages (buttons, lists)
- **Agent gets enriched context** after intake completion via `intake_data` field
- **Opt-in routing**: free text always reaches the agent; interactive replies enter the step engine

## Design Decisions Documented

1. **State machine in n8n, not the agent** — separation of concerns
2. **Supabase for persistence** — no new infra needed
3. **Opt-in, not mandatory** — preserves existing UX
4. **Multi-template from day one** — `kitchen-quotation`, `servicio-tecnico`, `consulta-general`
5. **Single-select lists with repeat pattern** — works around WhatsApp's multi-select limitation

## Files Created/Modified

- `tenants/euromobilia/assets/workflows/n8n/kapso-intake-quotation.json`
- `tenants/euromobilia/assets/infra/supabase/migrations/0004_intake_sessions_and_templates.sql`
- `tenants/euromobilia/assets/infra/supabase/seed/intake_templates_seed.sql`
- `tenants/euromobilia/assets/agents/quotation-assistant/app/models.py`
- `tenants/euromobilia/assets/agents/quotation-assistant/app/main.py`
- `tenants/euromobilia/assets/agents/quotation-assistant/app/prompts/intake_context.md`
- `knowledge/decisions/0010-whatsapp-interactive-intake-forms.md`

## Follow-up Prompt

> ok now execute the end-to-end implementation of the plan. Commit and push everything at the end, to remote. Test it all end-to-end.
