package finance

import "time"

// Transaction represents a debit/credit journal entry for finance-service.
type Transaction struct {
	ID        string    `json:"id"`
	RefType   string    `json:"ref_type"`
	RefID     string    `json:"ref_id"`
	Amount    float64   `json:"amount"`
	Type      string    `json:"type"` // "debit" or "credit"
	CreatedAt time.Time `json:"created_at"`
}
