# ADR-0024: Horizontal scaling baseline for composio-mcp on Railway

**Status:** Accepted  
**Date:** 2026-05-07

## Context

The `agx-demo-composio-mcp` service is the MCP ingress for n8n AI Agent tool
execution in the `client-levinnovation-agentyx` project. Load is bursty and can
increase quickly when multiple workflows invoke `tools/list` and tool execution
in parallel.

Service behavior supports horizontal routing:

- `/mcp` requests are handled over Streamable HTTP per request.
- In-process caches are local to each replica with short TTL.
- `/healthz` is available for readiness checks.

We need to increase throughput and resilience while preserving the existing
public endpoint used by n8n.

## Decision

1. Standardize `services/composio-mcp/railway.toml` with:
   - `deploy.numReplicas = 3`
   - `deploy.healthcheckPath = "/healthz"`
   - restart policy settings (`ON_FAILURE`, max retries `10`).
2. Keep Railway service URL as the only ingress and rely on Railway edge
   balancing (round-robin across healthy replicas).
3. Mirror the same scaling baseline in
   `templates/assets/railway-tenant-stack/template-config.json` so new tenant
   stacks inherit this posture.
4. Do not introduce sticky sessions or shared cache as part of this change.

## Consequences

### Positive

- Higher request concurrency and better fault tolerance (single instance loss
  does not remove service availability).
- Existing n8n endpoint remains unchanged.
- Infrastructure intent is versioned in repo and reproducible for future tenant
  environments.

### Negative

- Compute/runtime cost increases versus one replica.
- Cache warmup work happens independently per replica.
- Replica distribution evidence currently depends on Railway HTTP logs instead
  of an in-app instance label.

## Rejected alternatives

- Move to non-Railway serverless runtime (Cloud Run/Fly/other): rejected for
  now due migration overhead and no immediate requirement beyond current Railway
  capabilities.
- Keep single replica with vertical sizing only: rejected because it does not
  address resilience goals for runtime failures or rolling updates.
- Add shared Redis cache immediately: rejected because current cache behavior is
  acceptable and this adds unnecessary operational complexity for the present
  scope.
