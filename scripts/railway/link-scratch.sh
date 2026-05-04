#!/usr/bin/env bash
# scripts/railway/link-scratch.sh
# Link local Railway CLI to the scratch project for quick dev iteration.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_lib.sh"

require_env RAILWAY_TOKEN

echo "[INFO] Linking to scratch project: 2321232d-b384-45b3-8f0c-e608ddb688d1"
railway link --project 2321232d-b384-45b3-8f0c-e608ddb688d1
echo "[INFO] Done. Run 'railway status' to verify."
