# Agentyx n8n

Fork of [n8n-io/n8n](https://github.com/n8n-io/n8n).

## Status

Runtime uses upstream `n8nio/n8n` image directly. This fork carries config notes, `MAINTAINERS.md`, and `docker-compose.override.yml` examples only.

**No auth code patches** in this ADR — n8n CE auth is large and frequently updated; rebase cost is high. Auth is handled by `auth-proxy` forward-auth (ADR-0012).

## Branching

- `main` — pure upstream mirror, synced to pinned tag `1.84.0`
- `agentyx/main` — config branch

## Baseline sync

```bash
make sync-fork APP=agentyx-n8n
```

## Deploy

Upstream image `n8nio/n8n:1.84.0` via `railway.toml`.
