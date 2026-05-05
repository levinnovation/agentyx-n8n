# Fix: railway.toml global Dockerfile build breaks image-based services

**Date:** 2026-05-05
**Tenant:** agx-demo (and template)
**Service:** n8n

## Problem

Railway deploy of `agx-demo-n8n` failed with:

```
couldn't locate the dockerfile at path Dockerfile in code archive
```

The root cause was the global `[build]` section at the top of `railway.toml`:

```toml
[build]
builder = "DOCKERFILE"
```

This forced **every** service in the project to look for a `Dockerfile` at the repo root,
even services configured with `image = "..."` (which should skip the build step entirely).

The skipped Dockerfiles in the error (`.devcontainer/Dockerfile`,
`docker/images/n8n/Dockerfile`, etc.) are from the **n8n monorepo** source code,
not from the assets repo. Railway found them but rejected them because they were not
at the repo root.

## Fix

1. **Removed the global `[build] builder = "DOCKERFILE"`** from both:
   - `tenants/euromobilia/assets/deploy/railway/railway.toml`
   - `templates/assets/railway-tenant-stack/railway.toml`

2. **Added per-service `[service.build] builder = "DOCKERFILE"`** only for services
   that actually build from source (those with `root = "..."` and no `image`).

3. **Switched template n8n service from `root` to `image`**:
   ```toml
   [n8n]
   image = "n8nio/n8n:latest"
   ```
   Building n8n from source is complex and unnecessary; the upstream image is the
   recommended approach (already used by the Euromobilia tenant).

## Action Required for agx-demo

The `agx-demo-n8n` service must be updated in one of these ways:

- **Option A (recommended):** Switch the n8n service to use `image = "n8nio/n8n:latest"`
  in the tenant's `railway.toml` (or Railway dashboard), matching the fixed template.

- **Option B:** Add a `Dockerfile` at the root of the `levinnovation/agentyx-n8n` fork
  repo that delegates to the existing `docker/images/n8n/Dockerfile`.

- **Option C:** Configure the Railway service to use the specific dockerfile path
  `docker/images/n8n/Dockerfile` in the service settings.
