package identity

import (
	"context"
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound dikembalikan repository ketika user tidak ada.
var ErrNotFound = errors.New("user not found")

// ErrDuplicateEmail dikembalikan ketika email sudah dipakai.
var ErrDuplicateEmail = errors.New("email already registered")

// Repository memisahkan use case identity dari detail persistence.
type Repository interface {
	List(ctx context.Context) ([]User, error)
	Create(ctx context.Context, u User) (User, error)
	FindByEmail(ctx context.Context, email string) (User, error)
	FindByID(ctx context.Context, id string) (User, error)
}

// ---- in-memory ----

type memoryRepository struct {
	mu    sync.RWMutex
	users map[string]User
}

// NewMemoryRepository menyediakan repository memori untuk pengembangan.
func NewMemoryRepository() Repository {
	return &memoryRepository{users: map[string]User{}}
}

func (r *memoryRepository) List(_ context.Context) ([]User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]User, 0, len(r.users))
	for _, u := range r.users {
		out = append(out, u)
	}
	return out, nil
}

func (r *memoryRepository) Create(_ context.Context, u User) (User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	email := strings.ToLower(u.Email)
	for _, existing := range r.users {
		if strings.ToLower(existing.Email) == email {
			return User{}, ErrDuplicateEmail
		}
	}
	u.Email = email
	if u.CreatedAt.IsZero() {
		u.CreatedAt = time.Now().UTC()
	}
	r.users[u.ID] = u
	return u, nil
}

func (r *memoryRepository) FindByEmail(_ context.Context, email string) (User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	email = strings.ToLower(email)
	for _, u := range r.users {
		if strings.ToLower(u.Email) == email {
			return u, nil
		}
	}
	return User{}, ErrNotFound
}

func (r *memoryRepository) FindByID(_ context.Context, id string) (User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if u, ok := r.users[id]; ok {
		return u, nil
	}
	return User{}, ErrNotFound
}

// ---- postgres ----

type postgresRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresRepository mengembalikan implementasi Repository yang menggunakan pgx.
func NewPostgresRepository(pool *pgxpool.Pool) Repository {
	return &postgresRepository{pool: pool}
}

func (r *postgresRepository) List(ctx context.Context) ([]User, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, email, name, role, password_hash, created_at FROM users ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	users := []User{}
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.Role, &u.PasswordHash, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func (r *postgresRepository) Create(ctx context.Context, u User) (User, error) {
	u.Email = strings.ToLower(u.Email)
	if u.CreatedAt.IsZero() {
		u.CreatedAt = time.Now().UTC()
	}
	_, err := r.pool.Exec(ctx,
		`INSERT INTO users (id, email, name, role, password_hash, created_at) VALUES ($1,$2,$3,$4,$5,$6)`,
		u.ID, u.Email, u.Name, u.Role, u.PasswordHash, u.CreatedAt,
	)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") || strings.Contains(strings.ToLower(err.Error()), "unique") {
			return User{}, ErrDuplicateEmail
		}
		return User{}, err
	}
	return u, nil
}

func (r *postgresRepository) FindByEmail(ctx context.Context, email string) (User, error) {
	email = strings.ToLower(email)
	row := r.pool.QueryRow(ctx, `SELECT id, email, name, role, password_hash, created_at FROM users WHERE email=$1`, email)
	var u User
	if err := row.Scan(&u.ID, &u.Email, &u.Name, &u.Role, &u.PasswordHash, &u.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, ErrNotFound
		}
		return User{}, err
	}
	return u, nil
}

func (r *postgresRepository) FindByID(ctx context.Context, id string) (User, error) {
	row := r.pool.QueryRow(ctx, `SELECT id, email, name, role, password_hash, created_at FROM users WHERE id=$1`, id)
	var u User
	if err := row.Scan(&u.ID, &u.Email, &u.Name, &u.Role, &u.PasswordHash, &u.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, ErrNotFound
		}
		return User{}, err
	}
	return u, nil
}
