#!/usr/bin/env bash
# scripts/railway/export-template-vars.sh
# Export environment variables from the client-demo-agentyx project in a format
# suitable for configuring a Railway template. Run this while linked to the
# reference project.
#
# Usage:
#   cd tenants/euromobilia/assets/deploy/railway   # or any linked dir
#   bash scripts/railway/export-template-vars.sh > template-vars.json

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_lib.sh"

check_railway_version

PROJECT_INFO=$(rw status --json 2>/dev/null)
PROJECT_NAME=$(echo "$PROJECT_INFO" | jq -r '.name // empty')
PROJECT_ID=$(echo "$PROJECT_INFO" | jq -r '.id // empty')

if [[ "$PROJECT_NAME" != "client-demo-agentyx" ]]; then
    echo "[WARN] Current project is '$PROJECT_NAME', not 'client-demo-agentyx'."
    echo "[WARN] Results may not match the canonical reference."
fi

echo "{"
echo "  \"project\": \"$PROJECT_NAME\","
echo "  \"projectId\": \"$PROJECT_ID\","
echo "  \"exportedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
echo "  \"services\": {"

# Get all service names from the project
mapfile -t SERVICES < <(echo "$PROJECT_INFO" | jq -r '.services.edges[].node.name')

FIRST=1
for svc in "${SERVICES[@]}"; do
    # Skip legacy auth service
    if [[ "$svc" == "agx-demo-auth" ]]; then
        continue
    fi

    if [[ $FIRST -eq 1 ]]; then
        FIRST=0
    else
        echo ","
    fi

    # Clean service name for template (remove agx-demo- prefix)
    TEMPLATE_NAME="${svc#agx-demo-}"
    if [[ "$TEMPLATE_NAME" == "$svc" ]]; then
        TEMPLATE_NAME="$svc"
    fi

    echo -n "    \"$TEMPLATE_NAME\": {"

    # Get variables
    VARS_JSON=$(rw variables --service "$svc" --json 2>/dev/null || echo '{}')

    # Filter out Railway auto-generated variables and format
    FILTERED=$(echo "$VARS_JSON" | jq 'with_entries(select(.key | test("^RAILWAY_") | not))')

    # Categorize variables
    PRESET=$(echo "$FILTERED" | jq 'with_entries(select(.value | test("^\\$\\{\\{secret\\(") | not) | select(.value | test("^\\$\\{\\{Postgres\\.") | not) | select(.value | test("^\\$\\{\\{MongoDB\\.") | not) | select(.value | test("^\\$\\{\\{RAILWAY_") | not))')

    echo "\"variables\": $FILTERED"
    echo -n "    }"
done

echo ""
echo "  }"
echo "}"
