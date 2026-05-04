#!/usr/bin/env bash
# scripts/railway/diff-projects.sh
# Compare services and variables between the reference and scratch Railway projects.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_lib.sh"

REFERENCE="${1:-7d70063b-f1b4-415f-b57a-627d24ba0225}"
SCRATCH="${2:-2321232d-b384-45b3-8f0c-e608ddb688d1}"

require_env RAILWAY_TOKEN

echo "========================================"
echo "Reference project: $REFERENCE"
echo "Scratch project:   $SCRATCH"
echo "========================================"

echo ""
echo "--- Reference services ---"
railway link --project "$REFERENCE" >/dev/null 2>&1
railway service list --json 2>/dev/null | jq -r '.[].name' || echo "(failed to list)"

echo ""
echo "--- Scratch services ---"
railway link --project "$SCRATCH" >/dev/null 2>&1
railway service list --json 2>/dev/null | jq -r '.[].name' || echo "(failed to list)"

echo ""
echo "Done. Re-run with explicit IDs: $0 <reference-id> <scratch-id>"
