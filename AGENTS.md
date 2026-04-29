# AGENTS.md

## Repository Identity

This repository is a **vertical-domain-centric AI asset framework**.

The organizing model is:

**tenant → domain → capability → assets**

Technology assets include:

- LangGraph agents
- n8n workflows
- channel adapters
- prompts
- integrations
- data contracts
- RAG contracts
- Supabase infra
- deployment templates
- evals
- runbooks
- common utilities (when present under `common/utils/`)

## Prime Rule

Do **not** create standalone app-centric, bot-centric, agent-centric, or workflow-centric **top-level** structures.

Do **not** create top-level `agents/`, `workflows/`, `apps/`, `bots/`, or ad-hoc runtime folders at the repository root.

All customer-specific implementation must live under:

`tenants/{tenant}/domains/{domain}/...` and `tenants/{tenant}/assets/...`

## Source of Truth

Read these before making architectural changes:

- `CONSTITUTION.md`
- `DOMAIN_MODEL.md`
- `knowledge/INDEX.md`
- `knowledge/context-packs/repo-context.md`
- relevant tenant context pack under `knowledge/tenants/{tenant}/`
- relevant ADRs under `knowledge/decisions/`

## Architecture Rules

- Tenants own domains.
- Domains own capabilities.
- Capabilities reference assets.
- Assets implement capabilities.
- LangGraph and n8n are **implementation assets**, not architecture roots.
- n8n JSON must be **versioned** in the repo.
- Prompts are **first-class versioned** assets (see `CONSTITUTION.md`).
- Tools must be governed by **allowlists and contracts** (`standards/`).
- Infrastructure must be **versioned**.
- Secrets must **never** be committed.

## Knowledge Law

Every meaningful architectural change must update `knowledge/`:

- **ADR** for decisions
- **Prompt log** for AI coding prompts (`knowledge/prompts/{tool}/`)
- **Change record** for implementation changes (`knowledge/change-log/`)
- **Context pack** update when future agents need to know

Regenerate the index after substantive knowledge additions:

```bash
make knowledge-index
```

## Editing Rules

Before editing:

1. Read this file (`AGENTS.md`).
2. Read `knowledge/context-packs/repo-context.md`.
3. Read the relevant tenant/domain/capability files.
4. Summarize your intended change.
5. Make the smallest coherent change.
6. Update `knowledge/` if the change is architectural.

## Validation

Run or preserve:

```bash
make validate
```

If touching knowledge:

```bash
make knowledge-index
```

If touching tenant/domain/capability references, ensure YAML/JSON remains valid (`make validate`).

## Forbidden

- Hardcoded secrets
- Fake production claims
- Unversioned workflows
- Undocumented prompts
- Undeclared external tools
- Runtime code that ignores specs
- Vendor UI as source of truth
- Adding dependencies without documenting why

## Naming

Canonical example:

- tenant: `euromobilia`
- domain: `kitchen-commerce`
- capability: `kitchen-quotation`
- agent asset: `quotation-assistant`
- n8n workflow asset: `kapso-inbound-quotation`

Never rename this back to **AUREA** as the top-level app. AUREA may appear only as legacy/internal codename.
