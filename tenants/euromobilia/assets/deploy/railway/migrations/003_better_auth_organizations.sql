-- ============================================================
-- Migration 003: Better Auth Organization Plugin Tables
-- ============================================================
-- Multi-tenancy via organizations. Each Railway tenant project
-- has one root organization matching the tenant ID (e.g. "euromobilia").
-- Users are members of organizations with roles (owner, admin, member).
--
-- Schema: better_auth
-- ============================================================

SET search_path TO better_auth, public;

-- ------------------------------------------------------------
-- Table: organization
-- Tenant-level organization. One per tenant project.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "organization" (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    logo        TEXT,
    metadata    JSONB DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Agentyx extensions
    tenant_id   TEXT NOT NULL UNIQUE,  -- maps to Railway project tenant slug
    domain      TEXT,
    plan        TEXT DEFAULT 'free',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE "organization" IS 'Tenant organization. Root of all RBAC. tenant_id = Railway tenant slug.';

-- ------------------------------------------------------------
-- Table: member
-- Many-to-many link between users and organizations with role.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "member" (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    role            TEXT NOT NULL DEFAULT 'member',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_member_org_id ON "member"(organization_id);
CREATE INDEX IF NOT EXISTS idx_member_user_id ON "member"(user_id);
CREATE INDEX IF NOT EXISTS idx_member_role ON "member"(role);

COMMENT ON TABLE "member" IS 'Organization membership with role (owner, admin, member).';

-- ------------------------------------------------------------
-- Table: invitation
-- Pending invites to organizations.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "invitation" (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
    email           TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'member',
    status          TEXT NOT NULL DEFAULT 'pending',  -- pending, accepted, rejected, cancelled
    expires_at      TIMESTAMPTZ NOT NULL,
    inviter_id      UUID REFERENCES "user"(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitation_org_id ON "invitation"(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitation_email ON "invitation"(email);
CREATE INDEX IF NOT EXISTS idx_invitation_status ON "invitation"(status);

COMMENT ON TABLE "invitation" IS 'Pending organization invitations.';

-- ------------------------------------------------------------
-- Trigger: auto-update updated_at
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_organization_updated_at ON "organization";
CREATE TRIGGER trg_organization_updated_at
    BEFORE UPDATE ON "organization"
    FOR EACH ROW EXECUTE FUNCTION better_auth.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_member_updated_at ON "member";
CREATE TRIGGER trg_member_updated_at
    BEFORE UPDATE ON "member"
    FOR EACH ROW EXECUTE FUNCTION better_auth.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_invitation_updated_at ON "invitation";
CREATE TRIGGER trg_invitation_updated_at
    BEFORE UPDATE ON "invitation"
    FOR EACH ROW EXECUTE FUNCTION better_auth.update_updated_at_column();

-- ------------------------------------------------------------
-- Constraint: valid roles
-- ------------------------------------------------------------
ALTER TABLE "member" DROP CONSTRAINT IF EXISTS chk_member_role;
ALTER TABLE "member" ADD CONSTRAINT chk_member_role
    CHECK (role IN ('owner', 'admin', 'member', 'viewer'));

ALTER TABLE "invitation" DROP CONSTRAINT IF EXISTS chk_invitation_role;
ALTER TABLE "invitation" ADD CONSTRAINT chk_invitation_role
    CHECK (role IN ('owner', 'admin', 'member', 'viewer'));

ALTER TABLE "invitation" DROP CONSTRAINT IF EXISTS chk_invitation_status;
ALTER TABLE "invitation" ADD CONSTRAINT chk_invitation_status
    CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled'));

-- Reset search path
SET search_path TO public;
