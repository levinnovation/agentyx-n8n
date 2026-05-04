#!/usr/bin/env bash
# scripts/forks/rebase-agentyx.sh
# Merge the fork's updated main into agentyx/main.

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

git checkout agentyx/main
git merge main --no-edit || {
    echo "[ERROR] Merge conflict. Resolve manually in ${TMPDIR}/repo"
    exit 1
}
git push origin agentyx/main

echo "[INFO] ${REPO} agentyx/main rebased on main."
