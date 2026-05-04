#!/usr/bin/env bash
# scripts/railway/_lib.sh
# Shared helpers for the Railway CLI toolkit.

set -euo pipefail

RAILWAY_MIN_VERSION="3.20"

require_env() {
    local name="$1"
    if [[ -z "${!name:-}" ]]; then
        echo "[ERROR] Environment variable $name is required." >&2
        exit 1
    fi
}

check_railway_version() {
    local version
    version=$(railway --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+' | head -n1 || true)
    if [[ -z "$version" ]]; then
        echo "[ERROR] railway CLI not found or version unreadable." >&2
        exit 1
    fi
    # Simple semver compare (major.minor only)
    local min_major min_cur major minor
    min_major=$(echo "$RAILWAY_MIN_VERSION" | cut -d. -f1)
    min_cur=$(echo "$RAILWAY_MIN_VERSION" | cut -d. -f2)
    major=$(echo "$version" | cut -d. -f1)
    minor=$(echo "$version" | cut -d. -f2)
    if [[ "$major" -lt "$min_major" ]] || { [[ "$major" -eq "$min_major" && "$minor" -lt "$min_cur" ]]; }; then
        echo "[ERROR] railway CLI version $version is below minimum $RAILWAY_MIN_VERSION" >&2
        exit 1
    fi
    echo "[INFO] railway CLI version: $version"
}

rw() {
    echo "[CMD] railway $*"
    railway "$@"
}

retry() {
    local n=1 max=3 delay=5
    while true; do
        if "$@"; then
            return 0
        fi
        if [[ $n -ge $max ]]; then
            echo "[ERROR] Command failed after $max attempts." >&2
            return 1
        fi
        n=$((n + 1))
        echo "[WARN] Retry $n/$max in ${delay}s..."
        sleep $delay
    done
}

get_tenant_railway_dir() {
    local tenant="$1"
    echo "tenants/${tenant}/assets/deploy/railway"
}
