# ADR-0008: Migrate AUREA legacy backend to Euromobilia kitchen-commerce assets

**Status:** Accepted  
**Date:** 2026-04-29

## Context

The legacy AUREA backend (`aurea-aragroupcr/`) was built on Modal + CopilotKit AG-UI + React/Vite frontend. It contained a functional LangGraph agent with 7 tools, FAISS RAG, Supabase catalog/pricing, and image generation. The backend needs to be re-platformed to align with this repository's vertical-domain-centric architecture (`tenant → domain → capability → assets`).

## Decision

1. **Re-platform off Modal/CopilotKit** onto LangGraph + FastAPI + Kapso (WhatsApp-first).
2. **Tenant-level assets layout**: all runtime assets live under `tenants/euromobilia/assets/`, not under `domains/kitchen-commerce/assets/`.
3. **Prompts as `.md` source-of-truth**: collapse `agent_prompt.py` (~31 KB) and `system-prompt.ts` (~40 KB) into versioned markdown under `assets/prompts/`.
4. **Scope**: backend + business logic only. The React/Vite UI and CopilotKit bridge are NOT migrated.
5. **Contracts-first**: new integrations (Kapso, OpenRouter), channel, and evals are scaffolded as contracts before runtime implementation.

## Consequences

### Positive

- Aligns with repo architecture rules (no top-level `agents/`, `workflows/`, etc.).
- Prompts are versioned, reviewable, and hot-reloadable.
- WhatsApp-first architecture matches Euromobilia's primary sales channel.

### Negative

- Frontend (React/Vite) is dropped; no web chat UI in this migration.
- Kapso channel, n8n workflows, and integration contracts are scaffolds requiring manual credential setup.
- Image generation logic (~43 KB) is structurally ported but needs runtime validation.

## Rejected alternatives

- Keeping Modal runtime (incompatible with repo's Render-focused deployment scaffolds).
- Migrating the React UI (out of scope for backend re-platforming).
- Using inline prompts in Python (violates `CONSTITUTION.md` prompt governance).

## Follow-up

- Validate runtime with real Kapso credentials and OpenRouter API key.
- Add second channel (web widget) as a new channel asset when needed.
- Monitor image generation pipeline for quality regressions.
