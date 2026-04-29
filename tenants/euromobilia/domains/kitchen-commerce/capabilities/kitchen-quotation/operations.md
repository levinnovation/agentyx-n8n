# Operations

> Operations runbook for kitchen-quotation.

## Health Checks

- LangGraph endpoint: `/health`
- n8n (self-hosted Hostinger): editor and webhooks reachable at bootstrap URL documented in `assets/deploy/n8n-hostinger/README.md` and `assets/workflows/n8n/README.md`; check execution logs in n8n
- Supabase: connection pool status

## n8n runtime runbook

See `tenants/euromobilia/assets/deploy/n8n-hostinger/README.md` (deploy, backup, update) and `LOCAL-SSH-SETUP.md` in that folder for SSH key handling.

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
