package sales

import (
	"context"
	"time"
)

// Repository isolates sales use cases from persistence details.
type Repository interface {
	List(ctx context.Context) ([]Order, error)
}

type memoryRepository struct {
	orders []Order
}

// NewMemoryRepository seeds sales orders for early UI/API exploration
// before PostgreSQL persistence is wired in.
func NewMemoryRepository() Repository {
	now := time.Now().UTC()
	return &memoryRepository{orders: []Order{
		{ID: "ord-001", CustomerName: "Budi Santoso", Total: 250000, Status: "paid", CreatedAt: now},
		{ID: "ord-002", CustomerName: "Siti Nurhaliza", Total: 89000, Status: "pending", CreatedAt: now},
		{ID: "ord-003", CustomerName: "PT Sinar Abadi", Total: 1275000, Status: "paid", CreatedAt: now},
	}}
}

func (r *memoryRepository) List(_ context.Context) ([]Order, error) {
	return append([]Order{}, r.orders...), nil
}
