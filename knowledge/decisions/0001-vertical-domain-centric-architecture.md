# ADR-0001: Vertical domain-centric architecture

**Status:** Accepted  
**Date:** 2026-04-29

## Context

Tool-centric layouts (top-level `agents/`, `workflows/`, etc.) obscure which business capability an artifact serves and complicate tenant isolation.

## Decision

The repository is organized strictly as **tenant → domain → capability → assets**. Runtime technologies (LangGraph, n8n, etc.) are **asset types**, not top-level architectural roots.

## Consequences

### Positive

- Clear mapping from business to implementation
- Easier tenant boundaries and reviews

### Negative

- Deeper paths; requires discipline to avoid shortcuts

## Rejected alternatives

- Organizing by runtime or vendor first

## Follow-up

- Keep `CONSTITUTION.md` and `DOMAIN_MODEL.md` aligned with this ADR
