# How to Rotate the Railway Token

**Owner:** Operations team  
**Last updated:** 2026-05-04

## Context

The `RAILWAY_TOKEN` used by CI and local scripts is an **account-scoped token** tied to `vflores@levinnovation.com`. It can act on any project the operator can access. Rotate it after:

- Any operator off-boarding
- Suspected leak
- Quarterly security review

## Rotation procedure

1. **Generate a new token** (as `vflores@levinnovation.com`):
   ```bash
   railway login
   railway token create --name "agentyx-ci-$(date +%Y%m%d)"
   ```
   Copy the token value immediately (shown only once).

2. **Update GitHub secret**:
   - Repository → Settings → Secrets and variables → Actions → `RAILWAY_TOKEN`
   - Paste the new token.

3. **Validate**:
   ```bash
   export RAILWAY_TOKEN=<new-token>
   railway whoami
   bash scripts/railway/smoke-test.sh --tenant euromobilia --service agent
   ```

4. **Revoke the old token**:
   ```bash
   railway token revoke <old-token-id>
   ```

5. **Document** the rotation date in this file (update "Last updated").

## Future hardening

- Split to project-scoped tokens once production tenants are stable.
- Store token in a secrets manager (e.g. 1Password) with auto-rotation.
