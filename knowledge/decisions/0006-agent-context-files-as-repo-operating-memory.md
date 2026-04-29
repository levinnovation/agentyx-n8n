# ADR-0006: Agent context files as repo operating memory

**Status:** Accepted  
**Date:** 2026-04-29

## Context

AI coding tools (Cursor, Claude Code, OpenCode, Open Codex, Copilot, etc.) have **ephemeral** session context. Repeating architecture in every chat increases cost and causes drift between sessions and contributors.

## Decision

The repository maintains explicit **AI-agent-facing** context files:

- Root `AGENTS.md` (universal entrypoint)
- Cursor rules under `.cursor/rules/`
- Claude Code context under `.claude/CLAUDE.md`
- OpenCode / Open Codex under `.opencode/` and `.open-codex/`
- GitHub Copilot instructions under `.github/copilot-instructions.md`

These files **point to** canonical docs (`CONSTITUTION.md`, `DOMAIN_MODEL.md`, `knowledge/`) rather than duplicating all detail.

## Consequences

### Positive

- Less repeated prompting; smaller session preambles
- More consistent codegen and reviews
- Lower session cost; better onboarding for agents and humans

### Negative

- Context files must be maintained when structure or law changes
- Stale instructions can mislead agents if not updated

## Rejected alternatives

- Relying only on conversational memory or per-developer local notes

## Follow-up

- `scripts/validate_agent_context.py` checks required files exist
- Document updates in `knowledge/operations/how-to-update-agent-context-files.md`
- Regenerate `knowledge/INDEX.md` after changes
