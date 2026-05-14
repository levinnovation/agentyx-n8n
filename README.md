# Agentyx Vertical Assets

> **Tenant -> Domain -> Capability -> Assets**

Canonical repository for Agentyx multi-tenant, domain-centric AI assets.  
This repo is the source of truth for architecture specs, versioned n8n workflow assets, prompts, contracts, deployment templates, and governance records.

---

## What This Repo Contains

- Tenant/domain/capability specifications under `tenants/`
- n8n workflow assets (core logic, channel adapters, CRM/tool subflows)
- Prompt assets and product knowledge assets
- Deployment assets/templates (primarily Railway tenant stacks)
- Shared standards and schemas under `standards/`
- Durable architecture and operational ledger under `knowledge/` (ADRs, runbooks, change-log, context packs)

This repository does **not** use top-level tool-centric trees such as `agents/` or `workflows/` at root; those are represented as capability assets inside tenants.

---

## Current Tenant Footprint

### `levinnovation` (active internal tenant)

Domains:
- `customer-service`
- `sales`
- `sales-prospecting`

Highlights:
- Multi-channel customer-service stack (Kapso WhatsApp, Telegram, Meta comments)
- Customer-service RAG pipeline with Postgres/pgvector-backed KB search
- Portal-based document ingestion, reprocess, and per-document delete actions
- Twenty CRM integration subflows and action routing
- Prospecting workflows and prompt assets

See `tenants/levinnovation/README.md`.

### `euromobilia` (canonical reference tenant)

Domain:
- `kitchen-commerce`

Used as reference for scaffolding patterns and tenant modeling.

See `tenants/euromobilia/README.md`.

---

## Runtime and Deployment Model

- Canonical platform direction: **per-tenant Railway project** (see ADR-0010 family in `knowledge/decisions/`)
- Several runtime services are maintained via dedicated fork repos (portal, n8n fork, flowise, paperclip, etc.) while their tenant configuration, contracts, and integration assets are tracked here
- Workflow JSON is versioned in Git and intended to be imported/synced to n8n environments

---

## Quick Start

```bash
# Validate tenant/domain/capability specs and structural integrity
make validate

# Scaffold a new tenant
make scaffold-tenant TENANT=acme-corp

# Scaffold a capability inside a domain
make scaffold-capability TENANT=acme-corp DOMAIN=retail CAPABILITY=store-locator

# Compile a LangGraph asset
make compile-langgraph TENANT=euromobilia DOMAIN=kitchen-commerce CAPABILITY=kitchen-quotation ASSET=quotation-assistant

# Compile an n8n workflow asset
make compile-n8n TENANT=euromobilia DOMAIN=kitchen-commerce CAPABILITY=kitchen-quotation ASSET=kapso-inbound-quotation

# Regenerate knowledge index after knowledge edits
make knowledge-index
```

---

## Repository Structure

```text
.
├── tenants/                    # Tenant implementations (specs + assets)
├── templates/                  # Reusable scaffolds and tenant-stack templates
├── standards/                  # JSON schemas and governance standards
├── services/                   # Shared service implementations maintained in-repo
├── scripts/                    # Operational and import/sync tooling
├── knowledge/                  # ADRs, runbooks, context packs, change records
├── .github/workflows/          # CI/CD automation
├── docs/                       # Historical/contextual docs
└── Makefile                    # Developer command entrypoint
```

---

## Agent and Governance Entry Points

Read these first before structural or architectural changes:

- `AGENTS.md` (universal AI agent entrypoint)
- `CONSTITUTION.md`
- `DOMAIN_MODEL.md`
- `knowledge/context-packs/repo-context.md`
- `knowledge/INDEX.md`

Tool-specific agent context files also exist for Cursor, Claude Code, OpenCode, Open Codex, and Copilot.

---

## Decision and Change Ledger

Canonical architecture decisions and operational history are under `knowledge/`:

- Decisions (ADRs): `knowledge/decisions/`
- Change records: `knowledge/change-log/`
- Operations/runbooks: `knowledge/operations/`
- Tenant context: `knowledge/tenants/`

For historical background on the migration from older structures, see `docs/history.md`.

---

## Contributing and Security

- Contributing guide: `CONTRIBUTING.md`
- Security model: `SECURITY.md`
- Roadmap: `ROADMAP.md`

License: Proprietary.
