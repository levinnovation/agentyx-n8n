-- ============================================================
-- Migration 005: Shared Views and Functions
-- ============================================================
-- Cross-schema views that downstream services can query (read-only)
-- for user identity data. Services should NOT write directly to
-- better_auth tables — all writes go through the auth-service API.
--
-- These views live in the better_auth schema for discoverability
-- but can be referenced from any schema via qualified name.
-- ============================================================

SET search_path TO better_auth;

-- ------------------------------------------------------------
-- View: v_user_identity
-- Flattened user + org membership for quick lookups.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW v_user_identity AS
SELECT
    u.id,
    u.email,
    u.email_verified,
    u.name,
    u.image,
    u.phone,
    u.locale,
    u.timezone,
    u.is_active,
    u.last_sign_in_at,
    u.created_at,
    u.metadata,
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'organization_id', o.id,
                'organization_slug', o.slug,
                'organization_name', o.name,
                'role', m.role
            ) ORDER BY m.created_at
        ) FILTER (WHERE o.id IS NOT NULL),
        '[]'::jsonb
    ) AS organizations
FROM "user" u
LEFT JOIN "member" m ON m.user_id = u.id
LEFT JOIN "organization" o ON o.id = m.organization_id
GROUP BY u.id;

COMMENT ON VIEW v_user_identity IS 'Flattened user identity with org memberships. Read-only.';

-- ------------------------------------------------------------
-- View: v_organization_members
-- All members of each organization with user details.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW v_organization_members AS
SELECT
    o.id AS organization_id,
    o.slug AS organization_slug,
    o.name AS organization_name,
    u.id AS user_id,
    u.email,
    u.name AS user_name,
    u.image AS user_image,
    m.role,
    m.created_at AS joined_at
FROM "organization" o
JOIN "member" m ON m.organization_id = o.id
JOIN "user" u ON u.id = m.user_id
WHERE u.is_active = TRUE;

COMMENT ON VIEW v_organization_members IS 'Active members per organization. Read-only.';

-- ------------------------------------------------------------
-- View: v_scim_ready_users
-- Users formatted for SCIM 2.0 User resource responses.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW v_scim_ready_users AS
SELECT
    u.id,
    u.email AS "userName",
    u.name AS "displayName",
    jsonb_build_object(
        'givenName', split_part(u.name, ' ', 1),
        'familyName', nullif(split_part(u.name, ' ', 2), '')
    ) AS "name",
    u.email_verified AS "active",
    u.created_at AS "meta.created",
    u.updated_at AS "meta.lastModified",
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'value', o.id,
                'display', o.name,
                'type', 'direct'
            )
        ) FILTER (WHERE o.id IS NOT NULL),
        '[]'::jsonb
    ) AS "groups"
FROM "user" u
LEFT JOIN "member" m ON m.user_id = u.id
LEFT JOIN "organization" o ON o.id = m.organization_id
GROUP BY u.id;

COMMENT ON VIEW v_scim_ready_users IS 'Users formatted for SCIM 2.0 responses. Read-only.';

-- ------------------------------------------------------------
-- Function: lookup_user_by_email
-- Secure function for cross-service user lookup.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION better_auth.lookup_user_by_email(p_email TEXT)
RETURNS TABLE (
    id UUID,
    email TEXT,
    name TEXT,
    image TEXT,
    is_active BOOLEAN,
    organizations JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.email,
        u.name,
        u.image,
        u.is_active,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'organization_id', o.id,
                    'slug', o.slug,
                    'role', m.role
                )
            ) FILTER (WHERE o.id IS NOT NULL),
            '[]'::jsonb
        )
    FROM "user" u
    LEFT JOIN "member" m ON m.user_id = u.id
    LEFT JOIN "organization" o ON o.id = m.organization_id
    WHERE u.email = p_email
    GROUP BY u.id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION better_auth.lookup_user_by_email(TEXT) IS 'Secure user lookup by email for downstream services.';

-- ------------------------------------------------------------
-- Function: is_org_member
-- Check if a user is a member of an organization with min role.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION better_auth.is_org_member(
    p_user_id UUID,
    p_org_slug TEXT,
    p_min_role TEXT DEFAULT 'member'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_role TEXT;
    v_role_rank INT;
    v_min_rank INT;
BEGIN
    SELECT role INTO v_user_role
    FROM "member" m
    JOIN "organization" o ON o.id = m.organization_id
    WHERE m.user_id = p_user_id AND o.slug = p_org_slug;

    IF v_user_role IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT CASE v_user_role
        WHEN 'owner' THEN 4
        WHEN 'admin' THEN 3
        WHEN 'member' THEN 2
        WHEN 'viewer' THEN 1
        ELSE 0
    END INTO v_role_rank;

    SELECT CASE p_min_role
        WHEN 'owner' THEN 4
        WHEN 'admin' THEN 3
        WHEN 'member' THEN 2
        WHEN 'viewer' THEN 1
        ELSE 0
    END INTO v_min_rank;

    RETURN v_role_rank >= v_min_rank;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION better_auth.is_org_member(UUID, TEXT, TEXT) IS 'Check user membership with minimum role rank.';

-- Reset search path
SET search_path TO public;
