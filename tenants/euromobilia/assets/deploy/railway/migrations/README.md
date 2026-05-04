# PostgreSQL Migrations — Shared Tenant Database

One PostgreSQL database per tenant, with isolated schemas for each service.

## Schema Layout

| Schema | Service | Source |
|--------|---------|--------|
| `better_auth` | Auth service | `levinnovation/agentyx-auth-service` |
| `n8n` | n8n CE | Upstream image |
| `langfuse` | Langfuse | Upstream image |
| `librechat` | LibreChat | `levinnovation/agentyx-librechat` |
| `paperclip` | Paperclip | `levinnovation/agentyx-paperclip` |
| `flowise` | Flowise | `levinnovation/agentyx-flowise` |
| `agentyx_portal` | Client Portal | `levinnovation/agentyx-client-portal` |

## Migrations

| # | File | Purpose |
|---|------|---------|
| 001 | `001_create_schemas.sql` | Create all service schemas + extensions |
| 002 | `002_better_auth_core.sql` | Better Auth core tables (user, session, account, verification, jwks) |
| 003 | `003_better_auth_organizations.sql` | Organization plugin (org, member, invitation) |
| 004 | `004_scim_provisioning.sql` | SCIM 2.0 tables (mappings, sync log, API keys) |
| 005 | `005_shared_views.sql` | Cross-service views and lookup functions |
| 006 | `006_service_shadow_tables.sql` | Per-app shadow tables (librechat, paperclip, flowise, langfuse, portal) |
| 007 | `007_indexes_and_rls.sql` | Performance indexes + Row-Level Security |
| 008 | `008_seed_tenant_org.sql` | Seed euromobilia org + admin user |

## How to run

### Automated (all migrations)

```bash
cd tenants/euromobilia/assets/deploy/railway/migrations
chmod +x migrate.sh
./migrate.sh "$DATABASE_URL"
```

### Run up to a specific step

```bash
./migrate.sh "$DATABASE_URL" 004
```

### Reset everything

```bash
./migrate.sh "$DATABASE_URL" reset
```

### Manual (single file)

```bash
psql "$DATABASE_URL" -f 002_better_auth_core.sql
```

## Railway deployment

After creating the Postgres plugin in Railway, get the `DATABASE_URL` and run:

```bash
export DATABASE_URL="$(railway variables --service Postgres --get DATABASE_URL)"
./migrate.sh "$DATABASE_URL"
```

## Better Auth schema design

### Core tables

- **`user`** — canonical identity. All apps reference `user.id` as `sub`.
- **`session`** — active sessions. Expired rows should be purged by auth-service.
- **`account`** — OAuth provider links (Google Workspace, etc.).
- **`verification`** — email verification, password reset tokens.
- **`jwks`** — JWT signing keys.

### Organization tables

- **`organization`** — tenant org. One per Railway project. `tenant_id` = tenant slug.
- **`member`** — user membership in org with role (`owner`, `admin`, `member`, `viewer`).
- **`invitation`** — pending invites to orgs.

### SCIM tables

- **`scim_user_mapping`** — maps SCIM external IDs to internal users.
- **`scim_group_mapping`** — maps SCIM groups to orgs/roles.
- **`scim_sync_log`** — audit trail for all SCIM ops.
- **`scim_api_key`** — bearer tokens for IDP authentication.

### Shared views

- **`v_user_identity`** — flattened user + org memberships as JSON.
- **`v_organization_members`** — active members per org.
- **`v_scim_ready_users`** — users formatted for SCIM 2.0 responses.

### Functions

- **`lookup_user_by_email(email)`** — secure cross-service user lookup.
- **`is_org_member(user_id, org_slug, min_role)`** — RBAC check.

## Service shadow tables

Each app schema has a `user_shadow` table keyed by Better Auth `user.id`:

- `librechat.user_shadow` — preferences, avatar, librechat-specific role
- `paperclip.user_shadow` — team_id, permissions, settings
- `flowise.user_shadow` — api_keys, flowise role
- `langfuse.user_shadow` — auth_provider, external_sub
- `agentyx_portal.user_shadow` — dashboard_layout, notification_prefs

The auth-service syncs user lifecycle events (create, deactivate, delete) to all shadow tables.

## Row-Level Security

RLS is enabled on all Better Auth core tables. The auth-service sets the tenant context before queries:

```sql
SET LOCAL app.current_tenant = 'euromobilia';
SET LOCAL app.current_user_id = 'user-uuid';
```

This ensures each query only sees data for the current tenant organization.

## Post-migration checklist

- [ ] Run `migrate.sh` successfully
- [ ] Verify schemas exist: `\dn` in psql
- [ ] Verify tables exist in `better_auth` schema
- [ ] Reset admin password via auth-service (seed uses placeholder)
- [ ] Generate real SCIM API key via auth-service
- [ ] Configure Google Workspace SCIM with the generated token
- [ ] Run smoke tests on auth-service
