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
  SELECT 'admin@zalio.com', '$2b$10$Mq6gTGV5Cl1pycbl5henseB41HcEnMzlYnXcTriKjYeyKpKbDOkVa', 'Administrator Zalio',
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


-- ===== MODULES APPENDED (see modules.sql) =====
-- Zalio ERP - Additional Modules Schema (idempotent)
-- All master tables carry is_active + created_at for the generic CRUD handler.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure sales_orders extra columns exist
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_point NUMERIC(15,3) DEFAULT 20;

-- ============ helper macro (manual) ============
-- Simple category-like tables
CREATE TABLE IF NOT EXISTS customer_categories ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(200) NOT NULL, description TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS supplier_categories ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(200) NOT NULL, description TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS sales_categories ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(200) NOT NULL, description TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS sales_channels ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(200) NOT NULL, description TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS sales_types ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(200) NOT NULL, description TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS expense_categories ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(200) NOT NULL, description TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS payment_terms ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(200) NOT NULL, days INTEGER DEFAULT 0, description TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS tax_rates ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(200) NOT NULL, rate NUMERIC(6,2) DEFAULT 0, description TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS promotions ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(200) NOT NULL, promo_type VARCHAR(50), value NUMERIC(15,2) DEFAULT 0, start_date DATE, end_date DATE, description TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS app_settings ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(200) NOT NULL, value TEXT, description TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS pos_settings ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(200) NOT NULL, value TEXT, description TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS auto_numbers ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), module VARCHAR(100) NOT NULL, prefix VARCHAR(50), next_number INTEGER DEFAULT 1, description TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS salary_components ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(200) NOT NULL, comp_type VARCHAR(50), amount NUMERIC(15,2) DEFAULT 0, description TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS period_closings ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), period VARCHAR(50) NOT NULL, status VARCHAR(50) DEFAULT 'OPEN', notes TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );

-- Product subcategory (FK to categories)
CREATE TABLE IF NOT EXISTS product_subcategories ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(200) NOT NULL, category_id UUID REFERENCES categories(id) ON DELETE SET NULL, description TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );

-- ============ FINANCE ============
CREATE TABLE IF NOT EXISTS chart_of_accounts ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), code VARCHAR(50) NOT NULL, name VARCHAR(200) NOT NULL, account_type VARCHAR(50), normal_balance VARCHAR(10), description TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS journal_vouchers ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), voucher_number VARCHAR(50), voucher_date DATE DEFAULT CURRENT_DATE, description TEXT, debit_account VARCHAR(200), credit_account VARCHAR(200), amount NUMERIC(15,2) DEFAULT 0, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS bank_accounts ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(200) NOT NULL, bank_name VARCHAR(200), account_number VARCHAR(100), balance NUMERIC(15,2) DEFAULT 0, description TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS bank_transactions ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), bank_name VARCHAR(200), trx_type VARCHAR(50), amount NUMERIC(15,2) DEFAULT 0, trx_date DATE DEFAULT CURRENT_DATE, description TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS budgets ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), account_name VARCHAR(200) NOT NULL, period VARCHAR(50), amount NUMERIC(15,2) DEFAULT 0, description TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS payrolls ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), employee_name VARCHAR(200) NOT NULL, period VARCHAR(50), basic_salary NUMERIC(15,2) DEFAULT 0, allowance NUMERIC(15,2) DEFAULT 0, deduction NUMERIC(15,2) DEFAULT 0, net_salary NUMERIC(15,2) DEFAULT 0, description TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS expense_accruals ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(200) NOT NULL, amount NUMERIC(15,2) DEFAULT 0, accrual_date DATE DEFAULT CURRENT_DATE, description TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );

