-- Migration: provision tenant operators in n8n.user with global:owner role
-- Applied: 2026-05-13
--
-- Context
-- -------
-- n8n CE does not support OIDC SSO (enterprise.oidc=false), so each operator
-- must exist in the n8n.user table with a known bcrypt password and an owner
-- role. The Caddy auth-proxy still gates the edge via Better Auth; the n8n
-- session then persists ~7 days per browser after the first /rest/login.
--
-- See knowledge/decisions/0032-n8n-ce-operator-provisioning.md.
--
-- Password policy
-- ---------------
-- bcrypt hash with rounds=10. Hashes below are generated per-operator and
-- ROTATED out-of-band; treat them as initial passwords that operators MUST
-- change via the n8n profile screen on first login.
--
-- Re-running this script is safe (ON CONFLICT no-op when the row already has
-- the same email; password/role are explicitly overwritten).
--
-- IMPORTANT: n8n's UI onboarding flow auto-creates a row in `n8n.project`
-- (type='personal') AND `n8n.project_relation` (role='project:personalOwner')
-- for every new user. If we provision via raw SQL only, the n8n SPA returns
-- 404 on `/rest/projects/personal` after login and the dashboard fails to
-- hydrate. This script therefore ALSO creates the personal project + relation
-- when missing.

BEGIN;

-- Ensure required global roles exist.
INSERT INTO n8n.role (slug, "displayName", "systemRole", "roleType", "createdAt", "updatedAt")
VALUES
  ('global:owner',  'Owner',  true,  'global', NOW(), NOW()),
  ('global:member', 'Member', true,  'global', NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- igutt@levinnovation.com -- tenant master admin.
-- Initial password: Master2025 (rotate after first login).
UPDATE n8n."user"
SET password    = '$2b$10$a4f5MftOQcL9p83kDo.t/OS5M7p1DqUzNkg07fS3YWXEDVfiSLTJe',
    "roleSlug"  = 'global:owner',
    disabled    = false,
    "mfaEnabled"= false,
    "updatedAt" = NOW()
WHERE email = 'igutt@levinnovation.com';

-- If the user row did not exist, create it (id is generated).
INSERT INTO n8n."user" (email, "firstName", "lastName", password, "roleSlug", disabled, "createdAt", "updatedAt")
SELECT 'igutt@levinnovation.com', 'Ignacio', 'Gutierrez',
       '$2b$10$a4f5MftOQcL9p83kDo.t/OS5M7p1DqUzNkg07fS3YWXEDVfiSLTJe',
       'global:owner', false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM n8n."user" WHERE email = 'igutt@levinnovation.com');

-- Ensure a personal project exists for every operator we've provisioned.
-- nanoid-style 16-char id is what n8n itself uses; we generate a stable
-- deterministic id here so the migration is reproducible.
INSERT INTO n8n.project (id, name, type, "createdAt", "updatedAt", "creatorId")
SELECT
  substr(replace(encode(digest('n8n-personal:'||u.email,'sha256'),'base64'),'/','_'),1,16),
  COALESCE(NULLIF(trim(COALESCE(u."firstName",'')||' '||COALESCE(u."lastName",'')),''),'') ||
    CASE WHEN trim(COALESCE(u."firstName",'')||COALESCE(u."lastName",'')) <> '' THEN ' ' ELSE '' END ||
    '<' || u.email || '>',
  'personal',
  NOW(), NOW(),
  u.id
FROM n8n."user" u
WHERE NOT EXISTS (
  SELECT 1 FROM n8n.project p WHERE p."creatorId" = u.id AND p.type = 'personal'
);

-- Link each user to their personal project as project:personalOwner.
INSERT INTO n8n.project_relation ("projectId", "userId", role, "createdAt", "updatedAt")
SELECT p.id, u.id, 'project:personalOwner', NOW(), NOW()
FROM n8n."user" u
JOIN n8n.project p ON p."creatorId" = u.id AND p.type = 'personal'
WHERE NOT EXISTS (
  SELECT 1 FROM n8n.project_relation pr
  WHERE pr."projectId" = p.id AND pr."userId" = u.id
);

COMMIT;

-- Verification (run manually):
--   SELECT u.email, u."roleSlug", p.id AS personal_project_id, pr.role
--   FROM n8n."user" u
--   LEFT JOIN n8n.project p
--     ON p."creatorId" = u.id AND p.type = 'personal'
--   LEFT JOIN n8n.project_relation pr
--     ON pr."projectId" = p.id AND pr."userId" = u.id
--   ORDER BY u.email;
