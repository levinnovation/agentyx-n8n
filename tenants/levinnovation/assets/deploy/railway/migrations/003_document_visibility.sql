-- Migration: 003_document_visibility.sql
-- Tenant: levinnovation
-- Purpose: Add document_visibility enum + user_documents metadata table
--          for the shareable-vs-context-only document model.
-- Backward-compat: additive only; no existing data affected.

-- 1. Enum type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_visibility') THEN
    CREATE TYPE document_visibility AS ENUM ('context_only', 'shareable');
  END IF;
END $$;

-- 2. user_documents metadata table
CREATE TABLE IF NOT EXISTS public.user_documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      text NOT NULL,
  tenant_id    text NOT NULL DEFAULT 'levinnovation',
  title        text NOT NULL,
  mime_type    text NOT NULL DEFAULT 'application/octet-stream',
  size_bytes   bigint NOT NULL DEFAULT 0,
  visibility   document_visibility NOT NULL DEFAULT 'context_only',
  object_key   text NOT NULL,                              -- Railway Bucket or S3 key
  content_hash text,
  extracted_text text,
  extracted_text_truncated boolean DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON public.user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_visibility ON public.user_documents(visibility);
CREATE INDEX IF NOT EXISTS idx_user_documents_tenant ON public.user_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_created_at ON public.user_documents(created_at DESC);

-- 3. Helper updated_at trigger
CREATE OR REPLACE FUNCTION public.user_documents_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_documents_updated_at ON public.user_documents;
CREATE TRIGGER trg_user_documents_updated_at
  BEFORE UPDATE ON public.user_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.user_documents_set_updated_at();

-- 4. Add document_visibility to cs_documents (existing KB docs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cs_documents' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE public.cs_documents ADD COLUMN visibility document_visibility NOT NULL DEFAULT 'context_only';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cs_documents' AND column_name = 'object_key'
  ) THEN
    ALTER TABLE public.cs_documents ADD COLUMN object_key text;
  END IF;
END $$;
