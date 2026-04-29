# Deployment

> Deployment guide for kitchen-quotation.

## Environments

- `dev` — Modal dev deployment
- `staging` — Modal staging
- `prod` — Modal production (target: Cloud Run per ADR-055)

## Steps

1. Compile assets: `make compile-langgraph`
2. Deploy to Modal: `modal deploy`
3. Update n8n webhooks
4. Verify health checks

## TODO

- [ ] Document rollback procedure
- [ ] Add CI/CD pipeline details
