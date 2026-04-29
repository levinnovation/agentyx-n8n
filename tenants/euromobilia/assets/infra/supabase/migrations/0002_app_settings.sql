-- ============================================================
-- App Settings — simple key-value store for application config
-- ============================================================

CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON app_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON app_settings FOR ALL TO anon USING (true) WITH CHECK (true);

INSERT INTO app_settings (key, value, description)
VALUES (
  'image_quality_mode',
  'regular',
  'Image generation quality: regular = Nano Banana (fast), always_hd = Nano Banana Pro (all images), hd_pdf_only = Regular for chat + HD for final PDF'
)
ON CONFLICT (key) DO NOTHING;
