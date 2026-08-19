package identity

import (
	"context"
	"time"
)

// Repository isolates identity use cases from persistence details.
type Repository interface {
	List(ctx context.Context) ([]User, error)
}

type memoryRepository struct {
	users []User
}

// NewMemoryRepository provides seeded in-memory users so the service can
// render sample data before PostgreSQL persistence is wired in.
func NewMemoryRepository() Repository {
	now := time.Now().UTC()
	return &memoryRepository{users: []User{
		{ID: "usr-001", Email: "admin@example.com", Name: "System Admin", Role: "admin", CreatedAt: now},
		{ID: "usr-002", Email: "kasir@example.com", Name: "Kasir Utama", Role: "cashier", CreatedAt: now},
		{ID: "usr-003", Email: "gudang@example.com", Name: "Petugas Gudang", Role: "warehouse", CreatedAt: now},
	}}
}

func (r *memoryRepository) List(_ context.Context) ([]User, error) {
	return append([]User{}, r.users...), nil
}
