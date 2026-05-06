# syntax=docker/dockerfile:1
# Build context is the repo root, but Railway sets rootDirectory to services/auth-proxy.
# All COPY paths are relative to services/auth-proxy/.

FROM caddy:2-alpine

# Copy the Caddyfile template and entrypoint script
COPY Caddyfile.template /etc/caddy/Caddyfile.template
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
