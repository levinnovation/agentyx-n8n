# OpenCode session bootstrap (minimal)

```text
Read: AGENTS.md, CONSTITUTION.md, DOMAIN_MODEL.md, knowledge/context-packs/repo-context.md
Scope: tenants/{tenant}/ only for customer code; no root agents/workflows/apps
Edit: minimal diff; update knowledge/ if architectural
Check: make validate
```

## Recipes

**New tenant:** `scripts/scaffold_tenant.py` → `tenant.yaml` + `business-context.md` → domains/capabilities/assets → validate → knowledge if architectural.

**New capability:** `tenants/.../capabilities/<cap>/` + `capability.yaml` + assets refs → validate.

**New asset:** `tenants/.../assets/<type>/<name>/` + `asset.yaml` + link from capability → validate.

**Common util:** `common/utils/` (parameterized) + docs + validate.

**Major prompt/change:** log under `knowledge/prompts/{tool}/` → ADR if decided → change record → context packs → `make knowledge-index`.
