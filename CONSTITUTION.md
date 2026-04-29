# Constitution

> The non-negotiable rules of this repository.

## 1. Namespace Hierarchy

The ONLY top-level organizing principle is:

```
tenant → domain → capability → assets
```

There is NO `agents/`, `workflows/`, or `tools/` folder at the repository root. Agents and workflows are **assets** of capabilities.

## 2. Schema Sovereignty

Every YAML spec file MUST validate against its corresponding JSON Schema in `standards/` before it can be merged. The `make validate` command is the gatekeeper.

## 3. Tenant Isolation

Tenants MUST NOT reference each other's assets. If two tenants need the same capability, they each get their own copy (or reference a `templates/` scaffold).

## 4. Asset Completeness

Every asset MUST declare:
- `asset.yaml` — metadata, type, owner capability
- `README.md` — human-readable purpose and usage
- Observability contract — how traces and logs are emitted
- Deployment contract — how the asset is built and shipped

## 5. Prompt Governance

System prompts are `.md` files, not inline strings. They live next to the asset they serve. No prompt > 4000 characters without explicit review.

## 6. Secret Hygiene

No secrets in Git. `.env.example` shows the shape; `.env` is gitignored. Deployment configs reference secret names, not values.

## 7. Change Protocol

1. Branch from `main`
2. Make changes
3. Run `make validate`
4. Open PR
5. CI runs `validate` + `test`
6. Merge only on green

## 8. No Orphans

If a capability is deleted, all its assets MUST be deleted in the same PR. The validator enforces referential integrity.

## 9. Documentation-First

Every new tenant, domain, capability, or asset type MUST have its design documented in a `DECISIONS.md` entry before code is generated.

## 10. Runtime Agnosticism

This repository contains **specs and scaffolds**, not running infrastructure. The runtime (Modal, Cloud Run, LangGraph Cloud, etc.) consumes assets from this repo via CI/CD.
