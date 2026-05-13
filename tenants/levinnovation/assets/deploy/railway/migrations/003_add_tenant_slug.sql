-- Migration: add tenant_slug for multi-tenant document isolation
-- Applied: 2026-05-12

ALTER TABLE public.cs_documents
  ADD COLUMN IF NOT EXISTS tenant_slug TEXT NOT NULL DEFAULT 'levinnovation';

ALTER TABLE public.cs_knowledge_chunks
  ADD COLUMN IF NOT EXISTS tenant_slug TEXT;

-- Backfill existing chunks from their parent document
UPDATE public.cs_knowledge_chunks k
SET tenant_slug = d.tenant_slug
FROM public.cs_documents d
WHERE k.doc_id = d.id;

-- Make tenant_slug NOT NULL after backfill
ALTER TABLE public.cs_knowledge_chunks
  ALTER COLUMN tenant_slug SET NOT NULL;

-- Add indexes for tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_cs_documents_tenant_slug ON public.cs_documents(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_cs_documents_tenant_product ON public.cs_documents(tenant_slug, product);
CREATE INDEX IF NOT EXISTS idx_cs_knowledge_chunks_tenant ON public.cs_knowledge_chunks(tenant_slug);

COMMENT ON COLUMN public.cs_documents.tenant_slug IS 'Hostname prefix (e.g. levinnovation) for multi-tenant isolation';
COMMENT ON COLUMN public.cs_knowledge_chunks.tenant_slug IS 'Hostname prefix (e.g. levinnovation) for multi-tenant isolation';
