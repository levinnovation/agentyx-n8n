#!/bin/sh
# Substitute env vars into Caddyfile template using distinct __VAR__ placeholders
# to avoid conflicts with Caddy's native {placeholder} syntax.

set -e

sed -e "s|__N8N_PUBLIC_HOST__|${N8N_PUBLIC_HOST}|g" \
    -e "s|__FLOWISE_PUBLIC_HOST__|${FLOWISE_PUBLIC_HOST}|g" \
    -e "s|__PAPERCLIP_PUBLIC_HOST__|${PAPERCLIP_PUBLIC_HOST}|g" \
    -e "s|__LIBRECHAT_PUBLIC_HOST__|${LIBRECHAT_PUBLIC_HOST}|g" \
    -e "s|__BETTER_AUTH_INTERNAL_URL__|${BETTER_AUTH_INTERNAL_URL}|g" \
    -e "s|__N8N_INTERNAL_URL__|${N8N_INTERNAL_URL}|g" \
    -e "s|__FLOWISE_INTERNAL_URL__|${FLOWISE_INTERNAL_URL}|g" \
    -e "s|__PAPERCLIP_INTERNAL_URL__|${PAPERCLIP_INTERNAL_URL}|g" \
    -e "s|__LIBRECHAT_INTERNAL_URL__|${LIBRECHAT_INTERNAL_URL}|g" \
    /etc/caddy/Caddyfile.template > /etc/caddy/Caddyfile

exec caddy run --config /etc/caddy/Caddyfile
