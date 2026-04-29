# ADR-0005: Knowledge system as evolutionary architecture ledger

**Status:** Accepted  
**Date:** 2026-04-29

## Context

Architecture reasoning in chat tools is ephemeral; the repo needs a durable record of decisions, migrations, and lessons.

## Decision

Maintain a top-level **`knowledge/`** tree for ADRs, prompt logs, change records, evolution notes, glossary, operations runbooks, and context packs. **`knowledge/INDEX.md`** is generated for discoverability.

## Consequences

### Positive

- Onboarding for humans and agents improves
- Less re-explaining the same constraints every session

### Negative

- Must be updated when behavior changes; stale docs can mislead

## Rejected alternatives

- Relying only on `DECISIONS.md` or informal READMEs without structure

## Follow-up

- Run `make knowledge-index` after meaningful knowledge updates
- Add change records for large refactors
