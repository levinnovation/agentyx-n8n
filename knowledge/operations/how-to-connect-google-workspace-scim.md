# How to Connect Google Workspace SCIM

**Owner:** Operations team  
**Last updated:** 2026-05-04

## Prerequisites

- Google Workspace **Enterprise** license (SCIM requires Enterprise).
- `agentyx-auth-service` deployed and healthy.
- SCIM bearer token from `scripts/auth/bootstrap-tenant-org.sh`.

## Steps

1. **Run bootstrap** (if not already done):
   ```bash
   bash scripts/auth/bootstrap-tenant-org.sh \
     --tenant euromobilia \
     --admin-email admin@euromobilia.com
   ```
   Save the printed SCIM token.

2. **Open Google Admin Console**:
   - Directory → Profile editing → Enable automatic user provisioning.

3. **Add custom SCIM app**:
   - Apps → Web and mobile apps → Add custom SAML app.
   - After SAML setup, enable automatic provisioning.
   - Set SCIM endpoint to:
     ```
     https://<better-auth-domain>/api/scim/v2
     ```
   - Paste the SCIM bearer token.

4. **Map attributes**:
   - `userName` → `email`
   - `name.givenName` → `name`
   - `externalId` → `id`

5. **Test**:
   - Create a test user in Google Workspace.
   - Verify they appear in Better Auth (`better_auth.user` table).
   - Verify they are assigned to the tenant organization.

## Troubleshooting

- **401 from SCIM endpoint** — Check SCIM token and `X-Internal-Api-Key` header.
- **User not in org** — Ensure `organizationId` is set in the SCIM create payload.
- **Google sync delay** — Google Workspace provisioning can take 5–10 minutes.

## Rotation

If the SCIM token is compromised:
1. Re-run `bootstrap-tenant-org.sh` (it is idempotent).
2. Update the token in Google Admin Console.
