-- Skema awal finance-service.
CREATE TABLE IF NOT EXISTS transactions (
    id         TEXT PRIMARY KEY,
    ref_type   TEXT NOT NULL,
    ref_id     TEXT NOT NULL,
    amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
    type       TEXT NOT NULL CHECK (type IN ('debit','credit')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_ref ON transactions (ref_type, ref_id);
