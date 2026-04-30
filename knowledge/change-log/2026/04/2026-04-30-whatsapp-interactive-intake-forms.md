# Change Record: WhatsApp Interactive Intake Forms

**Date:** 2026-04-30
**Tenant:** euromobilia
**Domain:** kitchen-commerce
**Capability:** kitchen-quotation

## Summary

Added an opt-in, template-driven WhatsApp interactive intake form layer. Users can now complete structured multi-step forms via WhatsApp buttons and lists before reaching the AI agent. The agent receives enriched context (intake data) for more precise quotations and responses.

## Changes

### New

1. **n8n workflow** `kapso-intake-quotation.json` — state-machine router with Supabase-backed sessions
2. **Supabase migration** `0004_intake_sessions_and_templates.sql` — tables + indexes + RLS
3. **Supabase seed** `intake_templates_seed.sql` — 3 templates (kitchen-quotation, servicio-tecnico, consulta-general)
4. **Agent prompt** `intake_context.md` — template for injecting structured data into agent context
5. **Design doc** `DESIGN-kapso-intake-quotation.md` — architecture and testing guide
6. **ADR-0010** — documents state-machine-in-n8n decision

### Modified

1. **Agent `models.py`** — added `intake_data` and `template_slug` to `AgentInvokeRequest`
2. **Agent `main.py`** — `_build_intake_context()` injects enriched prompt block; admin notify includes intake summary
3. **n8n `README.md`** — documented new workflow and env vars
4. **n8n `asset.yaml`** — bumped description

## Deployment

1. Applied migration `0004` to Supabase
2. Seeded `intake_templates`
3. Rebuilt agent Docker image with new code
4. Imported `kapso-intake-quotation.json` into n8n
5. Deactivated legacy `kapso-inbound-quotation` workflow
6. Activated new intake workflow on same webhook path

## Testing

- Curl simulation of welcome → start intake → step advance → complete → agent invoke
- Verified Supabase session state transitions
- Verified Kapso interactive message delivery
- Verified agent receives `intake_data` and generates contextual reply

## Rollback

Deactivate `kapso-intake-quotation`, reactivate legacy `kapso-inbound-quotation`. No data migration required.
