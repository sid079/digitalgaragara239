-- =====================================================
-- Strike World Digital Lottery Machine — Supabase Schema
-- =====================================================

-- 1. Products table
CREATE TABLE products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  icon_type   text NOT NULL CHECK (icon_type IN ('tshirt', 'badge', 'sticker', 'figurine', 'keychain', 'gift_hamper')),
  grade       text NOT NULL CHECK (grade IN ('A', 'B', 'C')),
  created_at  timestamptz DEFAULT now()
);

-- 2. Lottery settings table
-- MIGRATION: If table already exists, run:
-- ALTER TABLE lottery_settings ADD COLUMN IF NOT EXISTS original_stock integer NOT NULL DEFAULT 0;
CREATE TABLE lottery_settings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          uuid REFERENCES products(id) ON DELETE CASCADE,
  stock_quantity      integer NOT NULL DEFAULT 0,
  original_stock      integer NOT NULL DEFAULT 0,
  probability_weight  decimal NOT NULL DEFAULT 1.0,
  is_active           boolean NOT NULL DEFAULT false,
  version             integer NOT NULL DEFAULT 1
);

-- 3. Lottery log table
CREATE TABLE lottery_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spun_at       timestamptz DEFAULT now(),
  machine_id    text NOT NULL,
  product_id    uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name  text NOT NULL,
  grade         text NOT NULL
);

-- 4. Atomic decrement function with version check
CREATE OR REPLACE FUNCTION decrement_stock(row_id uuid, expected_version integer)
RETURNS boolean AS $$
DECLARE
  rows_affected integer;
BEGIN
  UPDATE lottery_settings
  SET stock_quantity = GREATEST(stock_quantity - 1, 0),
      version = expected_version + 1
  WHERE id = row_id
    AND version = expected_version
    AND stock_quantity > 0;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

-- 5. Enable Realtime on lottery_settings
ALTER PUBLICATION supabase_realtime ADD TABLE lottery_settings;

-- 6. Row Level Security

-- Products: anon can SELECT
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read products" ON products FOR SELECT USING (true);
CREATE POLICY "Service role can manage products" ON products FOR ALL USING (auth.role() = 'service_role');

-- Lottery settings: anon can SELECT and UPDATE stock
ALTER TABLE lottery_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read lottery_settings" ON lottery_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can update lottery_settings" ON lottery_settings FOR UPDATE USING (true);
CREATE POLICY "Service role can manage lottery_settings" ON lottery_settings FOR ALL USING (auth.role() = 'service_role');

-- Lottery log: anon can INSERT and SELECT
ALTER TABLE lottery_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read lottery_log" ON lottery_log FOR SELECT USING (true);
CREATE POLICY "Anyone can insert lottery_log" ON lottery_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can manage lottery_log" ON lottery_log FOR ALL USING (auth.role() = 'service_role');

-- Index for faster log queries
CREATE INDEX idx_lottery_log_spun_at ON lottery_log (spun_at DESC);
CREATE INDEX idx_lottery_log_machine_id ON lottery_log (machine_id);
CREATE INDEX idx_lottery_settings_product_id ON lottery_settings (product_id);

-- Stock additions tracking table
CREATE TABLE IF NOT EXISTS stock_additions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  mode text NOT NULL DEFAULT 'add',
  added_at timestamptz DEFAULT now()
);

ALTER TABLE stock_additions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_stock_additions_insert" ON stock_additions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_stock_additions_select" ON stock_additions
  FOR SELECT USING (true);
CREATE POLICY "allow_stock_additions_delete" ON stock_additions
  FOR DELETE USING (true);
