-- ============================================================
-- Commercial Pricing Rules Engine
-- Dynamic business rules that override base margin/discount
-- per product, brand, category, or globally.
-- ============================================================

CREATE TYPE rule_scope AS ENUM ('global', 'brand', 'category', 'product', 'price_list');
CREATE TYPE rule_action AS ENUM (
  'override_discount', 'override_margin', 'add_discount', 'subtract_discount',
  'add_margin', 'subtract_margin', 'fixed_price_adjust'
);

CREATE TABLE IF NOT EXISTS commercial_pricing_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  scope         rule_scope NOT NULL DEFAULT 'product',
  brand_id      UUID REFERENCES brands(id) ON DELETE CASCADE,
  category_id   UUID REFERENCES product_categories(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id) ON DELETE CASCADE,
  price_list_id UUID REFERENCES price_lists(id) ON DELETE CASCADE,
  action        rule_action NOT NULL DEFAULT 'override_discount',
  value         NUMERIC(10,4) NOT NULL DEFAULT 0,
  reason        TEXT,
  approved_by   TEXT,
  valid_from    TIMESTAMPTZ DEFAULT NOW(),
  valid_until   TIMESTAMPTZ,
  priority      INTEGER NOT NULL DEFAULT 100,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cpr_scope ON commercial_pricing_rules(scope);
CREATE INDEX IF NOT EXISTS idx_cpr_brand ON commercial_pricing_rules(brand_id) WHERE brand_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cpr_category ON commercial_pricing_rules(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cpr_product ON commercial_pricing_rules(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cpr_active ON commercial_pricing_rules(is_active, valid_from, valid_until);

ALTER TABLE commercial_pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON commercial_pricing_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON commercial_pricing_rules FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION get_effective_pricing(p_product_id UUID)
RETURNS TABLE(base_margin_pct NUMERIC, base_discount_pct NUMERIC, effective_margin_pct NUMERIC, effective_discount_pct NUMERIC, applied_rules JSONB)
LANGUAGE plpgsql AS $$
DECLARE
  v_margin NUMERIC; v_discount NUMERIC; v_brand_id UUID; v_category_id UUID; v_rules JSONB := '[]'::JSONB; r RECORD;
BEGIN
  SELECT pe.margin_pct, pe.discount_pct, p.category_id, pc.brand_id
  INTO v_margin, v_discount, v_category_id, v_brand_id
  FROM price_entries pe
  JOIN products p ON p.id = pe.product_id
  JOIN product_categories pc ON pc.id = p.category_id
  WHERE pe.product_id = p_product_id LIMIT 1;

  base_margin_pct := COALESCE(v_margin, 62);
  base_discount_pct := COALESCE(v_discount, 5);
  v_margin := base_margin_pct;
  v_discount := base_discount_pct;

  FOR r IN
    SELECT cpr.* FROM commercial_pricing_rules cpr
    WHERE cpr.is_active = true
      AND (cpr.valid_from IS NULL OR cpr.valid_from <= NOW())
      AND (cpr.valid_until IS NULL OR cpr.valid_until >= NOW())
      AND (cpr.scope = 'global' OR (cpr.scope = 'brand' AND cpr.brand_id = v_brand_id)
           OR (cpr.scope = 'category' AND cpr.category_id = v_category_id)
           OR (cpr.scope = 'product' AND cpr.product_id = p_product_id))
    ORDER BY cpr.priority ASC, cpr.sort_order ASC
  LOOP
    CASE r.action
      WHEN 'override_discount' THEN v_discount := r.value;
      WHEN 'override_margin' THEN v_margin := r.value;
      WHEN 'add_discount' THEN v_discount := v_discount + r.value;
      WHEN 'subtract_discount' THEN v_discount := GREATEST(0, v_discount - r.value);
      WHEN 'add_margin' THEN v_margin := v_margin + r.value;
      WHEN 'subtract_margin' THEN v_margin := GREATEST(0, v_margin - r.value);
      ELSE NULL;
    END CASE;
    v_rules := v_rules || jsonb_build_object('rule_id', r.id, 'name', r.name, 'action', r.action::TEXT, 'value', r.value, 'scope', r.scope::TEXT);
  END LOOP;

  effective_margin_pct := v_margin;
  effective_discount_pct := v_discount;
  applied_rules := v_rules;
  RETURN NEXT;
END;
$$;
