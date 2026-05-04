-- ============================================================
-- Migration 001: Create Service Schemas
-- ============================================================
-- One shared PostgreSQL database per tenant, with isolated schemas
-- for each service. This provides logical separation while keeping
-- operational overhead low (single backup, single connection pool).
--
-- Run as: postgres superuser or schema owner
-- ============================================================

-- Create schemas if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'n8n') THEN
        CREATE SCHEMA n8n;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'langfuse') THEN
        CREATE SCHEMA langfuse;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'librechat') THEN
        CREATE SCHEMA librechat;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'paperclip') THEN
        CREATE SCHEMA paperclip;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'better_auth') THEN
        CREATE SCHEMA better_auth;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'flowise') THEN
        CREATE SCHEMA flowise;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'agentyx_portal') THEN
        CREATE SCHEMA agentyx_portal;
    END IF;
END $$;

-- Enable required extensions in the public schema (shared)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant usage on schemas to the application role (if running with a non-superuser)
-- Uncomment and replace 'app_user' with your actual Railway database user:
-- GRANT USAGE ON SCHEMA n8n, langfuse, librechat, paperclip, better_auth, flowise, agentyx_portal TO app_user;

COMMENT ON SCHEMA n8n IS 'n8n workflow execution engine (upstream image, no code patches)';
COMMENT ON SCHEMA langfuse IS 'Langfuse observability and tracing (upstream image, OIDC config only)';
COMMENT ON SCHEMA librechat IS 'LibreChat UI (fork: levinnovation/agentyx-librechat)';
COMMENT ON SCHEMA paperclip IS 'Paperclip AI orchestrator (fork: levinnovation/agentyx-paperclip)';
COMMENT ON SCHEMA better_auth IS 'Better Auth canonical user store and session management (fork: levinnovation/agentyx-auth-service)';
COMMENT ON SCHEMA flowise IS 'Flowise low-code agent builder (fork: levinnovation/agentyx-flowise)';
COMMENT ON SCHEMA agentyx_portal IS 'Agentyx client portal (fork: levinnovation/agentyx-client-portal)';
