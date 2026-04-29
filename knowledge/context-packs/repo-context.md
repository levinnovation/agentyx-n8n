# Repo context pack

## Identity

This repository is a **vertical-domain-centric AI asset framework**.

**Organizing model:** `tenant → domain → capability → assets`

## Technology assets (non-exhaustive)

LangGraph agents, n8n workflows, channel adapters, prompts, integrations, data contracts, RAG contracts, Supabase infra, deployment templates, evals, runbooks, and (when introduced) **common utilities** under `common/utils/`.

**Interfaces:** Customer and operator surfaces (WhatsApp, Slack, Microsoft Teams, web widget, web chat, Telegram, email, etc.) attach through **channel-adapter** and related workflow assets. A capability may reference **several** channels over time. Do not describe the repository as a single-channel or single-vendor product—see **ADR-0007** in `knowledge/decisions/`.

## Prime rule

Do **not** create top-level `agents/`, `workflows/`, `apps/`, `bots/`, or other runtime-centric roots.

Customer-specific implementation belongs under:

`tenants/{tenant}/domains/{domain}/...` and `tenants/{tenant}/assets/...`

## AI agent entrypoints

- **`AGENTS.md`** (repo root) is the **universal** instruction file for any AI coding agent.
- **Tool-specific** context exists so each toolchain can load the right surface area:
  - Cursor: `.cursor/rules/*.mdc`
  - Claude Code: `.claude/CLAUDE.md`
  - OpenCode: `.opencode/AGENTS.md`, `.opencode/context.md`
  - Open Codex: `.open-codex/AGENTS.md`, `.open-codex/context.md`
  - GitHub Copilot: `.github/copilot-instructions.md`

**Future agents should read `AGENTS.md` before changing code**, then narrow to tenant/domain/capability files.

## Canonical docs (read before architectural edits)

- `CONSTITUTION.md`
- `DOMAIN_MODEL.md`
- `knowledge/INDEX.md`
- This file
- Relevant `knowledge/decisions/` ADRs
- Relevant tenant pack: `knowledge/tenants/{tenant}/`

## Validation

- `make validate` — tenant specs and YAML/JSON parse checks
- `make knowledge-index` — refresh `knowledge/INDEX.md` after knowledge changes

## Naming note

Canonical example tenant: **euromobilia**. Do not rename the top-level app concept back to **AUREA**; AUREA may appear only as legacy/internal codename.
