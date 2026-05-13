# Apply Document Visibility Migration

## Purpose

Apply migration `003_document_visibility.sql` to enable the shareable vs context-only visibility model for portal documents.

## Prerequisites

- Access to the target Railway PostgreSQL database (via `railway connect` or direct `DATABASE_URL`)
- Migration file: `tenants/levinnovation/assets/deploy/railway/migrations/003_document_visibility.sql`

## Steps

```bash
# 1. Connect to the Railway project
railway link -p cee99d78-9944-4c21-9aa5-ae9fab5ba91b

# 2. Open a database shell
railway connect postgres

# 3. Run the migration
\\i tenants/levinnovation/assets/deploy/railway/migrations/003_document_visibility.sql
```

### Alternative: Direct connection

```bash
psql "$DATABASE_URL" -f tenants/levinnovation/assets/deploy/railway/migrations/003_document_visibility.sql
```

## What the migration does

1. Creates `document_visibility` enum type (`context_only`, `shareable`)
2. Creates `public.user_documents` metadata table (for Railway Bucket-backed storage)
3. Adds `updated_at` trigger to `user_documents`
4. Adds `visibility` and `object_key` columns to existing `cs_documents` table

## Rollback

```sql
DROP TRIGGER IF EXISTS trg_user_documents_updated_at ON public.user_documents;
DROP FUNCTION IF EXISTS public.user_documents_set_updated_at();
DROP TABLE IF EXISTS public.user_documents;
ALTER TABLE public.cs_documents DROP COLUMN IF EXISTS visibility;
ALTER TABLE public.cs_documents DROP COLUMN IF EXISTS object_key;
DROP TYPE IF EXISTS document_visibility;
```

## Verification

```sql
-- Check enum exists
SELECT unnest(enum_range(NULL::document_visibility));

-- Check tables
SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name = 'user_documents';
SELECT column_name FROM information_schema.columns
  WHERE table_name = 'cs_documents' AND column_name IN ('visibility', 'object_key');
```
