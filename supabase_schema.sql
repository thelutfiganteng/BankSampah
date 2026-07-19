-- ==========================================================================
-- BANK SAMPAH ECO - SUPABASE DATABASE SCHEMA MIGRATION SCRIPT
-- Project Reference: bzfyakbdihvedyatvzwg
-- ==========================================================================

-- Drop tables if they already exist (caution in production)
-- DROP TABLE IF EXISTS order_items CASCADE;
-- DROP TABLE IF EXISTS orders CASCADE;
-- DROP TABLE IF EXISTS shopee_sync_logs CASCADE;
-- DROP TABLE IF EXISTS shopee_settings CASCADE;
-- DROP TABLE IF EXISTS product_variants CASCADE;
-- DROP TABLE IF EXISTS products CASCADE;
-- DROP TABLE IF EXISTS raw_materials CASCADE;
-- DROP TABLE IF EXISTS waste_deposits CASCADE;
-- DROP TABLE IF EXISTS members CASCADE;

-- 1. Members Table (Users & Admins)
CREATE TABLE IF NOT EXISTS members (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  address TEXT,
  password TEXT, -- SHA-256 Hashed Password
  role TEXT DEFAULT 'USER', -- USER, ADMIN
  balance INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Waste Deposits Table
CREATE TABLE IF NOT EXISTS waste_deposits (
  id BIGSERIAL PRIMARY KEY,
  member_id BIGINT REFERENCES members(id) ON DELETE CASCADE,
  waste_type TEXT NOT NULL,
  weight DOUBLE PRECISION NOT NULL,
  points INTEGER NOT NULL,
  deposit_date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  status TEXT DEFAULT 'APPROVED' -- PENDING, APPROVED, REJECTED
);

-- 3. Raw Materials Table (Warehouse inventory)
CREATE TABLE IF NOT EXISTS raw_materials (
  id BIGSERIAL PRIMARY KEY,
  waste_type TEXT NOT NULL UNIQUE,
  stock_kg DOUBLE PRECISION DEFAULT 0.0
);

-- 4. Products Table
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,
  stock INTEGER NOT NULL,
  shopee_item_id TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Product Variants Table
CREATE TABLE IF NOT EXISTS product_variants (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  price INTEGER NOT NULL,
  stock INTEGER NOT NULL,
  shopee_model_id TEXT
);

-- 6. Shopee Settings Table
CREATE TABLE IF NOT EXISTS shopee_settings (
  id BIGSERIAL PRIMARY KEY,
  partner_id TEXT,
  partner_key TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at BIGINT DEFAULT 0,
  shop_id TEXT,
  is_sandbox INTEGER DEFAULT 1,
  is_simulated INTEGER DEFAULT 1,
  is_active INTEGER DEFAULT 0
);

-- 7. Shopee Sync Logs Table
CREATE TABLE IF NOT EXISTS shopee_sync_logs (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL,
  variant_id BIGINT,
  action TEXT NOT NULL, -- "CREATE", "UPDATE", "DELETE", "STOCK_SYNC"
  status TEXT NOT NULL, -- "SUCCESS", "FAILED"
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  total_price INTEGER NOT NULL,
  status TEXT DEFAULT 'PENDING', -- PENDING, COMPLETED, CANCELLED
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  variant_id BIGINT,
  quantity INTEGER NOT NULL,
  price INTEGER NOT NULL
);

-- ==========================================================================
-- ROW LEVEL SECURITY (RLS) ENABLING & POLICIES
-- ==========================================================================

-- Enable RLS on all tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopee_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopee_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Create permissive development policies (Full read/write for both anonymous & authenticated clients)
CREATE POLICY "Allow public read/write members" ON members TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write waste_deposits" ON waste_deposits TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write raw_materials" ON raw_materials TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write products" ON products TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write product_variants" ON product_variants TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write shopee_settings" ON shopee_settings TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write shopee_sync_logs" ON shopee_sync_logs TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write orders" ON orders TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write order_items" ON order_items TO anon, authenticated USING (true) WITH CHECK (true);

-- ==========================================================================
-- SEED INITIAL DATA
-- ==========================================================================

-- Seed raw material inventories
INSERT INTO raw_materials (waste_type, stock_kg) 
VALUES 
  ('Plastik', 0.0), 
  ('Kertas', 0.0), 
  ('Logam', 0.0), 
  ('Kaca', 0.0), 
  ('Organik', 0.0)
ON CONFLICT (waste_type) DO NOTHING;

-- Seed default Shopee simulated settings row
INSERT INTO shopee_settings (id, is_sandbox, is_simulated, is_active)
VALUES (1, 1, 1, 0)
ON CONFLICT (id) DO NOTHING;

-- Seed demo members / users
-- Password hashes (SHA-256):
-- admin123 -> 240753d4970ca445b23d90f22fb420ef3933c063cf4c162601ad89fa6992d9d9
-- budi123  -> e7f72f0367eb7a8dfcf1cd0125867a544c062c3325c898c69be8f97fcfe71bf0
-- siti123  -> 25c73cc9b25c3f7cf7c3b999121a8cd36e82c5a2c262f3a693dfa99f1fa023e3
INSERT INTO members (name, email, phone, address, password, role, balance) 
VALUES 
  ('Administrator', 'admin@banksampaheco.org', '000000000000', 'Kantor Pusat Bank Sampah', '240753d4970ca445b23d90f22fb420ef3933c063cf4c162601ad89fa6992d9d9', 'ADMIN', 0),
  ('Budi Santoso', 'budi@gmail.com', '081234567890', 'Kelurahan Lestari Indah RT 02/05', 'e7f72f0367eb7a8dfcf1cd0125867a544c062c3325c898c69be8f97fcfe71bf0', 'USER', 120000),
  ('Siti Aminah', 'siti@gmail.com', '089876543210', 'Perumahan Asri Blok C-14', '25c73cc9b25c3f7cf7c3b999121a8cd36e82c5a2c262f3a693dfa99f1fa023e3', 'USER', 75000)
ON CONFLICT (phone) DO NOTHING;

-- Seed default catalog products
INSERT INTO products (name, description, category, price, stock, image_url)
VALUES 
  (
    'Tas Belanja Cantik Plastik Daur Ulang',
    'Tas belanja kuat, trendi, dan tahan air. Dibuat 100% dari limbah kemasan sachet plastik rumah tangga yang didaur ulang oleh kelompok kerajinan ibu-ibu warga.',
    'Kerajinan Plastik',
    25000,
    30,
    'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=600&auto=format&fit=crop'
  ),
  (
    'Pupuk Kompos Organik Super 5kg',
    'Pupuk organik berkualitas tinggi hasil dari fermentasi sampah dapur organik rumah tangga warga setempat. Sangat subur untuk tanaman hias, kebun sayur, dan buah-buahan.',
    'Kompos & Organik',
    15000,
    50,
    'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?q=80&w=600&auto=format&fit=crop'
  )
ON CONFLICT DO NOTHING;

-- Map variants for products
INSERT INTO product_variants (product_id, name, sku, price, stock)
VALUES
  (1, 'Ukuran Standar', 'TAS-STD', 25000, 30),
  (2, 'Paket Ekonomis 5kg', 'KMP-5KG', 15000, 50)
ON CONFLICT (sku) DO NOTHING;
