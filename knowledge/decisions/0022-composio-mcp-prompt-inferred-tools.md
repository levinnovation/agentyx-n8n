# ADR-0022: Prompt-Inferred Composio Tool Surfacing

**Status:** Accepted  
**Date:** 2026-05-07

## Context

The `services/composio-mcp` bridge can expose a very large Composio tool catalog.
In n8n AI Agent sessions, `tools/list` is called before reasoning, and when the
listed set misses expected slugs (for example Gmail actions), the model
hallucinates capabilities and fails to execute intended actions.

Static allowlists provide safety but can over-constrain capability discovery.
We need per-request tool surfacing that follows user intent while preserving
explicit allowlist behavior when operators set one.

## Decision

1. Add request prompt extraction in `/mcp`:
   - `x-user-prompt` header (preferred),
   - JSON-RPC `params._meta.userPrompt`,
   - JSON-RPC `params._meta["x-user-prompt"]`.
2. Extend `listTools()` with `userPrompt` and rank cached tools by relevance
   using query terms plus connected-toolkit boost.
3. Keep existing semantics when explicit allowlists are configured:
   - `COMPOSIO_ALLOWED_TOOLKITS`,
   - `COMPOSIO_ALLOWED_ACTIONS`.
4. Add synthetic discovery/execution meta-tools (when no explicit allowlist):
   - `composio_search_tools`,
   - `composio_execute_tool`.
5. Add `COMPOSIO_PROMPT_TOPN` for prompt-inference result cap.
6. Emit `tools_prompt_inferred` and enrich account-selection logs with prompt
   summaries for traceability.

## Consequences

### Positive

- The MCP server can surface Gmail (and other relevant) tools based on prompt
  intent without forcing broad static exposure.
- Agents can recover within-session via meta-tools when initial list misses a
  specific action.
- Operators retain deterministic control through explicit allowlists.

### Negative

- Ranking heuristics may still miss some edge-case tools for ambiguous prompts.
- Additional server logic increases complexity and test surface.

## Rejected alternatives

- Header-only inference with no meta-tools - rejected due recovery gaps when
  prompts are not forwarded.
- Meta-tools only, no prompt ranking - rejected due poorer default UX.
- Changing allowlist semantics when configured - rejected due operator control
  requirements.
