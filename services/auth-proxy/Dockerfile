# syntax=docker/dockerfile:1
# Build context is the repo root, so paths are relative to root.

FROM caddy:2-alpine

COPY services/auth-proxy/Caddyfile /etc/caddy/Caddyfile

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
