-- ============================================================
-- Consolidated Schema: Catalog + Chat
-- ============================================================

-- 1. Brands
CREATE TABLE IF NOT EXISTS brands (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  segment     TEXT NOT NULL CHECK (segment IN ('electrodomesticos', 'muebles')),
  logo_url    TEXT,
  website     TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Product Categories
CREATE TABLE IF NOT EXISTS product_categories (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id    UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(brand_id, name)
);

-- 3. Products
CREATE TABLE IF NOT EXISTS products (
  id                          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id                 UUID NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
  code                        TEXT NOT NULL,
  description                 TEXT NOT NULL,
  sku_correlation_description TEXT,
  specs                       TEXT,
  image_url                   TEXT,
  product_url                 TEXT,
  is_active                   BOOLEAN DEFAULT true,
  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category_id, code)
);

-- 4. Price Lists
CREATE TABLE IF NOT EXISTS price_lists (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  segment         TEXT NOT NULL CHECK (segment IN ('electrodomesticos', 'muebles')),
  effective_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date     DATE,
  currency        TEXT DEFAULT 'USD',
  notes           TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 5. Price Entries
CREATE TABLE IF NOT EXISTS price_entries (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  price_list_id   UUID NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_price      NUMERIC(12,2) NOT NULL,
  project_price   NUMERIC(12,2),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(price_list_id, product_id)
);

-- 6. Chat Sessions (WhatsApp-aware)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number      TEXT NOT NULL,
  conversation_id   TEXT NOT NULL,
  title             TEXT NOT NULL DEFAULT 'Nueva Cotización',
  contact_name      TEXT,
  intake_progress   JSONB DEFAULT '{}',
  cart              JSONB DEFAULT '[]',
  handoff_state     TEXT DEFAULT 'auto',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(phone_number, conversation_id)
);

-- 7. Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 8. Document Contents (RAG source)
CREATE TABLE IF NOT EXISTS document_contents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename      TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'other',
  content_text  TEXT NOT NULL,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_categories_brand ON product_categories(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_price_entries_list ON price_entries(price_list_id);
CREATE INDEX IF NOT EXISTS idx_price_entries_product ON price_entries(product_id);
CREATE INDEX IF NOT EXISTS idx_price_lists_segment ON price_lists(segment);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_document_contents_category ON document_contents(category);
