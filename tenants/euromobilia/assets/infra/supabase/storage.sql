-- ============================================================
-- Storage Buckets
-- ============================================================

-- Quotation PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('quotation-pdfs', 'quotation-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Image renders
INSERT INTO storage.buckets (id, name, public)
VALUES ('image-renders', 'image-renders', true)
ON CONFLICT (id) DO NOTHING;

-- Artifacts (legacy compatibility)
INSERT INTO storage.buckets (id, name, public)
VALUES ('artifacts', 'artifacts', true)
ON CONFLICT (id) DO NOTHING;

-- Policies: allow public read, service-role write
CREATE POLICY IF NOT EXISTS "Public read quotation-pdfs"
ON storage.objects FOR SELECT TO anon USING (bucket_id = 'quotation-pdfs');

CREATE POLICY IF NOT EXISTS "Service role write quotation-pdfs"
ON storage.objects FOR INSERT TO service_role WITH CHECK (bucket_id = 'quotation-pdfs');

CREATE POLICY IF NOT EXISTS "Public read image-renders"
ON storage.objects FOR SELECT TO anon USING (bucket_id = 'image-renders');

CREATE POLICY IF NOT EXISTS "Service role write image-renders"
ON storage.objects FOR INSERT TO service_role WITH CHECK (bucket_id = 'image-renders');

CREATE POLICY IF NOT EXISTS "Public read artifacts"
ON storage.objects FOR SELECT TO anon USING (bucket_id = 'artifacts');

CREATE POLICY IF NOT EXISTS "Service role write artifacts"
ON storage.objects FOR INSERT TO service_role WITH CHECK (bucket_id = 'artifacts');
