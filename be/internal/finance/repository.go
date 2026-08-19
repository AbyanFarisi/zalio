package finance

import (
	"context"
	"time"
)

// Repository isolates finance use cases from persistence details.
type Repository interface {
	List(ctx context.Context) ([]Transaction, error)
}

type memoryRepository struct {
	transactions []Transaction
}

// NewMemoryRepository seeds finance journal entries for early API testing
// before PostgreSQL persistence is introduced.
func NewMemoryRepository() Repository {
	now := time.Now().UTC()
	return &memoryRepository{transactions: []Transaction{
		{ID: "trx-001", RefType: "sales_order", RefID: "ord-001", Amount: 250000, Type: "credit", CreatedAt: now},
		{ID: "trx-002", RefType: "purchase_order", RefID: "po-001", Amount: 180000, Type: "debit", CreatedAt: now},
		{ID: "trx-003", RefType: "sales_order", RefID: "ord-003", Amount: 1275000, Type: "credit", CreatedAt: now},
	}}
}

func (r *memoryRepository) List(_ context.Context) ([]Transaction, error) {
	return append([]Transaction{}, r.transactions...), nil
}
