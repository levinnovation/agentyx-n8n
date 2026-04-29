-- ============================================================
-- Row Level Security Policies
-- ============================================================

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_contents ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon (public API key pattern)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'brands_anon_all') THEN
    CREATE POLICY brands_anon_all ON brands FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'product_categories_anon_all') THEN
    CREATE POLICY product_categories_anon_all ON product_categories FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'products_anon_all') THEN
    CREATE POLICY products_anon_all ON products FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'price_lists_anon_all') THEN
    CREATE POLICY price_lists_anon_all ON price_lists FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'price_entries_anon_all') THEN
    CREATE POLICY price_entries_anon_all ON price_entries FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'chat_sessions_anon_all') THEN
    CREATE POLICY chat_sessions_anon_all ON chat_sessions FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'chat_messages_anon_all') THEN
    CREATE POLICY chat_messages_anon_all ON chat_messages FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'document_contents_anon_all') THEN
    CREATE POLICY document_contents_anon_all ON document_contents FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;
