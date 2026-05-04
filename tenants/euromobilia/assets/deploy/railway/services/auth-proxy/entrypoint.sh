#!/bin/sh
# Render Caddyfile.template into Caddyfile using env vars
envsubst < /etc/caddy/Caddyfile.template > /etc/caddy/Caddyfile
exec "$@"
