# Go Microservices Monorepo

Arsitektur murni microservices (monorepo pattern). 5 service domain + 1
API gateway tipis. Setiap service memiliki entrypoint sendiri di `cmd/`
dan domain terisolasi di `internal/`.

## Service & Port

| Service | Port | Endpoint domain | Public GET | Protected write |
| --- | ---: | --- | --- | --- |
| api-gateway       | 9080 | `/identity/*`, `/product/*`, `/inventory/*`, `/sales/*`, `/finance/*` | — | forward Bearer |
| identity-service  | 8081 | `/auth/register`, `/auth/login`, `/auth/me`, `/users` | ✓ | JWT (me) |
| product-service   | 8082 | `/products`, `/products/:id`                          | ✓ | JWT |
| inventory-service | 8083 | `/stocks`, `/stocks/:id`                              | ✓ | JWT |
| sales-service     | 8084 | `/orders`, `/orders/:id`                              | ✓ | JWT |
| finance-service   | 8085 | `/transactions`, `/transactions/:id`                  | ✓ | JWT |

Setiap service juga mempublikasikan `GET /health`.

## Struktur

```
be/
├── cmd/                     # 1 folder per service (main.go terpisah)
│   ├── api-gateway/
│   ├── identity-service/
│   ├── product-service/
│   ├── inventory-service/
│   ├── sales-service/
│   └── finance-service/
├── internal/                # domain mandiri per bounded context
│   ├── identity/            # entity + repository (memory + pgx) + service + handler
│   ├── product/
│   ├── inventory/
│   ├── sales/
│   └── finance/
├── pkg/
│   ├── authtoken/           # JWT issue/parse + Gin middleware RequireBearer
│   └── database/            # helper koneksi PostgreSQL (pgx/v5)
├── migrations/              # SQL awal per domain
└── deploy/
    └── docker-compose.yml   # PostgreSQL per service (database-per-service)
```

## Menjalankan service

```bash
cd be
go mod tidy

export JWT_SECRET="ganti-dengan-rahasia-64-char"
# optional (identity-service akan seed admin idempoten):
export ADMIN_EMAIL="admin@example.com"
export ADMIN_PASSWORD="admin123"

go run ./cmd/identity-service   # port 8081
go run ./cmd/product-service    # port 8082
go run ./cmd/inventory-service  # port 8083
go run ./cmd/sales-service      # port 8084
go run ./cmd/finance-service    # port 8085
GATEWAY_PORT=9080 go run ./cmd/api-gateway
```

Setiap service dapat dijalankan mandiri tanpa mengganggu service lain.

## Autentikasi (JWT)

- Register/login public di `identity-service`.
- Semua endpoint **tulis** (POST/PUT/DELETE) di seluruh service dilindungi
  middleware `pkg/authtoken.RequireBearer()`.
- Token JWT HS256, TTL 24 jam, dibawa via header
  `Authorization: Bearer <token>`.
- Shared secret dari env `JWT_SECRET` (wajib sama di semua service).

Contoh alur:

```bash
export GW=http://localhost:9080

TOKEN=$(curl -s -X POST $GW/identity/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

curl -s $GW/identity/auth/me -H "Authorization: Bearer $TOKEN"

curl -s -X POST $GW/product/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Susu Almond 1L","price":48000}'
```

## PostgreSQL

Setiap service memiliki dua implementasi repository:

- `NewMemoryRepository()` — untuk pengembangan lokal tanpa DB (data seed).
- `NewPostgresRepository(pool)` — dipilih otomatis bila `DATABASE_URL`
  tersedia. Menggunakan `pgx/v5`.

Nyalakan seluruh database sekaligus (satu DB per service, database-per-service
pattern) menggunakan Docker Compose:

```bash
cd be/deploy
docker compose up -d
```

Compose otomatis menjalankan `migrations/<domain>.sql` sebagai init script.

Kemudian arahkan tiap service ke DB-nya:

```bash
export DATABASE_URL="postgres://identity:identity@localhost:5433/identity?sslmode=disable"
go run ./cmd/identity-service
```

Bila `DATABASE_URL` kosong, service tetap boot dan menggunakan repository
memori — memudahkan demo dan pengembangan bertahap.

## API Gateway

`cmd/api-gateway` adalah reverse proxy tipis (`net/http/httputil`) yang
menyatukan kelima service di satu port publik (default 9080). Prefix
dihapus sebelum diteruskan:

```
GET  http://localhost:9080/product/products      -> product-service :8082 /products
POST http://localhost:9080/sales/orders          -> sales-service   :8084 /orders
POST http://localhost:9080/identity/auth/login   -> identity-service :8081 /auth/login
```

Target tiap service bisa di-override lewat env:

```bash
IDENTITY_URL=http://identity:8081 PRODUCT_URL=http://product:8082 \
  go run ./cmd/api-gateway
```
