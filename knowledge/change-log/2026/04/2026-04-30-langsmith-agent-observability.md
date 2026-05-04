# Change Record: LangSmith Observability for All Agent Assets

**Date:** 2026-04-30  
**Scope:** `tenants/euromobilia/assets/agents/quotation-assistant`, `templates/assets/langgraph-agent`, `knowledge/decisions/ADR-0011`

## Summary

Added consistent, toggleable, and metadata-rich LangSmith instrumentation to all LangGraph agent assets (existing + template) and recorded the decision in ADR-0011.

## What changed

### `tenants/euromobilia/assets/agents/quotation-assistant`

- `app/config.py`: Added `LANGSMITH_ENABLED`, `LANGCHAIN_ENDPOINT` env vars.
- `app/graph.py`: 
  - Updated `setup_langsmith()` to respect the `LANGSMITH_ENABLED` toggle and use the configurable `LANGCHAIN_ENDPOINT`.
  - Added structured metadata (`tenant`, `domain`, `capability`, `asset`) to every `agent.invoke()` call for filterable traces.
- `.env.example`: Added `LANGSMITH_ENABLED` and `LANGCHAIN_ENDPOINT`.
- `asset.yaml`: Added `LANGSMITH_ENABLED` and `LANGCHAIN_ENDPOINT` to `required_env`.

### `templates/assets/langgraph-agent`

- `app/config.py`: Added LangSmith env var block (enabled by default, project scoped to `{{tenant_id}}-{{asset_id}}`).
- `app/graph.py`: Added `setup_langsmith()` and wired it before `graph.compile()`.
- `asset.yaml`: Changed default `observability.traces` from `langfuse` to `langsmith`.
- **New** `.env.example`: Documented LangSmith variables for scaffolded agents.

### `knowledge/decisions/ADR-0011`

- New ADR documenting the rationale, consequences, and rejected alternatives.

## Validation

- `make validate` passes.
- `make knowledge-index` regenerated.
- Agent code loads without import errors (verified by Python syntax check).

## Related

- ADR-0011
- `standards/asset-spec.schema.json` (already defines `observability.traces` enum including `langsmith`)
