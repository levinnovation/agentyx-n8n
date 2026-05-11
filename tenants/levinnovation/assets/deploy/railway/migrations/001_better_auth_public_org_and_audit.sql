-- ============================================================
-- Migration 001: Better Auth organization + audit tables
-- ============================================================
-- Purpose:
-- - Add organization membership tables compatible with the
--   current production Better Auth schema (public.* tables).
-- - Add scim_sync_log table used for onboarding/audit events.
-- - Seed levinnovation organization and backfill existing users
--   as members so current access is preserved.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS better_auth;

CREATE OR REPLACE FUNCTION better_auth.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS better_auth.organization (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo TEXT,
  metadata TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id TEXT UNIQUE,
  domain TEXT,
  plan TEXT DEFAULT 'free',
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS better_auth.member (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES better_auth.organization(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_member_org_id ON better_auth.member(organization_id);
CREATE INDEX IF NOT EXISTS idx_member_user_id ON better_auth.member(user_id);
CREATE INDEX IF NOT EXISTS idx_member_role ON better_auth.member(role);

CREATE TABLE IF NOT EXISTS better_auth.invitation (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES better_auth.organization(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'pending',
  team_id TEXT,
  inviter_id TEXT REFERENCES public."user"(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitation_org_id ON better_auth.invitation(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitation_email ON better_auth.invitation(email);
CREATE INDEX IF NOT EXISTS idx_invitation_status ON better_auth.invitation(status);

ALTER TABLE better_auth.member
  DROP CONSTRAINT IF EXISTS chk_member_role;
ALTER TABLE better_auth.member
  ADD CONSTRAINT chk_member_role CHECK (role IN ('owner', 'admin', 'member', 'viewer', 'rejected'));

ALTER TABLE better_auth.invitation
  DROP CONSTRAINT IF EXISTS chk_invitation_role;
ALTER TABLE better_auth.invitation
  ADD CONSTRAINT chk_invitation_role CHECK (role IN ('owner', 'admin', 'member', 'viewer'));

ALTER TABLE better_auth.invitation
  DROP CONSTRAINT IF EXISTS chk_invitation_status;
ALTER TABLE better_auth.invitation
  ADD CONSTRAINT chk_invitation_status CHECK (status IN ('pending', 'accepted', 'rejected', 'canceled'));

CREATE TABLE IF NOT EXISTS better_auth.scim_sync_log (
  id TEXT PRIMARY KEY DEFAULT ('slog_' || substr(md5(random()::text || clock_timestamp()::text), 1, 24)),
  operation TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  external_id TEXT,
  status TEXT NOT NULL,
  status_code INTEGER,
  request_payload JSONB,
  response_body JSONB,
  error_message TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scim_sync_log_op ON better_auth.scim_sync_log(operation, processed_at);
CREATE INDEX IF NOT EXISTS idx_scim_sync_log_status ON better_auth.scim_sync_log(status, processed_at);

ALTER TABLE better_auth.scim_sync_log
  DROP CONSTRAINT IF EXISTS chk_scim_sync_log_operation;
ALTER TABLE better_auth.scim_sync_log
  ADD CONSTRAINT chk_scim_sync_log_operation CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE', 'SYNC'));

ALTER TABLE better_auth.scim_sync_log
  DROP CONSTRAINT IF EXISTS chk_scim_sync_log_resource;
ALTER TABLE better_auth.scim_sync_log
  ADD CONSTRAINT chk_scim_sync_log_resource CHECK (resource_type IN ('User', 'Group'));

ALTER TABLE better_auth.scim_sync_log
  DROP CONSTRAINT IF EXISTS chk_scim_sync_log_status;
ALTER TABLE better_auth.scim_sync_log
  ADD CONSTRAINT chk_scim_sync_log_status CHECK (status IN ('success', 'error', 'skipped', 'pending'));

DROP TRIGGER IF EXISTS trg_organization_updated_at ON better_auth.organization;
CREATE TRIGGER trg_organization_updated_at
BEFORE UPDATE ON better_auth.organization
FOR EACH ROW EXECUTE FUNCTION better_auth.touch_updated_at();

DROP TRIGGER IF EXISTS trg_member_updated_at ON better_auth.member;
CREATE TRIGGER trg_member_updated_at
BEFORE UPDATE ON better_auth.member
FOR EACH ROW EXECUTE FUNCTION better_auth.touch_updated_at();

DROP TRIGGER IF EXISTS trg_invitation_updated_at ON better_auth.invitation;
CREATE TRIGGER trg_invitation_updated_at
BEFORE UPDATE ON better_auth.invitation
FOR EACH ROW EXECUTE FUNCTION better_auth.touch_updated_at();

INSERT INTO better_auth.organization (id, name, slug, tenant_id, domain, is_active)
VALUES ('levinnovation', 'Levinnovation', 'levinnovation', 'levinnovation', 'levinnovation.com', TRUE)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    tenant_id = EXCLUDED.tenant_id,
    domain = EXCLUDED.domain,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

INSERT INTO better_auth.member (id, organization_id, user_id, role, created_at, updated_at)
SELECT
  'm_' || substr(md5(u.id || '|' || now()::text), 1, 24),
  'levinnovation',
  u.id,
  CASE
    WHEN COALESCE(u.role, '') IN ('owner', 'admin') THEN u.role
    ELSE 'member'
  END,
  NOW(),
  NOW()
FROM public."user" u
WHERE NOT EXISTS (
  SELECT 1
  FROM better_auth.member m
  WHERE m.organization_id = 'levinnovation'
    AND m.user_id = u.id
);
