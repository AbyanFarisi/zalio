package database

import (
	"context"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect creates a PostgreSQL pool when DATABASE_URL is configured.
// A nil pool is returned when the variable is empty so services can start
// during local scaffolding and health-check development.
func Connect(ctx context.Context) (*pgxpool.Pool, error) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return nil, nil
	}

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return pool, nil
}
