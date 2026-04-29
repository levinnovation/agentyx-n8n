# Open Codex context template

## Purpose

Same as OpenCode template but tuned for Open Codex conventions.

## Expected locations

- `.open-codex/AGENTS.md`
- `.open-codex/context.md`

## Required sections

Identical intent to `OPENCODE_TEMPLATE.md` (identity, forbiddens, read-first, validate, knowledge law, recipes).

## When to update

Keep **in sync** with OpenCode files when instructions are tool-agnostic; differ only when the tool requires it.

## Anti-pattern

Drift between `.opencode/` and `.open-codex/` without reason—keep them aligned unless tooling diverges.
