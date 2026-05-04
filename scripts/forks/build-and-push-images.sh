#!/usr/bin/env bash
# scripts/forks/build-and-push-images.sh
# Build Docker images from levinnovation/agentyx-* forks and push to GHCR.
# Run this locally when Railway GitHub App cannot be installed on the org.
#
# Usage:
#   export GHCR_TOKEN=<GitHub personal access token with packages:write>
#   export GHCR_USER=<GitHub username>
#   bash scripts/forks/build-and-push-images.sh [service-name|all]
#
# Examples:
#   bash scripts/forks/build-and-push-images.sh all        # build all
#   bash scripts/forks/build-and-push-images.sh auth       # build agentyx-auth-service only

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${1:-all}"

# Config
GHCR_USER="${GHCR_USER:-}"
GHCR_TOKEN="${GHCR_TOKEN:-}"
ORG="levinnovation"

if [[ -z "$GHCR_TOKEN" || -z "$GHCR_USER" ]]; then
    echo "[ERROR] GHCR_USER and GHCR_TOKEN must be set."
    echo "        Generate a token at: https://github.com/settings/tokens"
    echo "        Required scopes: read:packages, write:packages, delete:packages"
    exit 1
fi

# Login to GHCR
echo "[INFO] Logging in to GHCR..."
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin

# Service definitions: name|repo|dockerfile_path|context_path
SERVICES=(
    "auth|agentyx-auth-service|Dockerfile|."
    "portal|agentyx-client-portal|Dockerfile|."
    "librechat|agentyx-librechat|Dockerfile|."
    "flowise|agentyx-flowise|Dockerfile|."
    "paperclip|agentyx-paperclip|Dockerfile|."
)

build_service() {
    local name="$1"
    local repo="$2"
    local dockerfile="$3"
    local context="$4"
    
    local full_repo="https://github.com/$ORG/$repo.git"
    local image_tag="ghcr.io/$ORG/$repo:latest"
    local sha_tag="ghcr.io/$ORG/$repo:$(date +%Y%m%d-%H%M%S)"
    
    echo ""
    echo "========================================"
    echo "Building: $name ($repo)"
    echo "========================================"
    
    # Clone to temp dir
    local tmpdir
    tmpdir=$(mktemp -d)
    echo "[INFO] Cloning $full_repo..."
    git clone --depth 1 --branch agentyx/main "$full_repo" "$tmpdir" 2>/dev/null || {
        echo "[WARN] agentyx/main branch not found, trying main..."
        git clone --depth 1 --branch main "$full_repo" "$tmpdir"
    }
    
    cd "$tmpdir"
    
    # Build
    echo "[INFO] Building image..."
    docker build -f "$dockerfile" -t "$image_tag" -t "$sha_tag" "$context"
    
    # Push
    echo "[INFO] Pushing to GHCR..."
    docker push "$image_tag"
    docker push "$sha_tag"
    
    echo "[OK] $name built and pushed:"
    echo "     $image_tag"
    echo "     $sha_tag"
    
    # Cleanup
    rm -rf "$tmpdir"
}

# Build requested services
for entry in "${SERVICES[@]}"; do
    name="${entry%%|*}"
    rest="${entry#*|}"
    repo="${rest%%|*}"
    rest="${rest#*|}"
    dockerfile="${rest%%|*}"
    context="${rest##*|}"
    
    if [[ "$TARGET" != "all" && "$TARGET" != "$name" ]]; then
        continue
    fi
    
    build_service "$name" "$repo" "$dockerfile" "$context"
done

echo ""
echo "========================================"
echo "Build Complete"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Update Railway services to use the new GHCR images:"
echo "   bash scripts/railway/deploy-ghcr-images.sh"