-- ============ SALES EXTRA ============
CREATE TABLE IF NOT EXISTS sales_receipts ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), receipt_number VARCHAR(50), order_number VARCHAR(50), customer_name VARCHAR(200), amount NUMERIC(15,2) DEFAULT 0, receipt_date DATE DEFAULT CURRENT_DATE, payment_method VARCHAR(50), notes TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS sales_returns ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), return_number VARCHAR(50), order_number VARCHAR(50), customer_name VARCHAR(200), amount NUMERIC(15,2) DEFAULT 0, return_date DATE DEFAULT CURRENT_DATE, reason TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS sales_dps ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), dp_number VARCHAR(50), customer_name VARCHAR(200), amount NUMERIC(15,2) DEFAULT 0, dp_date DATE DEFAULT CURRENT_DATE, notes TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS sales_targets ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(200) NOT NULL, period VARCHAR(50), target_amount NUMERIC(15,2) DEFAULT 0, achieved NUMERIC(15,2) DEFAULT 0, description TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS price_adjustments ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(200) NOT NULL, product_name VARCHAR(200), old_price NUMERIC(15,2) DEFAULT 0, new_price NUMERIC(15,2) DEFAULT 0, adjustment_date DATE DEFAULT CURRENT_DATE, reason TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );

-- ============ PURCHASE ============
CREATE TABLE IF NOT EXISTS purchase_orders ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), order_number VARCHAR(50) UNIQUE NOT NULL, supplier_id UUID REFERENCES suppliers(id), branch_id UUID REFERENCES branches(id), order_date DATE DEFAULT CURRENT_DATE, subtotal NUMERIC(15,2) DEFAULT 0, tax NUMERIC(15,2) DEFAULT 0, discount NUMERIC(15,2) DEFAULT 0, total NUMERIC(15,2) DEFAULT 0, status VARCHAR(30) DEFAULT 'DRAFT', notes TEXT, payment_method VARCHAR(50), created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS purchase_order_items ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE, product_id UUID REFERENCES products(id), quantity NUMERIC(15,3) NOT NULL, price NUMERIC(15,2) NOT NULL, subtotal NUMERIC(15,2) NOT NULL );
CREATE TABLE IF NOT EXISTS purchase_receipts ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), receipt_number VARCHAR(50), order_number VARCHAR(50), supplier_name VARCHAR(200), receipt_date DATE DEFAULT CURRENT_DATE, notes TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS purchase_payments ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), payment_number VARCHAR(50), order_number VARCHAR(50), supplier_name VARCHAR(200), amount NUMERIC(15,2) DEFAULT 0, payment_date DATE DEFAULT CURRENT_DATE, payment_method VARCHAR(50), notes TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS purchase_returns ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), return_number VARCHAR(50), order_number VARCHAR(50), supplier_name VARCHAR(200), amount NUMERIC(15,2) DEFAULT 0, return_date DATE DEFAULT CURRENT_DATE, reason TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS purchase_dps ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), dp_number VARCHAR(50), supplier_name VARCHAR(200), amount NUMERIC(15,2) DEFAULT 0, dp_date DATE DEFAULT CURRENT_DATE, notes TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS supplier_prices ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), supplier_name VARCHAR(200), product_name VARCHAR(200), price NUMERIC(15,2) DEFAULT 0, description TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW() );

-- ============ INVENTORY ============
CREATE TABLE IF NOT EXISTS stock_transfers ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), transfer_number VARCHAR(50), product_id UUID REFERENCES products(id), from_warehouse_id UUID REFERENCES warehouses(id), to_warehouse_id UUID REFERENCES warehouses(id), quantity NUMERIC(15,3) DEFAULT 0, transfer_date DATE DEFAULT CURRENT_DATE, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS stock_opnames ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), opname_number VARCHAR(50), product_id UUID REFERENCES products(id), warehouse_id UUID REFERENCES warehouses(id), system_qty NUMERIC(15,3) DEFAULT 0, actual_qty NUMERIC(15,3) DEFAULT 0, difference NUMERIC(15,3) DEFAULT 0, opname_date DATE DEFAULT CURRENT_DATE, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS stock_adjustments ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), adjustment_number VARCHAR(50), product_id UUID REFERENCES products(id), warehouse_id UUID REFERENCES warehouses(id), quantity NUMERIC(15,3) DEFAULT 0, adjustment_type VARCHAR(30), reason TEXT, adjustment_date DATE DEFAULT CURRENT_DATE, created_at TIMESTAMPTZ DEFAULT NOW() );

