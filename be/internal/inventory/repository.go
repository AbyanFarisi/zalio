package inventory

import (
	"context"
	"time"
)

// Repository isolates inventory use cases from persistence details.
type Repository interface {
	List(ctx context.Context) ([]Stock, error)
}

type memoryRepository struct {
	stocks []Stock
}

// NewMemoryRepository seeds inventory data so the service can be exercised
// end-to-end before PostgreSQL persistence is introduced.
func NewMemoryRepository() Repository {
	now := time.Now().UTC()
	return &memoryRepository{stocks: []Stock{
		{ID: "stk-001", ProductID: "prd-001", Warehouse: "WH-JKT", Quantity: 120, UpdatedAt: now},
		{ID: "stk-002", ProductID: "prd-002", Warehouse: "WH-JKT", Quantity: 45, UpdatedAt: now},
		{ID: "stk-003", ProductID: "prd-003", Warehouse: "WH-BDG", Quantity: 8, UpdatedAt: now},
	}}
}

func (r *memoryRepository) List(_ context.Context) ([]Stock, error) {
	return append([]Stock{}, r.stocks...), nil
}
