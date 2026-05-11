# Change Log: Twenty CRM Deployment for LEV Innovation

**Date:** 2026-05-11
**Tenant:** levinnovation
**Asset:** twenty-crm

## Summary

Deployed Twenty open-source CRM (v0.50.0) on the existing `client-levinnovation-agentyx` Railway project.

## Changes

### New Files

- `tenants/levinnovation/domains/sales/domain.yaml` — New `sales` domain
- `tenants/levinnovation/domains/sales/README.md` — Domain documentation
- `tenants/levinnovation/domains/sales/capabilities/crm-management/capability.yaml` — CRM capability spec
- `tenants/levinnovation/domains/sales/capabilities/crm-management/README.md` — Capability documentation
- `tenants/levinnovation/domains/sales/capabilities/crm-management/assets/twenty-crm/asset.yaml` — Asset metadata
- `tenants/levinnovation/domains/sales/capabilities/crm-management/assets/twenty-crm/README.md` — Asset documentation
- `tenants/levinnovation/domains/sales/capabilities/crm-management/assets/twenty-crm/.env.example` — Env var shape
- `tenants/levinnovation/domains/sales/capabilities/crm-management/assets/twenty-crm/deployment-contract.yaml` — Deployment contract

### Modified Files

- `tenants/levinnovation/assets/deploy/railway/railway.toml` — Added `twenty-crm-server`, `twenty-crm-worker`, and `twenty-crm-bucket` service definitions

## Infrastructure

| Component | Value |
|-----------|-------|
| Platform | Railway |
| Project | `client-levinnovation-agentyx` |
| Services | `twenty-crm-server`, `twenty-crm-worker`, `twenty-crm-bucket` |
| Database | Existing Postgres (`twenty_crm` schema) |
| Cache | Existing Redis |
| Storage | Railway Bucket (S3-compatible) |
| Public URL | `https://levinnovation.crm.agentyx.one` |

## Auth

- Twenty native email/password auth enabled
- Google Workspace SSO integration planned for future

## Deployment Steps

1. Scaffolded domain/capability/asset files
2. Updated `railway.toml` with service definitions
3. Created Railway bucket service
4. Created `twenty-crm-server` and `twenty-crm-worker` services
5. Set environment variables referencing Postgres, Redis, and Bucket
6. Added custom domain `levinnovation.crm.agentyx.one`
7. Deployed both services

## Follow-up

- [ ] Configure DNS CNAME for `levinnovation.crm.agentyx.one`
- [ ] Verify health check at `/healthz`
- [ ] Complete initial admin signup
- [ ] Evaluate Google OAuth integration
