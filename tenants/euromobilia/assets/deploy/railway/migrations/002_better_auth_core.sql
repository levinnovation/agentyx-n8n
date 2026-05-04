-- ============================================================
-- Migration 002: Better Auth Core Tables
-- ============================================================
-- Canonical user identity store for the tenant.
-- All other services read user data from here via the auth-service API.
--
-- Schema: better_auth
-- Based on Better Auth v1.2+ PostgreSQL adapter expectations.
-- ============================================================

SET search_path TO better_auth;

-- ------------------------------------------------------------
-- Table: user
-- Canonical user record. Single source of truth for identity.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "user" (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           TEXT NOT NULL UNIQUE,
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    name            TEXT,
    image           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Agentyx extensions
    phone           TEXT,
    locale          TEXT DEFAULT 'en',
    timezone        TEXT DEFAULT 'UTC',
    metadata        JSONB DEFAULT '{}'::jsonb,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_sign_in_at TIMESTAMPTZ
);

COMMENT ON TABLE "user" IS 'Canonical user identity. All apps reference this via sub (user.id).';

-- ------------------------------------------------------------
-- Table: session
-- Active sessions. Cleaned up periodically by auth-service.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "session" (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    token           TEXT NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_user_id ON "session"(user_id);
CREATE INDEX IF NOT EXISTS idx_session_token ON "session"(token);
CREATE INDEX IF NOT EXISTS idx_session_expires_at ON "session"(expires_at);

COMMENT ON TABLE "session" IS 'Active user sessions. Expired rows purged by auth-service cron.';

-- ------------------------------------------------------------
-- Table: account
-- OAuth / social provider account links (Google, etc.)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "account" (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    account_id              TEXT NOT NULL,
    provider_id             TEXT NOT NULL,
    access_token            TEXT,
    refresh_token           TEXT,
    id_token                TEXT,
    access_token_expires_at TIMESTAMPTZ,
    refresh_token_expires_at TIMESTAMPTZ,
    scope                   TEXT,
    password                TEXT,               -- for credential-based accounts
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, provider_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_account_user_id ON "account"(user_id);
CREATE INDEX IF NOT EXISTS idx_account_provider ON "account"(provider_id, account_id);

COMMENT ON TABLE "account" IS 'OAuth provider account links per user.';

-- ------------------------------------------------------------
-- Table: verification
-- Email verification, password reset, magic link tokens
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "verification" (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier  TEXT NOT NULL,
    value       TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_identifier ON "verification"(identifier);
CREATE INDEX IF NOT EXISTS idx_verification_expires ON "verification"(expires_at);

COMMENT ON TABLE "verification" IS 'One-time verification tokens (email verify, password reset).';

-- ------------------------------------------------------------
-- Table: jwks
-- JSON Web Key Set for JWT signing/verification
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "jwks" (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    public_key  TEXT NOT NULL,
    private_key TEXT NOT NULL,  -- encrypted at rest in production
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE "jwks" IS 'JWT signing keys. Private key must be encrypted at application layer.';

-- ------------------------------------------------------------
-- Trigger: auto-update updated_at
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION better_auth.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_updated_at ON "user";
CREATE TRIGGER trg_user_updated_at
    BEFORE UPDATE ON "user"
    FOR EACH ROW EXECUTE FUNCTION better_auth.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_session_updated_at ON "session";
CREATE TRIGGER trg_session_updated_at
    BEFORE UPDATE ON "session"
    FOR EACH ROW EXECUTE FUNCTION better_auth.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_account_updated_at ON "account";
CREATE TRIGGER trg_account_updated_at
    BEFORE UPDATE ON "account"
    FOR EACH ROW EXECUTE FUNCTION better_auth.update_updated_at_column();

-- Reset search path
SET search_path TO public;
