package inventory

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("stock not found")

type Repository interface {
	List(ctx context.Context) ([]Stock, error)
	Get(ctx context.Context, id string) (Stock, error)
	Create(ctx context.Context, s Stock) (Stock, error)
	Update(ctx context.Context, s Stock) (Stock, error)
	Delete(ctx context.Context, id string) error
}

func NewID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return "stk-" + hex.EncodeToString(b)
}

// ---- in-memory ----

type memoryRepository struct {
	mu     sync.RWMutex
	stocks map[string]Stock
}

func NewMemoryRepository() Repository {
	now := time.Now().UTC()
	r := &memoryRepository{stocks: map[string]Stock{}}
	seed := []Stock{
		{ID: "stk-001", ProductID: "prd-001", Warehouse: "WH-JKT", Quantity: 120, UpdatedAt: now},
		{ID: "stk-002", ProductID: "prd-002", Warehouse: "WH-JKT", Quantity: 45, UpdatedAt: now},
		{ID: "stk-003", ProductID: "prd-003", Warehouse: "WH-BDG", Quantity: 8, UpdatedAt: now},
	}
	for _, s := range seed {
		r.stocks[s.ID] = s
	}
	return r
}

func (r *memoryRepository) List(_ context.Context) ([]Stock, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]Stock, 0, len(r.stocks))
	for _, s := range r.stocks {
		out = append(out, s)
	}
	return out, nil
}

func (r *memoryRepository) Get(_ context.Context, id string) (Stock, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if s, ok := r.stocks[id]; ok {
		return s, nil
	}
	return Stock{}, ErrNotFound
}

func (r *memoryRepository) Create(_ context.Context, s Stock) (Stock, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	s.UpdatedAt = time.Now().UTC()
	r.stocks[s.ID] = s
	return s, nil
}

func (r *memoryRepository) Update(_ context.Context, s Stock) (Stock, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.stocks[s.ID]; !ok {
		return Stock{}, ErrNotFound
	}
	s.UpdatedAt = time.Now().UTC()
	r.stocks[s.ID] = s
	return s, nil
}

func (r *memoryRepository) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.stocks[id]; !ok {
		return ErrNotFound
	}
	delete(r.stocks, id)
	return nil
}

// ---- postgres ----

type postgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) Repository {
	return &postgresRepository{pool: pool}
}

func (r *postgresRepository) List(ctx context.Context) ([]Stock, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, product_id, warehouse, quantity, updated_at FROM stocks ORDER BY updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Stock{}
	for rows.Next() {
		var s Stock
		if err := rows.Scan(&s.ID, &s.ProductID, &s.Warehouse, &s.Quantity, &s.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *postgresRepository) Get(ctx context.Context, id string) (Stock, error) {
	row := r.pool.QueryRow(ctx, `SELECT id, product_id, warehouse, quantity, updated_at FROM stocks WHERE id=$1`, id)
	var s Stock
	if err := row.Scan(&s.ID, &s.ProductID, &s.Warehouse, &s.Quantity, &s.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Stock{}, ErrNotFound
		}
		return Stock{}, err
	}
	return s, nil
}

func (r *postgresRepository) Create(ctx context.Context, s Stock) (Stock, error) {
	s.UpdatedAt = time.Now().UTC()
	_, err := r.pool.Exec(ctx,
		`INSERT INTO stocks (id, product_id, warehouse, quantity, updated_at) VALUES ($1,$2,$3,$4,$5)`,
		s.ID, s.ProductID, s.Warehouse, s.Quantity, s.UpdatedAt,
	)
	if err != nil {
		return Stock{}, err
	}
	return s, nil
}

func (r *postgresRepository) Update(ctx context.Context, s Stock) (Stock, error) {
	s.UpdatedAt = time.Now().UTC()
	tag, err := r.pool.Exec(ctx,
		`UPDATE stocks SET product_id=$2, warehouse=$3, quantity=$4, updated_at=$5 WHERE id=$1`,
		s.ID, s.ProductID, s.Warehouse, s.Quantity, s.UpdatedAt,
	)
	if err != nil {
		return Stock{}, err
	}
	if tag.RowsAffected() == 0 {
		return Stock{}, ErrNotFound
	}
	return s, nil
}

func (r *postgresRepository) Delete(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM stocks WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
