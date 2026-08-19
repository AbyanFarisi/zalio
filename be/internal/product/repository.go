package product

import "context"

// Repository isolates product use cases from persistence details.
type Repository interface {
	List(ctx context.Context) ([]Product, error)
}

type memoryRepository struct {
	products []Product
}

// NewMemoryRepository provides a safe empty repository until PostgreSQL
// persistence is introduced in the next migration step.
func NewMemoryRepository() Repository {
	return &memoryRepository{products: []Product{}}
}

func (r *memoryRepository) List(_ context.Context) ([]Product, error) {
	return append([]Product{}, r.products...), nil
}
