# Twenty CRM

Self-hosted Twenty CRM for LEV Innovation.

## Overview

Twenty is the #1 open-source CRM — an alternative to Salesforce, designed for AI.
This asset deploys Twenty on the existing `levinnovation` Railway project.

## Architecture

| Service | Image | Purpose |
|---------|-------|---------|
| `twenty-crm-server` | `twentycrm/twenty:v0.50.0` | Web UI, API, GraphQL, DB migrations |
| `twenty-crm-worker` | `twentycrm/twenty:v0.50.0` | Background jobs, queues, sync tasks |
| `twenty-crm-bucket` | Railway Bucket (S3-compatible) | File/object storage |

## Infrastructure

- **Database**: Existing Railway Postgres (`railway` DB, `twenty_crm` schema)
- **Cache/Queue**: Existing Railway Redis service
- **Storage**: Railway Bucket (auto-provisioned S3-compatible)
- **Public URL**: `https://levinnovation.crm.agentyx.one`

## Environment Variables

See `.env.example` for the shape of required variables.
Secrets are managed via Railway service variables.

## Auth

- **Current**: Twenty native email/password auth
- **Future**: Google Workspace OAuth via Better Auth integration

## Deployment

```bash
# Deploy server
railway up --service twenty-crm-server

# Deploy worker
railway up --service twenty-crm-worker
```

## Health Check

```
GET /healthz  → HTTP 200
```

## Notes

- First user to sign up becomes admin automatically.
- Admin panel available at Settings → Admin Panel.
- Configuration can be managed via admin panel (default) or env vars.