-- ============ ACTIVITY LOG ============
CREATE TABLE IF NOT EXISTS activity_logs ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), action VARCHAR(50), module VARCHAR(100), description TEXT, user_name VARCHAR(200) DEFAULT 'system', created_at TIMESTAMPTZ DEFAULT NOW() );

-- ============ SEED DATA ============
INSERT INTO customer_categories (name, description) SELECT 'Retail','Pelanggan retail' WHERE NOT EXISTS (SELECT 1 FROM customer_categories);
INSERT INTO customer_categories (name, description) SELECT 'Corporate','Pelanggan korporat' WHERE NOT EXISTS (SELECT 1 FROM customer_categories WHERE name='Corporate');
INSERT INTO supplier_categories (name, description) SELECT 'Distributor','Pemasok distributor' WHERE NOT EXISTS (SELECT 1 FROM supplier_categories);
INSERT INTO sales_channels (name, description) SELECT 'Offline Store','Toko fisik' WHERE NOT EXISTS (SELECT 1 FROM sales_channels);
INSERT INTO sales_channels (name, description) SELECT 'Online','Marketplace / web' WHERE NOT EXISTS (SELECT 1 FROM sales_channels WHERE name='Online');
INSERT INTO sales_types (name, description) SELECT 'Reguler','Penjualan reguler' WHERE NOT EXISTS (SELECT 1 FROM sales_types);
INSERT INTO expense_categories (name, description) SELECT 'Operasional','Beban operasional' WHERE NOT EXISTS (SELECT 1 FROM expense_categories);
INSERT INTO payment_terms (name, days, description) SELECT 'Tunai',0,'Bayar langsung' WHERE NOT EXISTS (SELECT 1 FROM payment_terms);
INSERT INTO payment_terms (name, days, description) SELECT 'NET-30',30,'Jatuh tempo 30 hari' WHERE NOT EXISTS (SELECT 1 FROM payment_terms WHERE name='NET-30');
INSERT INTO tax_rates (name, rate, description) SELECT 'PPN 11%',11,'Pajak Pertambahan Nilai' WHERE NOT EXISTS (SELECT 1 FROM tax_rates);
INSERT INTO promotions (name, promo_type, value, description) SELECT 'Diskon Akhir Pekan','PERCENT',10,'Diskon 10% weekend' WHERE NOT EXISTS (SELECT 1 FROM promotions);
INSERT INTO chart_of_accounts (code, name, account_type, normal_balance) SELECT '1-1000','Kas','ASSET','DEBIT' WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code='1-1000');
INSERT INTO chart_of_accounts (code, name, account_type, normal_balance) SELECT '1-1100','Bank','ASSET','DEBIT' WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code='1-1100');
INSERT INTO chart_of_accounts (code, name, account_type, normal_balance) SELECT '4-1000','Pendapatan Penjualan','REVENUE','CREDIT' WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code='4-1000');
INSERT INTO chart_of_accounts (code, name, account_type, normal_balance) SELECT '5-1000','Beban Pokok Penjualan','EXPENSE','DEBIT' WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code='5-1000');
INSERT INTO bank_accounts (name, bank_name, account_number, balance) SELECT 'Rekening Operasional','BCA','1234567890',50000000 WHERE NOT EXISTS (SELECT 1 FROM bank_accounts);
INSERT INTO app_settings (name, value, description) SELECT 'Mata Uang','IDR','Mata uang default' WHERE NOT EXISTS (SELECT 1 FROM app_settings);
INSERT INTO pos_settings (name, value, description) SELECT 'Struk Footer','Terima kasih telah berbelanja','Teks footer struk' WHERE NOT EXISTS (SELECT 1 FROM pos_settings);
INSERT INTO auto_numbers (module, prefix, next_number) SELECT 'sales_order','SO',1 WHERE NOT EXISTS (SELECT 1 FROM auto_numbers WHERE module='sales_order');
INSERT INTO auto_numbers (module, prefix, next_number) SELECT 'purchase_order','PO',1 WHERE NOT EXISTS (SELECT 1 FROM auto_numbers WHERE module='purchase_order');
INSERT INTO salary_components (name, comp_type, amount) SELECT 'Tunjangan Transport','ALLOWANCE',500000 WHERE NOT EXISTS (SELECT 1 FROM salary_components);
