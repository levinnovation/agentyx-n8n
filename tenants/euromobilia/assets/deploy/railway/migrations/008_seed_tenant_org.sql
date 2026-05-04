-- ============================================================
-- Migration 008: Seed Tenant Organization
-- ============================================================
-- Creates the root organization for the tenant and a bootstrap
-- admin user. Run this after all other migrations are applied.
--
-- IMPORTANT: Change the admin email and password before running.
-- The password should be hashed by the auth-service; this seed
-- inserts a placeholder that must be reset via the auth-service.
-- ============================================================

SET search_path TO better_auth;

-- Insert tenant organization
INSERT INTO "organization" (id, name, slug, tenant_id, domain, plan, is_active)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',  -- deterministic UUID for euromobilia
    'Euromobilia',
    'euromobilia',
    'euromobilia',
    'kitchen-commerce',
    'production',
    TRUE
)
ON CONFLICT (tenant_id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    updated_at = NOW();

-- Insert bootstrap admin user (placeholder — set real password via auth-service)
INSERT INTO "user" (id, email, email_verified, name, is_active)
VALUES (
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'admin@euromobilia.com',
    TRUE,
    'Euromobilia Admin',
    TRUE
)
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

-- Link admin to organization as owner
INSERT INTO "member" (organization_id, user_id, role)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'owner'
)
ON CONFLICT (organization_id, user_id) DO UPDATE SET
    role = EXCLUDED.role;

-- Insert a placeholder SCIM API key (replace with real token hash)
INSERT INTO "scim_api_key" (organization_id, name, token_hash, token_prefix, scopes, is_active)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Google Workspace SCIM',
    '$2b$12$PLACEHOLDER_HASH_MUST_BE_REPLACED',  -- bcrypt hash of actual token
    'gw-scim-',
    ARRAY['scim:read', 'scim:write'],
    TRUE
);

-- Reset search path
SET search_path TO public;

-- Output confirmation
DO $$
BEGIN
    RAISE NOTICE 'Tenant organization seeded for: euromobilia';
    RAISE NOTICE 'Admin user: admin@euromobilia.com';
    RAISE NOTICE 'IMPORTANT: Reset admin password and SCIM token via auth-service.';
END $$;
