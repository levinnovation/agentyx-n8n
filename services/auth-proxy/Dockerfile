# syntax=docker/dockerfile:1
# Build context is the repo root, so paths are relative to root.

FROM caddy:2-alpine

# Install gettext for envsubst
RUN apk add --no-cache gettext

COPY Caddyfile.template /etc/caddy/Caddyfile.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
