# OpenCode context template

## Purpose

Compact bootstrap for OpenCode agents (CLI-oriented).

## Expected locations

- `.opencode/AGENTS.md` — short mandatory reads + invariants
- `.opencode/context.md` — optional deeper links and task recipes

## Required sections

1. Repo identity + folder model
2. Forbidden structures
3. Files to read first
4. Validation commands
5. Knowledge update rules
6. Task recipes (tenant, capability, asset, util, major prompt)

## When to update

- Makefile targets or scaffold scripts change
- New first-class directories appear

## Anti-pattern

Long prose—prefer bullet lists and paths.
