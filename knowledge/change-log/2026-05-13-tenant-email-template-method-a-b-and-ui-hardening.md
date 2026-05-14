# 2026-05-13 — Tenant Email Template Method A/B and UI Hardening

## What changed

- Added Method B workflow-interception branch behind `USE_TEMPLATE_INTERCEPT` in both Levinnovation workflows:
  - `tenants/levinnovation/assets/workflows/n8n/customer-service-core/customer-service-core.json`
  - `tenants/levinnovation/assets/workflows/n8n/personal-assistant-core/personal-assistant-core.json`
- Method B injects template HTML envelope and prepares Composio payload metadata with `is_html=true` while preserving Method A as default.
- Hardened portal email template editor usability in `agentyx-client-portal`:
  - Replaced unstable tabs rendering with a clean section menu.
  - Added desktop split-pane resize handle between Monaco and preview.
  - Removed rigid placeholder blocks and improved overflow behavior on all new panels.

## Validation

- `make validate` (root repo) ✅
- `.tmp-agentyx-client-portal`: `npm run lint` ✅
- `.tmp-agentyx-client-portal`: `npm run build` ✅
- Portal deploy to Railway service `agx-demo-portal` ✅
- n8n workflow import attempt ❌ blocked by `401 Unauthorized` (invalid or rotated API key)

## Risks / rollback

- If Method B causes undesired envelope behavior, keep `USE_TEMPLATE_INTERCEPT` unset/false and Method A remains active.
- Workflow rollback is file-level by restoring previous JSON versions for the two assets above.
