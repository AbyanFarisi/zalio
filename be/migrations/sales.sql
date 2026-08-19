-- Skema awal sales-service.
CREATE TABLE IF NOT EXISTS orders (
    id            TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    total         NUMERIC(14,2) NOT NULL DEFAULT 0,
    status        TEXT NOT NULL DEFAULT 'pending',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
