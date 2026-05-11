# CRM Management Capability

This capability hosts the Twenty open-source CRM for LEV Innovation.

## Asset

- `twenty-crm` — Railway-deployed Twenty CRM server + worker

## Endpoints

| Endpoint | URL | Notes |
|----------|-----|-------|
| CRM UI | `https://levinnovation.crm.agentyx.one` | Public custom domain |

## Auth

Currently using Twenty's native email/password authentication.
Future: integrate with Google Workspace SSO via Better Auth.

## Storage

Railway Bucket (S3-compatible object storage) for file uploads.
