# ADR-0025: n8n queue-mode cluster topology on Railway

**Status:** Accepted  
**Date:** 2026-05-07

## Context

The per-tenant Railway stack currently runs n8n as a single service (`EXECUTIONS_MODE=regular`), which combines UI/API, scheduler, webhook handling, and execution workers in one process.

For LEV Innovation this creates an avoidable single point of failure:

- main service restarts can interrupt webhook ingress,
- execution throughput cannot scale independently from UI traffic,
- resilience is constrained to one n8n runtime unit.

The tenant must keep `levinnovation.n8n.agentyx.one` as the external entry point and remain compatible with the existing `auth-proxy` + Better Auth pattern.

## Decision

1. Adopt queue-mode n8n as the standard Railway topology:
   - `n8n-main` (single replica) for UI/API/scheduler,
   - `n8n-worker` (horizontally scalable) for executions,
   - `n8n-webhook` (horizontally scalable) for webhook ingress,
   - `redis` as Bull queue backend.
2. Keep the public DNS contract unchanged:
   - `levinnovation.n8n.agentyx.one` remains the external hostname.
3. Split `auth-proxy` routing for the n8n host:
   - UI/API paths remain `forward_auth` protected and proxy to `n8n-main`,
   - webhook/form/oauth callback paths proxy directly to `n8n-webhook`.
4. Enforce shared secrets across n8n roles:
   - `N8N_ENCRYPTION_KEY` must match on `n8n-main`, `n8n-worker`, and `n8n-webhook`.
5. Materialize this topology in both:
   - shared template (`templates/assets/railway-tenant-stack/`),
   - tenant source-of-truth (`tenants/levinnovation/assets/deploy/railway/`).

## Consequences

### Positive

- Webhook ingress keeps running when `n8n-main` restarts.
- Workers can scale independently for throughput.
- Queue mode improves fault isolation between control plane and execution plane.
- Topology becomes reusable for additional tenants.

### Negative

- Redis becomes an additional required service dependency.
- Operations and troubleshooting become more complex (queue health, worker sizing).
- Misconfigured shared secrets can break execution decryption across roles.

## Rejected alternatives

- Keep single `regular` mode n8n - rejected due to resilience limits.
- Full multi-main active-active n8n - deferred because Enterprise licensing is required for supported leader-election multi-main setup.

## Follow-up

- Evaluate enterprise multi-main n8n after licensing decision.
- Add queue health and backlog monitoring guidance in operations runbooks.
