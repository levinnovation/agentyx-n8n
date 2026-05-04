#!/usr/bin/env bash
# scripts/forks/sync-upstream.sh
# Fetch upstream and merge into the fork's main branch.

set -euo pipefail

NAME=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --name) NAME="$2"; shift 2 ;;
        *) echo "Usage: $0 --name <agentyx-x>"; exit 1 ;;
    esac
done

if [[ -z "$NAME" ]]; then
    echo "Usage: $0 --name <agentyx-x>"
    exit 1
fi

REPO="levinnovation/${NAME}"
TMPDIR=$(mktemp -d)

echo "[INFO] Cloning ${REPO}..."
git clone "https://github.com/${REPO}.git" "${TMPDIR}/repo"
cd "${TMPDIR}/repo"

# Read upstream from forks.yaml
UPSTREAM=$(grep -A5 "name: ${NAME}" templates/assets/railway-tenant-stack/forks.yaml | grep upstream | awk '{print $2}' || true)
if [[ -z "$UPSTREAM" ]]; then
    echo "[ERROR] Could not find upstream for ${NAME} in forks.yaml"
    exit 1
fi

git remote add upstream "${UPSTREAM}" 2>/dev/null || true
git fetch upstream

git checkout main
git merge upstream/main --no-edit || {
    echo "[ERROR] Merge conflict. Resolve manually in ${TMPDIR}/repo"
    exit 1
}
git push origin main

echo "[INFO] ${REPO} main synced with upstream."
