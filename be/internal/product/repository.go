package product

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound dikembalikan ketika product tidak ditemukan.
var ErrNotFound = errors.New("product not found")

// Repository CRUD untuk product.
type Repository interface {
	List(ctx context.Context) ([]Product, error)
	Get(ctx context.Context, id string) (Product, error)
	Create(ctx context.Context, p Product) (Product, error)
	Update(ctx context.Context, p Product) (Product, error)
	Delete(ctx context.Context, id string) error
}

// ---- in-memory ----

type memoryRepository struct {
	mu       sync.RWMutex
	products map[string]Product
}

// NewMemoryRepository berisi data seed sederhana.
func NewMemoryRepository() Repository {
	now := time.Now().UTC()
	r := &memoryRepository{products: map[string]Product{}}
	seed := []Product{
		{ID: "prd-001", Name: "Kopi Arabika 250g", Description: "Roasted whole bean", Price: 85000, CreatedAt: now},
		{ID: "prd-002", Name: "Teh Melati 100g", Description: "Loose-leaf", Price: 42000, CreatedAt: now},
		{ID: "prd-003", Name: "Gula Aren 500g", Description: "Organic palm sugar", Price: 38000, CreatedAt: now},
	}
	for _, p := range seed {
		r.products[p.ID] = p
	}
	return r
}

func (r *memoryRepository) List(_ context.Context) ([]Product, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]Product, 0, len(r.products))
	for _, p := range r.products {
		out = append(out, p)
	}
	return out, nil
}

func (r *memoryRepository) Get(_ context.Context, id string) (Product, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if p, ok := r.products[id]; ok {
		return p, nil
	}
	return Product{}, ErrNotFound
}

func (r *memoryRepository) Create(_ context.Context, p Product) (Product, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if p.CreatedAt.IsZero() {
		p.CreatedAt = time.Now().UTC()
	}
	r.products[p.ID] = p
	return p, nil
}

func (r *memoryRepository) Update(_ context.Context, p Product) (Product, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	existing, ok := r.products[p.ID]
	if !ok {
		return Product{}, ErrNotFound
	}
	p.CreatedAt = existing.CreatedAt
	r.products[p.ID] = p
	return p, nil
}

func (r *memoryRepository) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.products[id]; !ok {
		return ErrNotFound
	}
	delete(r.products, id)
	return nil
}

// ---- postgres ----

type postgresRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresRepository menggunakan tabel `products`.
func NewPostgresRepository(pool *pgxpool.Pool) Repository {
	return &postgresRepository{pool: pool}
}

func (r *postgresRepository) List(ctx context.Context) ([]Product, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, name, description, price, created_at FROM products ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Product{}
	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Price, &p.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *postgresRepository) Get(ctx context.Context, id string) (Product, error) {
	row := r.pool.QueryRow(ctx, `SELECT id, name, description, price, created_at FROM products WHERE id=$1`, id)
	var p Product
	if err := row.Scan(&p.ID, &p.Name, &p.Description, &p.Price, &p.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Product{}, ErrNotFound
		}
		return Product{}, err
	}
	return p, nil
}

func (r *postgresRepository) Create(ctx context.Context, p Product) (Product, error) {
	if p.CreatedAt.IsZero() {
		p.CreatedAt = time.Now().UTC()
	}
	_, err := r.pool.Exec(ctx,
		`INSERT INTO products (id, name, description, price, created_at) VALUES ($1,$2,$3,$4,$5)`,
		p.ID, p.Name, p.Description, p.Price, p.CreatedAt,
	)
	if err != nil {
		return Product{}, err
	}
	return p, nil
}

func (r *postgresRepository) Update(ctx context.Context, p Product) (Product, error) {
	tag, err := r.pool.Exec(ctx,
		`UPDATE products SET name=$2, description=$3, price=$4 WHERE id=$1`,
		p.ID, p.Name, p.Description, p.Price,
	)
	if err != nil {
		return Product{}, err
	}
	if tag.RowsAffected() == 0 {
		return Product{}, ErrNotFound
	}
	return r.Get(ctx, p.ID)
}

func (r *postgresRepository) Delete(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM products WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
