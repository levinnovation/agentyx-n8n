# Contributing

> How to change this repository safely.

## Prerequisites

- Python 3.11+
- `make`
- `git`

## Setup

```bash
git clone <repo-url>
cd agentyx-vertical-assets
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
make validate
```

## Workflow

1. **Branch:** `git checkout -b feat/<tenant>-<description>`
2. **Change:** Edit specs, add assets, update docs
3. **Validate:** `make validate` (must pass)
4. **Test:** `make test` (must pass)
5. **Commit:** Follow conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`)
6. **Push:** `git push -u origin feat/<tenant>-<description>`
7. **PR:** Open a pull request against `main`

## Adding a New Tenant

```bash
make scaffold-tenant TENANT=my-tenant
# Edit tenants/my-tenant/tenant.yaml
# Add domains, capabilities, assets
make validate
```

## Adding a New Asset Type

1. Add JSON Schema to `standards/`
2. Add policy doc to `standards/policies/`
3. Add scaffold to `templates/assets/<new-type>/`
4. Update `scripts/scaffold_asset.py`
5. Update `Makefile`
6. Update this doc

## Code Style

- Python: black + isort + flake8
- YAML: yamllint
- Markdown: markdownlint

## Review Criteria

- [ ] `make validate` passes
- [ ] `make test` passes
- [ ] All new files have a corresponding schema
- [ ] No secrets committed
- [ ] README updated if needed
- [ ] DECISIONS.md updated if architectural
