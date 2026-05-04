#!/usr/bin/env bash
# scripts/forks/bootstrap-fork.sh
# Create a fork repo under levinnovation/, set up agentyx/main branch, MAINTAINERS.md, and register in forks.yaml.

set -euo pipefail

UPSTREAM=""
NAME=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --upstream) UPSTREAM="$2"; shift 2 ;;
        --name) NAME="$2"; shift 2 ;;
        *) echo "Usage: $0 --upstream <url> --name <agentyx-x>"; exit 1 ;;
    esac
done

if [[ -z "$UPSTREAM" || -z "$NAME" ]]; then
    echo "Usage: $0 --upstream <url> --name <agentyx-x>"
    exit 1
fi

REPO="levinnovation/${NAME}"

echo "[INFO] Creating fork: ${REPO} from ${UPSTREAM}"

# Create repo on GitHub (requires gh CLI auth)
gh repo create "${REPO}" --public --description "Agentyx fork of ${UPSTREAM}" || {
    echo "[WARN] Repo may already exist; continuing."
}

# Clone and set up remotes
TMPDIR=$(mktemp -d)
git clone --mirror "${UPSTREAM}" "${TMPDIR}/mirror"
cd "${TMPDIR}/mirror"

# Push mirror to our repo
git remote add agentyx "https://github.com/${REPO}.git"
git push agentyx --mirror || true

# Create agentyx/main branch
git remote update
git checkout -b agentyx/main origin/HEAD || git checkout -b agentyx/main

# Add MAINTAINERS.md
cat > MAINTAINERS.md <<'EOF'
# Maintainer Notes

## Upstream sync

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

## Apply our patch

```bash
git checkout agentyx/main
git merge main
# resolve conflicts
```

## Deploy

Railway tracks `agentyx/main`; auto-deploy on push.
EOF

git add MAINTAINERS.md
git commit -m "chore: add MAINTAINERS.md and agentyx branch setup"
git push agentyx agentyx/main

echo "[INFO] Fork ${REPO} ready. Branch agentyx/main created."
echo "[INFO] Register in templates/assets/railway-tenant-stack/forks.yaml"
