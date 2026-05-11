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
| Railway URL | `https://twenty-crm-server-production-622c.up.railway.app` |
| Custom domain | `https://levinnovation.crm.agentyx.one` (⚠️ pending fix) |

## Fixes Applied During Deployment

| Issue | Cause | Fix |
|-------|-------|-----|
| `STORAGE_TYPE` validation error | Twenty only accepts lowercase `s3`, not `S_3` | Changed to `s3` |
| 502 on Railway URL | Railway proxy didn't know which port to route to | Added `PORT=3000` |
| Entrypoint crash loop | `touch /app/docker-data/db_status` fails (dir doesn't exist in image) | Set `DISABLE_DB_MIGRATIONS=true` after initial migration |
| "Unable to Reach Back-end" | Frontend loaded from Railway URL but API calls went to broken custom domain | Temporarily set `SERVER_URL` to Railway URL |
| Custom domain 502 | Railway edge routing not synced for `levinnovation.crm.agentyx.one` | Requires remove/re-add in Railway dashboard |

## URLs

| Endpoint | URL | Status |
|----------|-----|--------|
| Health | `https://twenty-crm-server-production-622c.up.railway.app/healthz` | ✅ 200 |
| UI | `https://twenty-crm-server-production-622c.up.railway.app` | ✅ Live |
| Custom domain | `https://levinnovation.crm.agentyx.one` | ⚠️ 502 — Railway edge issue |

## Auth

- Twenty native email/password auth enabled
- Google Workspace SSO integration planned for future

## Deployment Steps

1. Scaffolded domain/capability/asset files
2. Updated `railway.toml` with service definitions
3. Created Railway bucket service `twenty-crm-bucket`
4. Created `twenty-crm-server` and `twenty-crm-worker` services
5. Set environment variables referencing Postgres, Redis, and Bucket
6. Generated Railway public domain for server
7. Deployed both services

## Follow-up

- [x] Fix private URL (Railway URL now works)
- [ ] Fix custom domain `levinnovation.crm.agentyx.one` (remove/re-add in Railway dashboard)
- [ ] Switch `SERVER_URL` back to custom domain once it works
- [ ] Complete initial admin signup
- [ ] Evaluate Google OAuth integration
