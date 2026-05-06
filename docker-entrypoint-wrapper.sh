#!/bin/sh
# Wrapper entrypoint that applies the Agentyx SSO runtime patch before starting n8n

node /n8n-sso-patch.js

# Debug: output the patched auth.service.js to verify the patch was applied
echo "=== PATCHED auth.service.js (first 80 lines) ==="
head -80 /usr/local/lib/node_modules/n8n/dist/auth/auth.service.js
echo "=== END PATCH ==="

# Delegate to the original upstream entrypoint
exec /docker-entrypoint.sh "$@"
