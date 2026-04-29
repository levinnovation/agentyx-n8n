# Operations

> Operations runbook for kitchen-quotation.

## Health Checks

- LangGraph endpoint: `/health`
- n8n workflow: check execution logs
- Supabase: connection pool status

## Monitoring

- Langfuse traces
- Modal metrics
- Kapso delivery reports

## Alerts

- P99 latency > 5s
- Error rate > 1%
- Human handoff rate > 30%

## TODO

- [ ] Define alert routing
- [ ] Document on-call rotation
