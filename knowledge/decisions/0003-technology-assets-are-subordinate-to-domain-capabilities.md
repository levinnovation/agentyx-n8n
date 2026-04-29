# ADR-0003: Technology assets are subordinate to domain capabilities

**Status:** Accepted  
**Date:** 2026-04-29

## Context

Agents, workflows, and integrations are often treated as the architecture. That inverts the business model and encourages top-level runtime folders.

## Decision

**Capabilities** are the unit of business ownership. **Assets** (LangGraph agents, n8n workflows, channel adapters, prompts, infra, etc.) **implement** capabilities and are declared under the tenant asset tree with `asset.yaml` and contracts.

## Consequences

### Positive

- Technology choices remain replaceable
- Specs and policies attach to capabilities and assets consistently

### Negative

- More metadata per asset; validators must stay usable

## Rejected alternatives

- Repo root organized by LangGraph vs n8n vs “bots”

## Follow-up

- Keep `standards/` schemas and policies aligned with asset types
