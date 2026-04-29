# LangGraph Asset Policy

> Standards for LangGraph agent assets.

## Rules

1. Every LangGraph asset MUST have:
   - `app/graph.py` — the StateGraph definition
   - `app/tools.py` — tool functions
   - `app/memory.py` — memory configuration
   - `app/config.py` — runtime configuration
   - `system-prompt.md` — system prompt
   - `asset.yaml` — metadata
2. Graphs MUST be scaffolded with TODOs for production logic.
3. Tools MUST be decorated with `@tool` and have docstrings.
4. No hardcoded secrets in `config.py`.
5. Graph nodes SHOULD be < 50 lines each.

## Enforcement

- `scripts/compile_langgraph_asset.py` checks structure.
- CI runs `ast.parse` on all Python files.
