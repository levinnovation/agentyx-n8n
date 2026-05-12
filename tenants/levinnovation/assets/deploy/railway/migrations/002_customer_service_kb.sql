-- Migration: 002_customer_service_kb.sql
-- Tenant: levinnovation
-- Domain: customer-service
-- Purpose: Add doc-level table (cs_documents), extend cs_knowledge_chunks for hybrid retrieval,
--          and create HNSW + GIN + btree indexes.
-- Backward-compat: additive ALTER only; data preserved if columns already exist.

CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Doc-level tracking table
CREATE TABLE IF NOT EXISTS public.cs_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'unknown',
  source_id text NOT NULL DEFAULT '',
  product text,
  title text,
  url text,
  mime text,
  raw_text text,
  content_hash text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_cs_documents_source ON public.cs_documents(source);
CREATE INDEX IF NOT EXISTS idx_cs_documents_product ON public.cs_documents(product);
CREATE INDEX IF NOT EXISTS idx_cs_documents_content_hash ON public.cs_documents(content_hash);

-- 2. Additive ALTER on cs_knowledge_chunks (fail-soft per column)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cs_knowledge_chunks' AND column_name = 'doc_id'
  ) THEN
    ALTER TABLE public.cs_knowledge_chunks ADD COLUMN doc_id uuid REFERENCES public.cs_documents(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cs_knowledge_chunks' AND column_name = 'chunk_index'
  ) THEN
    ALTER TABLE public.cs_knowledge_chunks ADD COLUMN chunk_index int;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cs_knowledge_chunks' AND column_name = 'chunk_type'
  ) THEN
    ALTER TABLE public.cs_knowledge_chunks ADD COLUMN chunk_type text DEFAULT 'text';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cs_knowledge_chunks' AND column_name = 'tsv'
  ) THEN
    ALTER TABLE public.cs_knowledge_chunks ADD COLUMN tsv tsvector
      GENERATED ALWAYS AS (to_tsvector('spanish', coalesce(text,''))) STORED;
  END IF;
END $$;

-- 3. Ensure embedding dimension is vector(1536)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cs_knowledge_chunks' AND column_name = 'embedding'
  ) THEN
    -- pgvector does not support ALTER COLUMN TYPE on vector dims directly without cast;
    -- if existing data is already 1536 this is a no-op. If not, re-casting is required
    -- and should be done manually. We document it here.
    NULL;
  END IF;
END $$;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_cs_knowledge_chunks_embedding_hnsw
  ON public.cs_knowledge_chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_cs_knowledge_chunks_tsv_gin
  ON public.cs_knowledge_chunks USING gin (tsv);

CREATE INDEX IF NOT EXISTS idx_cs_knowledge_chunks_product
  ON public.cs_knowledge_chunks ((metadata->>'product'));

CREATE INDEX IF NOT EXISTS idx_cs_knowledge_chunks_doc_id
  ON public.cs_knowledge_chunks (doc_id);

-- 5. Helper updated_at trigger for cs_documents
CREATE OR REPLACE FUNCTION public.cs_documents_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cs_documents_updated_at ON public.cs_documents;
CREATE TRIGGER trg_cs_documents_updated_at
  BEFORE UPDATE ON public.cs_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.cs_documents_set_updated_at();
