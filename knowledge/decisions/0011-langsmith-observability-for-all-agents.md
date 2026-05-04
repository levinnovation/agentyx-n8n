# ADR-0011: LangSmith Observability for All Agent Assets

**Status:** Accepted  
**Date:** 2026-04-30

## Context

The repository currently has one active LangGraph agent asset (`quotation-assistant`) with ad-hoc LangSmith tracing enabled via hardcoded environment variables. The agent template (`templates/assets/langgraph-agent/`) had no LangSmith instrumentation at all and defaulted observability to `langfuse`. 

Per the root README philosophy — *"Observable by default. Every asset declares its observability contracts (Langfuse, LangSmith, or both)"* — we need a consistent, toggleable, and metadata-rich LangSmith setup for **all** agent assets (existing and future). The `.env` configuration provided by operations gives us the canonical values:

- `LANGSMITH_ENABLED=true` — master toggle
- `LANGCHAIN_API_KEY` — workspace API key
- `LANGCHAIN_PROJECT=agentyx` — default project name
- `LANGCHAIN_ENDPOINT=https://api.smith.langchain.com` — endpoint override support
- `LANGCHAIN_TRACING_V2=true` — tracing protocol flag

## Decision

1. **Standardize LangSmith as the default tracing backend** for every LangGraph agent asset in the repo.
2. **Add a master toggle (`LANGSMITH_ENABLED`)** so tracing can be disabled per environment without removing API keys.
3. **Read endpoint from env (`LANGCHAIN_ENDPOINT`)** instead of hardcoding it, to support future endpoint migrations or self-hosted LangSmith.
4. **Attach structured metadata to every run** (`tenant`, `domain`, `capability`, `asset`) so traces are filterable and cost-attributable in the LangSmith UI.
5. **Update the agent template** (`templates/assets/langgraph-agent/`) so that *new* agents scaffolded from it inherit the same observability contract.
6. **Keep tool-execution and fallback logs inside standard Python `logging`**; LangSmith captures LLM calls and graph steps automatically. No additional `langsmith` SDK dependency is required for basic tracing.

## Consequences

### Positive

- All agent traces are searchable by tenant/domain/capability/asset dimensions.
- Operations can flip `LANGSMITH_ENABLED=false` in staging or local dev to reduce noise.
- Future agents get observability for free via the updated template.
- Endpoint is now configurable without code changes.

### Negative

- Adds four environment variables to every agent's `required_env` list.
- If `LANGSMITH_ENABLED=true` but `LANGCHAIN_API_KEY` is missing, tracing silently skips — this is intentional graceful degradation, but may confuse operators who expect traces.

## Rejected alternatives

- **Using the `langsmith` Python SDK (`@traceable`) explicitly** — rejected because LangGraph auto-traces via env vars; adding SDK calls would be boilerplate with no added value for graph-level observability.
- **Creating a shared `common/utils/langsmith.py` module** — rejected because `common/utils/` does not yet exist (ADR-0004 reserves it but it is unintroduced). Once it exists, we can refactor agent configs to import a shared setup function. For now each agent is self-contained.
- **Defaulting the template to `langfuse`** — rejected because the organization has standardized on LangSmith for LangGraph agents; `langfuse` remains available via the `asset-spec.schema.json` enum for non-LangGraph assets if needed.

## Follow-up

- When `common/utils/` is introduced, extract `setup_langsmith()` into a shared helper to avoid duplication across agents.
- Consider adding `langsmith` package as an explicit dependency in `pyproject.toml` if we later want programmatic feedback (run linking, dataset evaluation, etc.).
- Document run-cost attribution queries in `knowledge/operations/` once LangSmith usage patterns stabilize.
