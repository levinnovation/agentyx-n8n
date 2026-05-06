#!/bin/sh
# Wrapper entrypoint that applies the Agentyx SSO runtime patch before starting n8n

node /n8n-sso-patch.js

# Delegate to the original upstream entrypoint
exec /docker-entrypoint.sh "$@"
