# Prompt log: Add agent context files

**Tool:** cursor  
**Date:** 2026-04-29

## Goal

Add repo-native **AI agent context**: `AGENTS.md`, Cursor rules, Claude Code, OpenCode, Open Codex, Copilot instructions, plus validation so these entrypoints stay present.

## Why these files

- **`AGENTS.md`** — single universal instruction surface for any coding agent
- **`.cursor/rules/*.mdc`** — persistent rules for Cursor without pasting walls of text each session
- **`.claude/CLAUDE.md`**, **`.opencode/`**, **`.open-codex/`** — tool-native entrypoints for CLI/cloud agents
- **`.github/copilot-instructions.md`** — Copilot alignment in GitHub

## Expected benefit

- Less repeated prompting and smaller session preambles
- Lower “vibe-coding” cost and less architectural drift between sessions
- Easier onboarding for new developers and agents

## Context files read

`CONSTITUTION.md`, `DOMAIN_MODEL.md`, `knowledge/decisions/0006-agent-context-files-as-repo-operating-memory.md`, implementation plan.

## Outcome

See change record `knowledge/change-log/2026/04/` for this date and ADR-0006.

## Original prompt

The full verbatim user prompt was not previously stored in-repo. This log documents purpose and rationale honestly; see repository PR/commit message for the applied diff.
