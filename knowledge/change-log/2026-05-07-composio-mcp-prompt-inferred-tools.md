# 2026-05-07 — composio-mcp prompt-inferred tools + auto-connect

## Summary

Implemented prompt-aware tool surfacing, meta-tool-based dynamic discovery and
execution, plus gated auto-creation of Composio connected accounts (OAuth +
API-key passthrough).

## Rationale

n8n sessions were missing expected Gmail tool slugs during `tools/list`, causing
agent hallucinations and failed "send email" flows. In addition, users without a
connected account had to leave the conversation for manual setup.

## Files / areas

- `services/composio-mcp/src/server.ts`
  - Added `extractUserPrompt` + context propagation
  - Added synthetic meta-tools in `tools/list`
  - Added meta-tool dispatch in `tools/call`
  - Added structured tool error rendering
- `services/composio-mcp/src/composio.ts`
  - Added prompt-inferred ranking (`COMPOSIO_PROMPT_TOPN`)
  - Added Composio planner fallback for `composio_search_tools` when local ranking misses intent (`COMPOSIO_SEARCH_PLANNER_FALLBACK`)
  - Added auto-connect APIs (`auth_configs`, `connected_accounts`)
  - Added implicit OAuth fallback on missing-connection errors
  - Added `StructuredToolError`
- `services/composio-mcp/src/composio.test.ts`
  - Added prompt ranking, auto-connect, and fallback coverage
- `services/composio-mcp/.env.example`
  - Documented `x-user-prompt`
  - Added `COMPOSIO_PROMPT_TOPN`
  - Added `COMPOSIO_AUTO_CONNECT_TOOLKITS`
- `services/composio-mcp/README.md`
  - Added prompt-inferred and auto-connect sections
- `knowledge/operations/composio-mcp-n8n-runbook.md`
  - Added header forwarding and troubleshooting updates
- `tenants/levinnovation/assets/workflows/n8n/personal-assistant/personal-assistant.json`
  - Injected `x-entity-id`, `x-connected-account-id`, `x-user-prompt`
- `tenants/levinnovation/assets/workflows/n8n/personal-assistant/README.md`
  - Documented headers, meta-tools, and retry flow

## Validation

- `npm test` in `services/composio-mcp`
- `npm run build` in `services/composio-mcp`
- `make knowledge-index`

## Risks / rollback

- Prompt ranking can hide niche tools for ambiguous prompts; use
  `composio_search_tools` as fallback.
- Auto-connect is fully disabled unless `COMPOSIO_AUTO_CONNECT_TOOLKITS` is set.
- Rollback: unset `COMPOSIO_AUTO_CONNECT_TOOLKITS` and redeploy to disable
  connection auto-creation without removing prompt inference.
