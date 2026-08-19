# Go Microservices Monorepo

Arsitektur murni microservices (monorepo pattern). Setiap service memiliki
entrypoint sendiri di `cmd/` dan domain terisolasi di `internal/`.

## Service & Port

| Service | Port | Endpoint domain | Health |
| --- | ---: | --- | --- |
| identity-service  | 8081 | `GET /users`        | `GET /health` |
| product-service   | 8082 | `GET /products`     | `GET /health` |
| inventory-service | 8083 | `GET /stocks`       | `GET /health` |
| sales-service     | 8084 | `GET /orders`       | `GET /health` |
| finance-service   | 8085 | `GET /transactions` | `GET /health` |

## Struktur

```
be/
├── cmd/                     # 1 folder per service (main.go terpisah)
│   ├── identity-service/
│   ├── product-service/
│   ├── inventory-service/
│   ├── sales-service/
│   └── finance-service/
├── internal/                # domain mandiri per bounded context
│   ├── identity/            # entity + repository + service + handler
│   ├── product/
│   ├── inventory/
│   ├── sales/
│   └── finance/
├── pkg/
│   └── database/            # helper koneksi PostgreSQL (pgx/v5)
├── migrations/              # SQL awal per domain
└── deploy/
    └── docker-compose.yml   # PostgreSQL per service (database-per-service)
```

## Menjalankan service

```bash
cd be
go mod tidy
go run ./cmd/identity-service   # port 8081
go run ./cmd/product-service    # port 8082
go run ./cmd/inventory-service  # port 8083
go run ./cmd/sales-service      # port 8084
go run ./cmd/finance-service    # port 8085
```

Setiap service dapat dijalankan mandiri tanpa mengganggu service lain.

## PostgreSQL

Persistence belum aktif – setiap repository saat ini masih in-memory dengan
data contoh. Namun infrastruktur sudah disiapkan:

```bash
cd be/deploy
docker compose up -d
```

Compose ini menyalakan **satu instance PostgreSQL per service** (database
per service, pola khas microservices) dan otomatis menjalankan migration
SQL dari folder `migrations/`.

Untuk mengaktifkan koneksi database dari service, set variabel
`DATABASE_URL` sebelum menjalankan service, contoh:

```bash
export DATABASE_URL="postgres://identity:identity@localhost:5433/identity?sslmode=disable"
go run ./cmd/identity-service
```

Bila `DATABASE_URL` kosong, service tetap boot dan helper mengembalikan
pool `nil` sehingga refactoring bertahap tidak menggagalkan startup.
