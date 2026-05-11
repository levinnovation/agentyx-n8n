# Change Log - 2026-05-08 - LEV multi-channel personal assistant

## What changed

- Added reusable core workflow asset:
  - `tenants/levinnovation/assets/workflows/n8n/personal-assistant-core/`
- Added channel adapters:
  - `tenants/levinnovation/assets/workflows/n8n/chan-telegram-personal-assistant/`
  - `tenants/levinnovation/assets/workflows/n8n/chan-kapso-wa-personal-assistant/`
  - `tenants/levinnovation/assets/workflows/n8n/chan-librechat-personal-assistant/`
- Added service:
  - `services/n8n-mcp-bridge/`
- Added operator smoke script:
  - `scripts/n8n/multichannel-smoke.sh`
- Updated Railway stack templates:
  - `templates/assets/railway-tenant-stack/railway.toml`
  - `templates/assets/railway-tenant-stack/template-config.json`
- Added ADR:
  - `knowledge/decisions/0028-multichannel-personal-assistant-and-n8n-as-librechat-mcp.md`

## Runtime rollout

- Imported and activated in live n8n:
  - `Personal Assistant Core (Levinnovation)`
  - `Channel Adapter - Telegram Personal Assistant`
  - `Channel Adapter - Kapso WA Personal Assistant`
  - `Channel Adapter - LibreChat Personal Assistant`
- Created and deployed `agx-demo-n8n-mcp-bridge` service.

## Follow-up required

- Set real channel credentials in Railway variables (Telegram and Kapso placeholders were set as `REQUIRED_SET_ME`).
- Attach custom domain `levinnovation.n8n-mcp.agentyx.one` to `agx-demo-n8n-mcp-bridge` (CLI auth permission required).
- Update LibreChat runtime config (`librechat.yaml`) in the LibreChat fork/service to register the new MCP bridge server.
