package sales

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

var ErrNotFound = errors.New("order not found")

type Repository interface {
	List(ctx context.Context) ([]Order, error)
	Get(ctx context.Context, id string) (Order, error)
	Create(ctx context.Context, o Order) (Order, error)
	Update(ctx context.Context, o Order) (Order, error)
	Delete(ctx context.Context, id string) error
}

func NewID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return "ord-" + hex.EncodeToString(b)
}

// ---- in-memory ----

type memoryRepository struct {
	mu     sync.RWMutex
	orders map[string]Order
}

func NewMemoryRepository() Repository {
	now := time.Now().UTC()
	r := &memoryRepository{orders: map[string]Order{}}
	seed := []Order{
		{ID: "ord-001", CustomerName: "Budi Santoso", Total: 250000, Status: "paid", CreatedAt: now},
		{ID: "ord-002", CustomerName: "Siti Nurhaliza", Total: 89000, Status: "pending", CreatedAt: now},
		{ID: "ord-003", CustomerName: "PT Sinar Abadi", Total: 1275000, Status: "paid", CreatedAt: now},
	}
	for _, o := range seed {
		r.orders[o.ID] = o
	}
	return r
}

func (r *memoryRepository) List(_ context.Context) ([]Order, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]Order, 0, len(r.orders))
	for _, o := range r.orders {
		out = append(out, o)
	}
	return out, nil
}

func (r *memoryRepository) Get(_ context.Context, id string) (Order, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if o, ok := r.orders[id]; ok {
		return o, nil
	}
	return Order{}, ErrNotFound
}

func (r *memoryRepository) Create(_ context.Context, o Order) (Order, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if o.CreatedAt.IsZero() {
		o.CreatedAt = time.Now().UTC()
	}
	if o.Status == "" {
		o.Status = "pending"
	}
	r.orders[o.ID] = o
	return o, nil
}

func (r *memoryRepository) Update(_ context.Context, o Order) (Order, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	existing, ok := r.orders[o.ID]
	if !ok {
		return Order{}, ErrNotFound
	}
	o.CreatedAt = existing.CreatedAt
	r.orders[o.ID] = o
	return o, nil
}

func (r *memoryRepository) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.orders[id]; !ok {
		return ErrNotFound
	}
	delete(r.orders, id)
	return nil
}

// ---- postgres ----

type postgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) Repository {
	return &postgresRepository{pool: pool}
}

func (r *postgresRepository) List(ctx context.Context) ([]Order, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, customer_name, total, status, created_at FROM orders ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Order{}
	for rows.Next() {
		var o Order
		if err := rows.Scan(&o.ID, &o.CustomerName, &o.Total, &o.Status, &o.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

func (r *postgresRepository) Get(ctx context.Context, id string) (Order, error) {
	row := r.pool.QueryRow(ctx, `SELECT id, customer_name, total, status, created_at FROM orders WHERE id=$1`, id)
	var o Order
	if err := row.Scan(&o.ID, &o.CustomerName, &o.Total, &o.Status, &o.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Order{}, ErrNotFound
		}
		return Order{}, err
	}
	return o, nil
}

func (r *postgresRepository) Create(ctx context.Context, o Order) (Order, error) {
	if o.CreatedAt.IsZero() {
		o.CreatedAt = time.Now().UTC()
	}
	if o.Status == "" {
		o.Status = "pending"
	}
	_, err := r.pool.Exec(ctx,
		`INSERT INTO orders (id, customer_name, total, status, created_at) VALUES ($1,$2,$3,$4,$5)`,
		o.ID, o.CustomerName, o.Total, o.Status, o.CreatedAt,
	)
	if err != nil {
		return Order{}, err
	}
	return o, nil
}

func (r *postgresRepository) Update(ctx context.Context, o Order) (Order, error) {
	tag, err := r.pool.Exec(ctx,
		`UPDATE orders SET customer_name=$2, total=$3, status=$4 WHERE id=$1`,
		o.ID, o.CustomerName, o.Total, o.Status,
	)
	if err != nil {
		return Order{}, err
	}
	if tag.RowsAffected() == 0 {
		return Order{}, ErrNotFound
	}
	return r.Get(ctx, o.ID)
}

func (r *postgresRepository) Delete(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM orders WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
