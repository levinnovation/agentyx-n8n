# syntax=docker/dockerfile:1
FROM caddy:2-alpine

# Install envsubst for templating
RUN apk add --no-cache gettext

COPY Caddyfile.template /etc/caddy/Caddyfile.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
