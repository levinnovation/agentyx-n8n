-- ============================================================
-- Migration 004: SCIM 2.0 Provisioning Tables
-- ============================================================
-- Enables automated user provisioning from Google Workspace
-- or any SCIM-compatible IDP.
--
-- Schema: better_auth
-- ============================================================

SET search_path TO better_auth, public;

-- ------------------------------------------------------------
-- Table: scim_user_mapping
-- Maps SCIM external IDs to internal Better Auth user IDs.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "scim_user_mapping" (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id         TEXT NOT NULL,           -- SCIM "id" from IDP
    idp_source          TEXT NOT NULL DEFAULT 'google_workspace',
    user_id             UUID REFERENCES "user"(id) ON DELETE CASCADE,
    organization_id     UUID REFERENCES "organization"(id) ON DELETE CASCADE,
    raw_scim_data       JSONB,                   -- full SCIM user JSON for audit
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(external_id, idp_source)
);

CREATE INDEX IF NOT EXISTS idx_scim_user_mapping_external ON "scim_user_mapping"(external_id, idp_source);
CREATE INDEX IF NOT EXISTS idx_scim_user_mapping_user ON "scim_user_mapping"(user_id);

COMMENT ON TABLE "scim_user_mapping" IS 'SCIM external ID to internal user mapping.';

-- ------------------------------------------------------------
-- Table: scim_group_mapping
-- Maps SCIM groups to organizations/roles.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "scim_group_mapping" (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_group_id   TEXT NOT NULL,
    idp_source          TEXT NOT NULL DEFAULT 'google_workspace',
    organization_id     UUID REFERENCES "organization"(id) ON DELETE CASCADE,
    role_mapping        TEXT NOT NULL DEFAULT 'member',  -- role to assign members
    group_name          TEXT,
    raw_scim_data       JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(external_group_id, idp_source)
);

CREATE INDEX IF NOT EXISTS idx_scim_group_external ON "scim_group_mapping"(external_group_id, idp_source);

COMMENT ON TABLE "scim_group_mapping" IS 'SCIM group to organization/role mapping.';

-- ------------------------------------------------------------
-- Table: scim_sync_log
-- Audit log for every SCIM operation.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "scim_sync_log" (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation       TEXT NOT NULL,           -- CREATE, UPDATE, DELETE, SYNC
    resource_type   TEXT NOT NULL,           -- User, Group
    external_id     TEXT,
    status          TEXT NOT NULL,           -- success, error, skipped
    status_code     INTEGER,
    request_payload JSONB,
    response_body   JSONB,
    error_message   TEXT,
    processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scim_sync_log_op ON "scim_sync_log"(operation, processed_at);
CREATE INDEX IF NOT EXISTS idx_scim_sync_log_status ON "scim_sync_log"(status, processed_at);

COMMENT ON TABLE "scim_sync_log" IS 'Audit trail for SCIM provisioning operations.';

-- ------------------------------------------------------------
-- Table: scim_api_key
-- Bearer tokens for IDP authentication to our SCIM endpoints.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "scim_api_key" (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    token_hash      TEXT NOT NULL,           -- bcrypt/argon2 hash of bearer token
    token_prefix    TEXT,                    -- first 8 chars for UI display
    scopes          TEXT[] DEFAULT '{scim:read,scim:write}',
    last_used_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID REFERENCES "user"(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_scim_api_key_org ON "scim_api_key"(organization_id);

COMMENT ON TABLE "scim_api_key" IS 'API keys for SCIM IDP integrations.';

-- ------------------------------------------------------------
-- Constraints
-- ------------------------------------------------------------
ALTER TABLE "scim_sync_log" DROP CONSTRAINT IF EXISTS chk_scim_sync_log_operation;
ALTER TABLE "scim_sync_log" ADD CONSTRAINT chk_scim_sync_log_operation
    CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE', 'SYNC'));

ALTER TABLE "scim_sync_log" DROP CONSTRAINT IF EXISTS chk_scim_sync_log_resource;
ALTER TABLE "scim_sync_log" ADD CONSTRAINT chk_scim_sync_log_resource
    CHECK (resource_type IN ('User', 'Group'));

ALTER TABLE "scim_sync_log" DROP CONSTRAINT IF EXISTS chk_scim_sync_log_status;
ALTER TABLE "scim_sync_log" ADD CONSTRAINT chk_scim_sync_log_status
    CHECK (status IN ('success', 'error', 'skipped'));

-- Triggers
DROP TRIGGER IF EXISTS trg_scim_user_mapping_updated_at ON "scim_user_mapping";
CREATE TRIGGER trg_scim_user_mapping_updated_at
    BEFORE UPDATE ON "scim_user_mapping"
    FOR EACH ROW EXECUTE FUNCTION better_auth.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_scim_group_mapping_updated_at ON "scim_group_mapping";
CREATE TRIGGER trg_scim_group_mapping_updated_at
    BEFORE UPDATE ON "scim_group_mapping"
    FOR EACH ROW EXECUTE FUNCTION better_auth.update_updated_at_column();

-- Reset search path
SET search_path TO public;
