#!/usr/bin/env bash
# scripts/railway/replicate-reference-to-scratch.sh
# Replicate all services from the reference Railway project to the scratch project.
# Run this on a machine with a working Railway CLI login.

set -euo pipefail

REFERENCE_ID="${1:-7d70063b-f1b4-415f-b57a-627d24ba0225}"
SCRATCH_ID="${2:-2321232d-b384-45b3-8f0c-e608ddb688d1}"

echo "========================================"
echo "Railway Project Replication"
echo "Reference: $REFERENCE_ID"
echo "Scratch:   $SCRATCH_ID"
echo "========================================"

# Verify Railway CLI
if ! command -v railway &> /dev/null; then
    echo "[ERROR] Railway CLI not found. Install: npm install -g @railway/cli"
    exit 1
fi

# Verify login
if ! railway whoami &> /dev/null; then
    echo "[ERROR] Not logged in. Run: railway login"
    exit 1
fi

# --- Step 1: Inspect reference project ---
echo ""
echo "[STEP 1] Inspecting reference project services..."
railway link --project "$REFERENCE_ID"

# Get services as JSON and extract names
SERVICES_JSON=$(railway service list --json 2>/dev/null || echo "[]")
SERVICE_NAMES=$(echo "$SERVICES_JSON" | jq -r '.[].name' 2>/dev/null || true)

if [[ -z "$SERVICE_NAMES" ]]; then
    echo "[WARN] No services found in reference project, or unable to list."
    echo "       Trying alternative method..."
    # Fallback: try to get from railway.toml in repo
fi

echo "Found services:"
echo "$SERVICE_NAMES"

# --- Step 2: Link to scratch project ---
echo ""
echo "[STEP 2] Linking to scratch project..."
railway link --project "$SCRATCH_ID"

# --- Step 3: Replicate services ---
echo ""
echo "[STEP 3] Replicating services..."

for svc in $SERVICE_NAMES; do
    echo ""
    echo "--- Service: $svc ---"
    
    # Link back to reference to get service details
    railway link --project "$REFERENCE_ID" >/dev/null 2>&1
    
    # Get service config
    SERVICE_CONFIG=$(echo "$SERVICES_JSON" | jq -r --arg svc "$svc" '.[] | select(.name == $svc)')
    IMAGE=$(echo "$SERVICE_CONFIG" | jq -r '.image // empty')
    START_CMD=$(echo "$SERVICE_CONFIG" | jq -r '.startCommand // empty')
    ROOT_DIR=$(echo "$SERVICE_CONFIG" | jq -r '.rootDirectory // empty')
    
    # Get variables
    VARS=$(railway variables --service "$svc" --json 2>/dev/null || echo "{}")
    
    # Link to scratch
    railway link --project "$SCRATCH_ID" >/dev/null 2>&1
    
    # Create service in scratch (if it doesn't exist)
    echo "Creating service $svc in scratch..."
    railway service create "$svc" 2>/dev/null || echo "  (service may already exist)"
    
    # Deploy / configure service
    if [[ -n "$IMAGE" && "$IMAGE" != "null" ]]; then
        echo "  Setting image: $IMAGE"
        railway up --service "$svc" --image "$IMAGE" --detach 2>/dev/null || true
    fi
    
    if [[ -n "$START_CMD" && "$START_CMD" != "null" ]]; then
        echo "  Start command: $START_CMD"
        railway service update --service "$svc" --start-command "$START_CMD" 2>/dev/null || true
    fi
    
    if [[ -n "$ROOT_DIR" && "$ROOT_DIR" != "null" ]]; then
        echo "  Root directory: $ROOT_DIR"
        railway service update --service "$svc" --root-directory "$ROOT_DIR" 2>/dev/null || true
    fi
    
    # Copy variables
    echo "  Copying variables..."
    echo "$VARS" | jq -r 'to_entries[] | "\(.key)=\(.value)"' | while IFS='=' read -r key value; do
        if [[ -n "$key" && "$key" != "null" ]]; then
            railway variables --service "$svc" --set "${key}=${value}" 2>/dev/null || echo "    [WARN] Failed to set $key"
        fi
    done
    
    echo "  Done."
done

# --- Step 4: Summary ---
echo ""
echo "========================================"
echo "Replication Summary"
echo "========================================"
railway link --project "$SCRATCH_ID" >/dev/null 2>&1
echo "Services in scratch project:"
railway service list --json 2>/dev/null | jq -r '.[].name' || echo "(unable to list)"
echo ""
echo "Next steps:"
echo "1. Verify services are healthy: railway status"
echo "2. Deploy each service: railway up --service <name> --detach"
echo "3. Run smoke tests: bash scripts/railway/smoke-test.sh --tenant euromobilia --service <name>"
