# OpenCode context (compact)

## Task recipes

### A. Add a new tenant

1. `python scripts/scaffold_tenant.py --tenant <slug>`
2. Fill `tenant.yaml` and `business-context.md`
3. Add domains/capabilities/assets under `tenants/<tenant>/`
4. `make validate`
5. Update `knowledge/` if architectural

### B. Add a new capability

1. `tenants/{tenant}/domains/{domain}/capabilities/<capability>/`
2. `capability.yaml` + README
3. Reference assets in capability docs / specs as required
4. Add tests/evals when applicable
5. `make validate`

### C. Add a new asset

1. `tenants/{tenant}/assets/{asset_type}/{asset_name}/`
2. `asset.yaml` + `README.md`
3. Link from owning capability materials
4. `make validate`

### D. Add common utility

1. `common/utils/` (parameterized; no tenant business rules baked in)
2. CLI help/docs
3. Validator/generator if needed
4. Update `knowledge/context-packs/common-utils-context.md`

### E. Major prompt / architecture change

1. Log under `knowledge/prompts/opencode/` (or relevant tool)
2. ADR if a decision is made
3. Change record under `knowledge/change-log/`
4. Update context packs / `AGENTS.md` if onboarding changes
5. `make knowledge-index`

## Bootstrap blurb

Paste from `knowledge/context-packs/opencode-session-bootstrap.md`.
