#!/usr/bin/env bash
# migrate.sh
# Run PostgreSQL migrations for the shared tenant database.
#
# Usage:
#   ./migrate.sh <database_url> [step]
#
# Examples:
#   ./migrate.sh postgres://user:pass@host:5432/db          # run all pending
#   ./migrate.sh postgres://user:pass@host:5432/db 004      # run up to step 004
#   ./migrate.sh postgres://user:pass@host:5432/db reset    # reset all

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_URL="${1:-}"
TARGET="${2:-all}"

if [[ -z "$DB_URL" ]]; then
    echo "Usage: $0 <database_url> [step|reset]"
    echo ""
    echo "Examples:"
    echo "  $0 postgres://user:pass@host:5432/db"
    echo "  $0 postgres://user:pass@host:5432/db 004"
    echo "  $0 postgres://user:pass@host:5432/db reset"
    exit 1
fi

# Extract connection info for psql
export PGPASSWORD=$(echo "$DB_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

# Create migrations tracking table
psql "$DB_URL" -v ON_ERROR_STOP=1 <<'EOF'
CREATE SCHEMA IF NOT EXISTS _migrations;
CREATE TABLE IF NOT EXISTS _migrations.applied (
    version     TEXT PRIMARY KEY,
    filename    TEXT NOT NULL,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checksum    TEXT
);
EOF

# Helper: compute md5 checksum
checksum() {
    md5 -q "$1" 2>/dev/null || md5sum "$1" | awk '{print $1}'
}

# Run a single migration
run_migration() {
    local file="$1"
    local version=$(basename "$file" | sed 's/_.*//')
    local filename=$(basename "$file")

    # Check if already applied
    local already_applied
    already_applied=$(psql "$DB_URL" -tAc "SELECT 1 FROM _migrations.applied WHERE version = '$version'" 2>/dev/null || true)

    if [[ "$already_applied" == "1" ]]; then
        echo "  [SKIP] $filename (already applied)"
        return
    fi

    echo "  [APPLY] $filename ..."
    psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$file"

    local cs
    cs=$(checksum "$file")
    psql "$DB_URL" -c "INSERT INTO _migrations.applied (version, filename, checksum) VALUES ('$version', '$filename', '$cs')"
    echo "  [OK] $filename"
}

# Reset all migrations
if [[ "$TARGET" == "reset" ]]; then
    echo "[WARN] Resetting all migrations..."
    read -p "Are you sure? Type 'yes' to continue: " confirm
    if [[ "$confirm" != "yes" ]]; then
        echo "Aborted."
        exit 1
    fi

    # Drop all schemas we created (except _migrations)
    psql "$DB_URL" -c "
        DROP SCHEMA IF EXISTS n8n, langfuse, librechat, paperclip, better_auth, flowise, agentyx_portal CASCADE;
        DROP TABLE IF EXISTS _migrations.applied;
        DROP SCHEMA IF EXISTS _migrations;
    "
    echo "[OK] All migrations reset."
    exit 0
fi

# Run migrations
echo "========================================"
echo "Running migrations"
echo "Database: $(echo "$DB_URL" | sed 's/:\/\/[^:]*:[^@]*@/:\/\/***:***@/')"
echo "Target:   $TARGET"
echo "========================================"

for file in "$SCRIPT_DIR"/[0-9][0-9][0-9]_*.sql; do
    [[ -e "$file" ]] || continue

    version=""
    version=$(basename "$file" | sed 's/_.*//')

    if [[ "$TARGET" != "all" && "$version" > "$TARGET" ]]; then
        echo "  [STOP] Reached target $TARGET"
        break
    fi

    run_migration "$file"
done

echo ""
echo "========================================"
echo "Migration complete"
echo "========================================"
psql "$DB_URL" -c "SELECT version, filename, applied_at FROM _migrations.applied ORDER BY version"
