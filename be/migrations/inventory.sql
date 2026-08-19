-- Skema awal inventory-service.
CREATE TABLE IF NOT EXISTS stocks (
    id         TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    warehouse  TEXT NOT NULL,
    quantity   INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stocks_product ON stocks (product_id);
