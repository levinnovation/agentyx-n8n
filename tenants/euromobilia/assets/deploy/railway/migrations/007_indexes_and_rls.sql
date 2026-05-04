-- ============================================================
-- Migration 007: Indexes, Constraints, and Row-Level Security
-- ============================================================
-- Performance indexes and RLS policies for multi-tenant safety.
-- RLS is applied to better_auth tables so that even if a service
-- connects with a broad connection string, it only sees data for
-- its own tenant context.
--
-- Note: RLS requires that each query sets the tenant context
-- via SET LOCAL app.current_tenant = 'euromobilia' or similar.
-- The auth-service enforces this.
-- ============================================================

SET search_path TO better_auth;

-- ------------------------------------------------------------
-- Additional performance indexes
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
CREATE INDEX IF NOT EXISTS idx_user_active ON "user"(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_last_sign_in ON "user"(last_sign_in_at);
CREATE INDEX IF NOT EXISTS idx_user_name_trgm ON "user" USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_session_expired ON "session"(expires_at) WHERE expires_at < NOW();
CREATE INDEX IF NOT EXISTS idx_account_expires ON "account"(access_token_expires_at);

CREATE INDEX IF NOT EXISTS idx_org_slug ON "organization"(slug);
CREATE INDEX IF NOT EXISTS idx_org_tenant ON "organization"(tenant_id);
CREATE INDEX IF NOT EXISTS idx_org_active ON "organization"(is_active);

CREATE INDEX IF NOT EXISTS idx_member_role ON "member"(role);
CREATE INDEX IF NOT EXISTS idx_invitation_expires ON "invitation"(expires_at) WHERE status = 'pending';

-- Enable trigram extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ------------------------------------------------------------
-- Row-Level Security (RLS) on core tables
-- ------------------------------------------------------------

-- Enable RLS
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "member" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization" ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner (bypass only via SECURITY DEFINER functions)
ALTER TABLE "user" FORCE ROW LEVEL SECURITY;
ALTER TABLE "session" FORCE ROW LEVEL SECURITY;
ALTER TABLE "account" FORCE ROW LEVEL SECURITY;
ALTER TABLE "member" FORCE ROW LEVEL SECURITY;
ALTER TABLE "organization" FORCE ROW LEVEL SECURITY;

-- Tenant isolation policy: users can only see data for the current tenant org
-- This requires that the auth-service sets the tenant context before each query.

CREATE OR REPLACE FUNCTION better_auth.current_tenant_id()
RETURNS UUID AS $$
DECLARE
    v_tenant_slug TEXT;
    v_tenant_id UUID;
BEGIN
    v_tenant_slug := current_setting('app.current_tenant', TRUE);
    IF v_tenant_slug IS NULL OR v_tenant_slug = '' THEN
        RETURN NULL;
    END IF;
    SELECT id INTO v_tenant_id FROM "organization" WHERE tenant_id = v_tenant_slug LIMIT 1;
    RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Policy: users — show only users who are members of the current tenant org
CREATE POLICY tenant_user_isolation ON "user"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "member" m
            JOIN "organization" o ON o.id = m.organization_id
            WHERE m.user_id = "user".id
              AND o.id = better_auth.current_tenant_id()
        )
        OR "user".id = current_setting('app.current_user_id', TRUE)::UUID
    );

-- Policy: sessions — show only sessions for users in current tenant
CREATE POLICY tenant_session_isolation ON "session"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "member" m
            JOIN "organization" o ON o.id = m.organization_id
            WHERE m.user_id = "session".user_id
              AND o.id = better_auth.current_tenant_id()
        )
    );

-- Policy: member — show only members of current tenant org
CREATE POLICY tenant_member_isolation ON "member"
    FOR ALL
    USING (
        organization_id = better_auth.current_tenant_id()
    );

-- Policy: organization — show only current tenant org
CREATE POLICY tenant_org_isolation ON "organization"
    FOR ALL
    USING (
        id = better_auth.current_tenant_id()
    );

COMMENT ON FUNCTION better_auth.current_tenant_id() IS 'Returns the current tenant org UUID from session variable app.current_tenant.';

-- Reset search path
SET search_path TO public;
