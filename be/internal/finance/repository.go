package finance

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

var ErrNotFound = errors.New("transaction not found")

type Repository interface {
	List(ctx context.Context) ([]Transaction, error)
	Get(ctx context.Context, id string) (Transaction, error)
	Create(ctx context.Context, t Transaction) (Transaction, error)
	Update(ctx context.Context, t Transaction) (Transaction, error)
	Delete(ctx context.Context, id string) error
}

func NewID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return "trx-" + hex.EncodeToString(b)
}

// ---- in-memory ----

type memoryRepository struct {
	mu           sync.RWMutex
	transactions map[string]Transaction
}

func NewMemoryRepository() Repository {
	now := time.Now().UTC()
	r := &memoryRepository{transactions: map[string]Transaction{}}
	seed := []Transaction{
		{ID: "trx-001", RefType: "sales_order", RefID: "ord-001", Amount: 250000, Type: "credit", CreatedAt: now},
		{ID: "trx-002", RefType: "purchase_order", RefID: "po-001", Amount: 180000, Type: "debit", CreatedAt: now},
		{ID: "trx-003", RefType: "sales_order", RefID: "ord-003", Amount: 1275000, Type: "credit", CreatedAt: now},
	}
	for _, t := range seed {
		r.transactions[t.ID] = t
	}
	return r
}

func (r *memoryRepository) List(_ context.Context) ([]Transaction, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]Transaction, 0, len(r.transactions))
	for _, t := range r.transactions {
		out = append(out, t)
	}
	return out, nil
}

func (r *memoryRepository) Get(_ context.Context, id string) (Transaction, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if t, ok := r.transactions[id]; ok {
		return t, nil
	}
	return Transaction{}, ErrNotFound
}

func (r *memoryRepository) Create(_ context.Context, t Transaction) (Transaction, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if t.CreatedAt.IsZero() {
		t.CreatedAt = time.Now().UTC()
	}
	r.transactions[t.ID] = t
	return t, nil
}

func (r *memoryRepository) Update(_ context.Context, t Transaction) (Transaction, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	existing, ok := r.transactions[t.ID]
	if !ok {
		return Transaction{}, ErrNotFound
	}
	t.CreatedAt = existing.CreatedAt
	r.transactions[t.ID] = t
	return t, nil
}

func (r *memoryRepository) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.transactions[id]; !ok {
		return ErrNotFound
	}
	delete(r.transactions, id)
	return nil
}

// ---- postgres ----

type postgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) Repository {
	return &postgresRepository{pool: pool}
}

func (r *postgresRepository) List(ctx context.Context) ([]Transaction, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, ref_type, ref_id, amount, type, created_at FROM transactions ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Transaction{}
	for rows.Next() {
		var t Transaction
		if err := rows.Scan(&t.ID, &t.RefType, &t.RefID, &t.Amount, &t.Type, &t.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func (r *postgresRepository) Get(ctx context.Context, id string) (Transaction, error) {
	row := r.pool.QueryRow(ctx, `SELECT id, ref_type, ref_id, amount, type, created_at FROM transactions WHERE id=$1`, id)
	var t Transaction
	if err := row.Scan(&t.ID, &t.RefType, &t.RefID, &t.Amount, &t.Type, &t.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Transaction{}, ErrNotFound
		}
		return Transaction{}, err
	}
	return t, nil
}

func (r *postgresRepository) Create(ctx context.Context, t Transaction) (Transaction, error) {
	if t.CreatedAt.IsZero() {
		t.CreatedAt = time.Now().UTC()
	}
	_, err := r.pool.Exec(ctx,
		`INSERT INTO transactions (id, ref_type, ref_id, amount, type, created_at) VALUES ($1,$2,$3,$4,$5,$6)`,
		t.ID, t.RefType, t.RefID, t.Amount, t.Type, t.CreatedAt,
	)
	if err != nil {
		return Transaction{}, err
	}
	return t, nil
}

func (r *postgresRepository) Update(ctx context.Context, t Transaction) (Transaction, error) {
	tag, err := r.pool.Exec(ctx,
		`UPDATE transactions SET ref_type=$2, ref_id=$3, amount=$4, type=$5 WHERE id=$1`,
		t.ID, t.RefType, t.RefID, t.Amount, t.Type,
	)
	if err != nil {
		return Transaction{}, err
	}
	if tag.RowsAffected() == 0 {
		return Transaction{}, ErrNotFound
	}
	return r.Get(ctx, t.ID)
}

func (r *postgresRepository) Delete(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM transactions WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
