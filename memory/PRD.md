# PRD — Go Microservices Monorepo (/app/be)

## Problem Statement
Merombak arsitektur backend Go dari Modular Monolith menjadi Microservices murni
(Monorepo pattern) dengan 5 service: identity, product, inventory, sales, finance.

## Architecture (locked)
- Monorepo Go module `be`
- 5 entrypoint terpisah di `be/cmd/<name>-service/main.go`
- Domain terisolasi di `be/internal/<domain>/` (entity + repository + service + handler)
- Framework HTTP: Gin
- Driver DB: `pgx/v5` (helper di `be/pkg/database`)
- Deploy DB: 1 PostgreSQL per service (database-per-service) via
  `be/deploy/docker-compose.yml` + `be/migrations/<domain>.sql`

## Service map

| Service | Port | Domain endpoint | Health |
| --- | ---: | --- | --- |
| identity-service  | 8081 | GET /users        | GET /health |
| product-service   | 8082 | GET /products     | GET /health |
| inventory-service | 8083 | GET /stocks       | GET /health |
| sales-service     | 8084 | GET /orders       | GET /health |
| finance-service   | 8085 | GET /transactions | GET /health |

## Completed (2026-08-19)
- Struktur `cmd/` untuk 5 service dibuat, tiap `main.go` bind port unik (8081-8085).
- Helper `pkg/database/postgres.go` (pgx/v5) nil-safe saat `DATABASE_URL` kosong.
- Domain `product` sudah lengkap (entity, repository in-memory, service, handler).
- Domain `identity`, `inventory`, `sales`, `finance` dibuat dengan pola sama
  memakai in-memory repository berisi data contoh (belum terhubung DB, sesuai
  keputusan user).
- `deploy/docker-compose.yml` menyalakan 1 PostgreSQL per service (port 5433-5437).
- `migrations/<domain>.sql` awal untuk kelima database.
- README dokumentasi update.
- Verifikasi: `go build ./...` OK, `go vet ./...` OK, kelima service boot & merespon
  `/health` + endpoint domain masing-masing (verified via curl).

## Backlog (P0/P1/P2)
- P1: Ganti in-memory repository dengan implementasi pgx (`postgresRepository`) tiap domain.
- P1: Tambah endpoint CRUD lengkap (POST/PUT/DELETE) per domain.
- P1: Konfigurasi env & konvensi `DATABASE_URL_<SERVICE>` per service.
- P2: Autentikasi/JWT di identity-service (ditunda oleh user).
- P2: Inter-service communication (HTTP client / message bus).
- P2: Observability (structured logging, metrics, tracing) tiap service.
- P2: CI/CD pipeline per service.

## User personas
- Backend developer yang perlu domain boundary tegas.
- DevOps yang butuh deploy/scale per service.

## Notes
- Go runtime yang dipakai: 1.22.12 (installed di `/usr/local/go`).
- Legacy `be/cmd/api/main.go` sudah tidak ada; folder baru berjalan mandiri.
