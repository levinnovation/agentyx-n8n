-- ============================================================
-- Migration 006: Service Shadow Tables
-- ============================================================
-- Each downstream app (LibreChat, Paperclip, Flowise, Langfuse)
-- keeps a thin shadow table in its own schema keyed by Better Auth
-- user ID (sub). App-specific fields live here; identity lives in
-- better_auth.user.
--
-- These tables are created in each service schema. The auth-service
-- syncs user creation/deactivation events to maintain consistency.
-- ============================================================

-- ------------------------------------------------------------
-- librechat: user_shadow
-- ------------------------------------------------------------
SET search_path TO librechat;

CREATE TABLE IF NOT EXISTS user_shadow (
    id              UUID PRIMARY KEY,  -- matches better_auth.user.id
    email           TEXT NOT NULL,
    name            TEXT,
    avatar          TEXT,
    role            TEXT DEFAULT 'user',  -- librechat-specific role
    preferences     JSONB DEFAULT '{}'::jsonb,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_librechat_shadow_email ON user_shadow(email);
CREATE INDEX IF NOT EXISTS idx_librechat_shadow_active ON user_shadow(is_active);

COMMENT ON TABLE user_shadow IS 'LibreChat-specific user data. Canonical identity in better_auth.user.';

-- Trigger
CREATE OR REPLACE FUNCTION librechat.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_librechat_shadow_updated_at ON user_shadow;
CREATE TRIGGER trg_librechat_shadow_updated_at
    BEFORE UPDATE ON user_shadow
    FOR EACH ROW EXECUTE FUNCTION librechat.update_updated_at();


-- ------------------------------------------------------------
-- paperclip: user_shadow
-- ------------------------------------------------------------
SET search_path TO paperclip;

CREATE TABLE IF NOT EXISTS user_shadow (
    id              UUID PRIMARY KEY,
    email           TEXT NOT NULL,
    name            TEXT,
    team_id         UUID,  -- paperclip-specific team/org
    permissions     TEXT[] DEFAULT '{}',
    settings        JSONB DEFAULT '{}'::jsonb,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paperclip_shadow_email ON user_shadow(email);
CREATE INDEX IF NOT EXISTS idx_paperclip_shadow_team ON user_shadow(team_id);

COMMENT ON TABLE user_shadow IS 'Paperclip-specific user data. Canonical identity in better_auth.user.';

DROP TRIGGER IF EXISTS trg_paperclip_shadow_updated_at ON user_shadow;
CREATE TRIGGER trg_paperclip_shadow_updated_at
    BEFORE UPDATE ON user_shadow
    FOR EACH ROW EXECUTE FUNCTION librechat.update_updated_at();  -- re-use same fn


-- ------------------------------------------------------------
-- flowise: user_shadow
-- ------------------------------------------------------------
SET search_path TO flowise;

CREATE TABLE IF NOT EXISTS user_shadow (
    id              UUID PRIMARY KEY,
    email           TEXT NOT NULL,
    name            TEXT,
    role            TEXT DEFAULT 'user',  -- flowise: admin | user
    api_keys        JSONB DEFAULT '[]'::jsonb,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flowise_shadow_email ON user_shadow(email);

COMMENT ON TABLE user_shadow IS 'Flowise-specific user data. Canonical identity in better_auth.user. License permitting.';

DROP TRIGGER IF EXISTS trg_flowise_shadow_updated_at ON user_shadow;
CREATE TRIGGER trg_flowise_shadow_updated_at
    BEFORE UPDATE ON user_shadow
    FOR EACH ROW EXECUTE FUNCTION librechat.update_updated_at();


-- ------------------------------------------------------------
-- langfuse: user_shadow
-- ------------------------------------------------------------
SET search_path TO langfuse;

CREATE TABLE IF NOT EXISTS user_shadow (
    id              UUID PRIMARY KEY,
    email           TEXT NOT NULL,
    name            TEXT,
    auth_provider   TEXT DEFAULT 'better-auth',
    external_sub    TEXT,  -- Better Auth user ID
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_langfuse_shadow_email ON user_shadow(email);
CREATE INDEX IF NOT EXISTS idx_langfuse_shadow_sub ON user_shadow(external_sub);

COMMENT ON TABLE user_shadow IS 'Langfuse-specific user data. Canonical identity in better_auth.user.';

DROP TRIGGER IF EXISTS trg_langfuse_shadow_updated_at ON user_shadow;
CREATE TRIGGER trg_langfuse_shadow_updated_at
    BEFORE UPDATE ON user_shadow
    FOR EACH ROW EXECUTE FUNCTION librechat.update_updated_at();


-- ------------------------------------------------------------
-- agentyx_portal: user_shadow
-- ------------------------------------------------------------
SET search_path TO agentyx_portal;

CREATE TABLE IF NOT EXISTS user_shadow (
    id              UUID PRIMARY KEY,
    email           TEXT NOT NULL,
    name            TEXT,
    dashboard_layout JSONB DEFAULT '{}'::jsonb,
    notification_prefs JSONB DEFAULT '{}'::jsonb,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_shadow_email ON user_shadow(email);

COMMENT ON TABLE user_shadow IS 'Portal-specific user data. Canonical identity in better_auth.user.';

DROP TRIGGER IF EXISTS trg_portal_shadow_updated_at ON user_shadow;
CREATE TRIGGER trg_portal_shadow_updated_at
    BEFORE UPDATE ON user_shadow
    FOR EACH ROW EXECUTE FUNCTION librechat.update_updated_at();


-- Reset search path
SET search_path TO public;
