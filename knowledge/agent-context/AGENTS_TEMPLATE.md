# AGENTS.md template

## Purpose

Universal instructions for **any** AI coding agent working in this tree.

## Expected location

- Repository root: `AGENTS.md`
- Optional: `subfolder/AGENTS.md` for bounded subsystems (must not contradict root law)

## Required sections (suggested)

1. **Repository identity** — domain-centric model; what this folder owns
2. **Prime rule** — forbidden top-level patterns; where tenant code lives
3. **Source of truth** — links to `CONSTITUTION.md`, `DOMAIN_MODEL.md`, `knowledge/`
4. **Architecture rules** — short bullets; link to ADRs for depth
5. **Knowledge law** — when to write ADRs / prompt logs / change records
6. **Editing rules** — read order, minimal diffs
7. **Validation** — commands (`make validate`, knowledge index, etc.)
8. **Forbidden** — secrets, fake prod claims, unversioned workflows, etc.

## When to update

- Repo structure or validation commands change
- New tenant/domain/capability pattern is introduced
- Repeated agent mistakes → tighten wording or add examples (brief)

## Anti-pattern

Duplicating entire `DOMAIN_MODEL.md` here—**link** instead.
