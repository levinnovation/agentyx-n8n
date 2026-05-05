# syntax=docker/dockerfile:1
# Build context is the repo root, but Railway sets rootDirectory to services/auth-proxy.
# All COPY paths are relative to services/auth-proxy/.

FROM caddy:2-alpine

# Copy the Caddyfile template — Caddy substitutes {$VAR} syntax natively at runtime
COPY Caddyfile.template /etc/caddy/Caddyfile

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
