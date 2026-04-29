# How to close an architecture change

1. **Decide** — ADR in `knowledge/decisions/` if the change establishes precedent
2. **Implement** — minimal coherent diff; keep tenant isolation
3. **Record** — `knowledge/change-log/YYYY/MM/...` with rationale + validation
4. **Prompt trail** — if AI-driven, log under `knowledge/prompts/<tool>/`
5. **Context** — update `knowledge/context-packs/` and agent files if onboarding must change
6. **Index** — `make knowledge-index`
7. **Validate** — `make validate` (and `make test` if code paths touched)

**Done when:** docs + code + validators align; no stale forbidden paths in agent files.
