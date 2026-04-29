# Agentyx Vertical Assets

> **Tenant → Domain → Capability → Assets**

This repository is the canonical home for vertical-domain agentic assets. It replaces ad-hoc agent and workflow folders with a strict, schema-governed hierarchy where every agent, n8n workflow, channel adapter, and infrastructure definition is an **asset of a capability**, which lives inside a **domain**, which belongs to a **tenant**.

## Quick Start

```bash
# 1. Validate all tenant specs
make validate

# 2. Scaffold a new tenant
make scaffold-tenant TENANT=acme-corp

# 3. Scaffold a new capability inside a domain
make scaffold-capability TENANT=acme-corp DOMAIN=retail CAPABILITY=store-locator

# 4. Compile a LangGraph asset for local testing
make compile-langgraph TENANT=euromobilia DOMAIN=kitchen-commerce CAPABILITY=kitchen-quotation ASSET=quotation-assistant

# 5. Compile an n8n workflow asset
make compile-n8n TENANT=euromobilia DOMAIN=kitchen-commerce CAPABILITY=kitchen-quotation ASSET=kapso-inbound-quotation
```

## Repository Structure

```
.
├── standards/                 # JSON Schemas + policy docs
├── templates/                 # Reusable scaffolds
│   ├── tenant/                # Generic tenant skeleton
│   └── assets/                # Asset-type scaffolds (langgraph-agent, n8n-workflow, ...)
├── tenants/                   # Real tenant instances
│   └── euromobilia/           # Canonical example: kitchen-commerce domain
├── knowledge/                 # Durable architecture ledger (ADRs, prompts, context packs)
├── scripts/                   # Python CLI tools
├── .github/workflows/         # CI/CD
├── Makefile                   # Developer commands
└── docs/
    └── history.md             # Why this repo exists
```

## AI Agent Context

For **AI coding agents** (Cursor, Claude Code, OpenCode, Open Codex, Copilot, etc.), this repo keeps **versioned, repo-native** instructions so sessions do not rely on chat memory alone:

- **`AGENTS.md`** — universal entrypoint; read this before editing code.
- **Cursor** — project rules in `.cursor/rules/` (`.mdc` files).
- **Claude Code** — `.claude/CLAUDE.md`.
- **OpenCode** — `.opencode/AGENTS.md` and `.opencode/context.md`.
- **Open Codex** — `.open-codex/AGENTS.md` and `.open-codex/context.md`.
- **GitHub Copilot** — `.github/copilot-instructions.md`.

Durable narrative, ADRs, prompt logs, and reusable bootstrap text live under **`knowledge/`** (start at `knowledge/INDEX.md` after running `make knowledge-index`). These files reduce repeated prompting and help keep coding sessions aligned with the vertical-domain model.

## Canonical Example: Euromobilia

- **Tenant:** `euromobilia`
- **Domain:** `kitchen-commerce`
- **Capabilities:** `kitchen-quotation`, `human-handoff`, `product-catalog-retrieval`, `quote-document-generation`
- **Primary Asset:** `quotation-assistant` (LangGraph agent)
- **Workflow Asset:** `kapso-inbound-quotation` (n8n workflow)

See `tenants/euromobilia/README.md` for the full domain model.

## Philosophy

1. **Domain-centric, not tool-centric.** We organize by business capability, not by whether something is a LangGraph agent or an n8n workflow.
2. **Schema-first.** Every `tenant.yaml`, `domain.yaml`, `capability.yaml`, and `asset.yaml` validates against a JSON Schema in `standards/`.
3. **Tenant isolation.** No tenant references another tenant's assets directly. Shared primitives live in `templates/`.
4. **Observable by default.** Every asset declares its observability contracts (Langfuse, LangSmith, or both).
5. **Git-native.** All assets are files. All changes are PRs. No database-of-record outside Git.

## Contributing

See `CONTRIBUTING.md`.

## Security

See `SECURITY.md`.

## Roadmap

See `ROADMAP.md`.

## License

Proprietary — see `SECURITY.md`.
