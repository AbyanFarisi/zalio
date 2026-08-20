-- Zalio ERP PostgreSQL Schema
-- Uses UUID for all primary keys

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============== COMPANY / AUTH ===============
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outlets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  role_id UUID REFERENCES user_roles(id),
  branch_id UUID REFERENCES branches(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id),
  employee_code VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(50),
  role VARCHAR(100),
  salary NUMERIC(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============== MASTER DATA ===============
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS uoms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(300) NOT NULL,
  brand_id UUID REFERENCES brands(id),
  category_id UUID REFERENCES categories(id),
  uom_id UUID REFERENCES uoms(id),
  selling_price NUMERIC(15,2) DEFAULT 0,
  cogs NUMERIC(15,2) DEFAULT 0,
  stock_qty NUMERIC(15,3) DEFAULT 0,
  image_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(50),
  address TEXT,
  category VARCHAR(100),
  credit_limit NUMERIC(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(50),
  address TEXT,
  category VARCHAR(100),
  payment_term VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  location TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id),
  movement_type VARCHAR(20) NOT NULL, -- IN, OUT, TRANSFER, ADJUSTMENT
  quantity NUMERIC(15,3) NOT NULL,
  reference VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============== TRANSACTIONS ===============
CREATE TABLE IF NOT EXISTS sales_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  branch_id UUID REFERENCES branches(id),
  order_date DATE DEFAULT CURRENT_DATE,
  subtotal NUMERIC(15,2) DEFAULT 0,
  tax NUMERIC(15,2) DEFAULT 0,
  discount NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity NUMERIC(15,3) NOT NULL,
  price NUMERIC(15,2) NOT NULL,
  subtotal NUMERIC(15,2) NOT NULL
);

-- =============== SEED DATA ===============
INSERT INTO branches (code, name, address, phone) VALUES
  ('HQ', 'Kantor Pusat Jakarta', 'Jl. Sudirman No. 1, Jakarta', '021-1234567'),
  ('BDG', 'Cabang Bandung', 'Jl. Asia Afrika No. 10, Bandung', '022-7654321'),
  ('SBY', 'Cabang Surabaya', 'Jl. Tunjungan No. 5, Surabaya', '031-9876543')
ON CONFLICT (code) DO NOTHING;

INSERT INTO outlets (branch_id, code, name, address) 
  SELECT id, code||'-01', name||' - Outlet Utama', address FROM branches
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (name, description, permissions) VALUES
  ('Admin', 'Administrator sistem', '["*"]'::jsonb),
  ('Manager', 'Manager cabang', '["read","write"]'::jsonb),
  ('Kasir', 'Petugas kasir', '["pos","sales"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Default admin user: email=admin@zalio.com password=admin123
-- bcrypt hash of 'admin123'
INSERT INTO users (email, password_hash, full_name, role_id, branch_id)
  SELECT 'admin@zalio.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Administrator Zalio',
    (SELECT id FROM user_roles WHERE name='Admin' LIMIT 1),
    (SELECT id FROM branches WHERE code='HQ' LIMIT 1)
ON CONFLICT (email) DO NOTHING;

INSERT INTO brands (name, description) VALUES
  ('Zalio', 'Brand utama Zalio'),
  ('Indofood', 'Produk konsumsi'),
  ('Unilever', 'Produk kebersihan'),
  ('Nestle', 'Produk makanan & minuman')
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (name, description) VALUES
  ('Makanan', 'Kategori makanan'),
  ('Minuman', 'Kategori minuman'),
  ('Kebersihan', 'Produk kebersihan'),
  ('Elektronik', 'Produk elektronik')
ON CONFLICT DO NOTHING;

INSERT INTO uoms (code, name) VALUES
  ('PCS', 'Pieces'),
  ('KG', 'Kilogram'),
  ('LTR', 'Liter'),
  ('BOX', 'Box'),
  ('PACK', 'Pack')
ON CONFLICT (code) DO NOTHING;

INSERT INTO warehouses (branch_id, code, name, location)
  SELECT id, code||'-WH', name||' - Gudang Utama', address FROM branches
ON CONFLICT (code) DO NOTHING;

-- Sample products
INSERT INTO products (sku, name, brand_id, category_id, uom_id, selling_price, cogs, stock_qty, image_url)
  SELECT 'SKU-001', 'Indomie Goreng Original', 
    (SELECT id FROM brands WHERE name='Indofood'),
    (SELECT id FROM categories WHERE name='Makanan'),
    (SELECT id FROM uoms WHERE code='PCS'), 3500, 2500, 250,
    'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=100'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='SKU-001');

INSERT INTO products (sku, name, brand_id, category_id, uom_id, selling_price, cogs, stock_qty, image_url)
  SELECT 'SKU-002', 'Aqua Botol 600ml',
    (SELECT id FROM brands WHERE name='Nestle'),
    (SELECT id FROM categories WHERE name='Minuman'),
    (SELECT id FROM uoms WHERE code='PCS'), 4000, 2800, 500,
    'https://images.unsplash.com/photo-1550505095-81378a674395?w=100'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='SKU-002');

INSERT INTO products (sku, name, brand_id, category_id, uom_id, selling_price, cogs, stock_qty, image_url)
  SELECT 'SKU-003', 'Rinso Deterjen 800g',
    (SELECT id FROM brands WHERE name='Unilever'),
    (SELECT id FROM categories WHERE name='Kebersihan'),
    (SELECT id FROM uoms WHERE code='PACK'), 25000, 18000, 120,
    'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=100'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='SKU-003');

INSERT INTO customers (code, name, email, phone, category) VALUES
  ('CUST-001', 'PT Maju Jaya', 'purchase@majujaya.co.id', '021-5551234', 'Corporate'),
  ('CUST-002', 'CV Berkah Abadi', 'admin@berkahabadi.com', '021-5559876', 'Business'),
  ('CUST-003', 'Toko Sinar Baru', 'sinarbaru@gmail.com', '0812-3456789', 'Retail')
ON CONFLICT (code) DO NOTHING;

INSERT INTO suppliers (code, name, email, phone, category, payment_term) VALUES
  ('SUP-001', 'PT Distributor Nasional', 'sales@distnas.co.id', '021-6661234', 'Distributor', 'NET-30'),
  ('SUP-002', 'CV Grosir Utama', 'grosir@utama.com', '021-6669876', 'Wholesaler', 'NET-14')
ON CONFLICT (code) DO NOTHING;
