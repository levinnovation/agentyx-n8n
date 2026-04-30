# ADR-0008: GitHub Actions as default CI/CD for tenant assets

**Status:** Accepted  
**Date:** 2026-04-30

## Context

Tenant assets (agents, workflows, prompts, infra) are versioned in Git but deployed manually via SSH. This creates drift between repo state and runtime, slows iteration, makes rollback difficult, and discourages small, frequent deploys. Every tenant that goes live needs a repeatable CI/CD pipeline.

## Decision

1. **GitHub Actions is the default CI/CD** for all tenant-asset builds and deployments.
2. **Reusable workflows** live under `.github/workflows/_reusable/`; tenant-specific caller workflows live under `.github/workflows/`.
3. **Docker images** for agent assets are built in CI, pushed to GHCR, and pulled by the target host.
4. **n8n workflows** are imported automatically into the running n8n instance via its REST API when JSON changes.
5. **Triggers are path-based**: each caller workflow watches its tenant/asset paths on `push` to `main`.
6. **Manual gates** remain available via `workflow_dispatch` using GitHub Environments (`dev`, `prod`).
7. **Secrets are per-environment** and never committed.
8. **Portability**: reusable workflows abstract the deployment target so the same pipeline can target Hostinger VPS, Cloud Run, Fly, Railway, or Render without rewriting core logic.

## Consequences

### Positive

- Single source of truth: Git commit SHA maps to runtime image SHA.
- No build dependencies on the VPS; builds are cached in GitHub + GHCR.
- Rollback = revert commit + re-run workflow.
- Adding a new tenant requires only a thin caller workflow + GitHub secrets.
- n8n workflow JSON changes are reflected in the running instance without manual UI import.

### Negative

- Requires GitHub secrets management discipline (rotation, environment scoping).
- VPS must have outbound internet to pull from GHCR.
- n8n API key must be rotated securely and kept out of source control.
- Storing workflow YAML at repo root (`.github/workflows/`) is a technical constraint of GitHub Actions; we keep tenant logic in thin callers rather than duplicating reusable logic.

## Rejected alternatives

- **Building Docker images on the VPS**: slow, no layer caching, leaves build dependencies on the host, harder to roll back.
- **Manual n8n workflow import**: prone to drift between repo JSON and runtime state; no audit trail.
- **Moving workflows to tenant subdirectories**: GitHub Actions requires workflow files in `.github/workflows/`; subdirectories can only hold reusable workflows or composite actions, not event-triggered entrypoints.

## Follow-up

- Document secrets setup in `knowledge/operations/how-to-add-tenant-cicd-pipeline.md`.
- Update context packs (`.github/copilot-instructions.md`, `knowledge/context-packs/repo-context.md`) to reference CI conventions.
- When a new tenant is onboarded, create its caller workflows by copying the euromobilia pattern and swapping tenant/asset names.
