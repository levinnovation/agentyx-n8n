# 2026-05-12 — Customer Service MCP Overflow Baseline

## Scope
- Tenant: `levinnovation`
- Workflow: `Customer Service Core (Levinnovation)` (`n0mTwpONyCbbyn2E`)
- Runtime host: `https://webhooks.n8n.agentyx.one`

## Baseline metrics (pre-refactor)
- Sample: latest 17 executions with run data.
- `AI Agent` successes: 8
- `AI Agent` errors: 9
- Token overflow errors: 2
- Provider errors: 7
- P50 execution duration: 7.71s
- P95 execution duration: 37.52s

## Primary failure signatures
1. **Context overflow** in model endpoint with very large tool input.
2. **Provider returned error** at the chat model node during overloaded turns.
3. Downstream channel adapters receiving empty/errored core payloads.

## Observed architectural drivers
- Single agent with many attached tools.
- MCP tool listing with broad surface.
- Large system prompt + memory + KB payload accumulation.
- Duplicate/overlapping tool exposure for Twenty workflows.

## Goal for post-refactor validation
- Zero context overflow errors across equivalent traffic windows.
- Stable MCP availability with reduced tool-schema prompt load.
- Improved success ratio and lower P95 latency.
