# Prompt log: 2026-05-18 — Recall.ai Google Meet Bot for Sofer

**Tool:** opencode
**Date:** 2026-05-18

## Goal

Create a Recall.ai Google Meet bot integration asset for the LEV Innovation "Sofer" meeting scribe agentic workflow. The user provided Recall.ai documentation for signed-in Google Meet bots, a webhook verification secret, and a Recall.ai API key.

## Context files read

- `AGENTS.md`
- `CONSTITUTION.md`
- `DOMAIN_MODEL.md`
- `knowledge/context-packs/repo-context.md`
- `tenants/levinnovation/domains/internal-operations/capabilities/meeting-minutes-and-followups/capability.yaml`
- `tenants/levinnovation/assets/workflows/n8n/meetings-agent-core/asset.yaml`
- `tenants/levinnovation/assets/integrations/composio-mcp/asset.yaml`
- `knowledge/tenants/levinnovation/capability-decisions.md`
- `knowledge/tenants/levinnovation/domain-decisions.md`

## Outcome

Created integration asset:
- `tenants/levinnovation/assets/integrations/recallai-gmeet-bot/asset.yaml`
- `tenants/levinnovation/assets/integrations/recallai-gmeet-bot/README.md`
- `tenants/levinnovation/assets/integrations/recallai-gmeet-bot/RUNBOOK.md` (step-by-step setup with pre-generated SSO certs)
- `tenants/levinnovation/assets/integrations/recallai-gmeet-bot/.env.example`
- `tenants/levinnovation/assets/integrations/recallai-gmeet-bot/deployment-contract.yaml`
- `tenants/levinnovation/assets/integrations/recallai-gmeet-bot/recallai-bot-orchestrator.json` (n8n workflow)
- `tenants/levinnovation/assets/integrations/recallai-gmeet-bot/recallai-webhook-receiver.json` (n8n workflow)

Updated capability and downstream asset:
- `tenants/levinnovation/domains/internal-operations/capabilities/meeting-minutes-and-followups/capability.yaml` (added asset reference)
- `tenants/levinnovation/assets/workflows/n8n/meetings-agent-core/asset.yaml` (updated dependency)
- `tenants/levinnovation/assets/workflows/n8n/meetings-agent-core/.env.example` (updated env vars)

Knowledge updates:
- `knowledge/decisions/0034-recallai-signed-gmeet-bot-for-levinnovation.md` (ADR)
- `knowledge/change-log/2026-05-18-recallai-gmeet-bot-sofer.md` (change record)
- `knowledge/tenants/levinnovation/capability-decisions.md` (updated meeting-minutes-and-followups section)
- `knowledge/tenants/levinnovation/domain-decisions.md` (updated internal-operations notes)

## Follow-ups

1. Create dedicated Google Workspace for bot SSO (`sso.levinnovation.com`).
2. Generate PEM cert/key and configure Google Workspace SSO profile.
3. Create Recall.ai Google Login Group and add active login(s).
4. Build the n8n orchestrator workflow that creates bots, handles webhooks, and forwards transcripts to `meetings-agent-core`.
5. Do **not** commit `RECALL_API_KEY` or `RECALL_WEBHOOK_SECRET` to the repo; store them in Railway/n8n credentials only.

## Original prompt

User asked: "ok for our meeting scribe agentic workflow (s) 'Sofer' lets create a google meets bot though Recall.ai" and pasted Recall.ai documentation along with credentials. (Credentials were not committed per secret hygiene policy.)
