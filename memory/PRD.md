# PRD — Go Microservices Monorepo (/app/be)

## Problem Statement
Merombak arsitektur backend Go dari Modular Monolith menjadi Microservices murni
(Monorepo pattern) dengan 5 domain service + tipis API gateway.

## Architecture (locked)
- Monorepo Go module `be`
- 5 entrypoint terpisah di `be/cmd/<name>-service/main.go` + `cmd/api-gateway`
- Domain terisolasi di `be/internal/<domain>/` (entity + repository + service + handler)
- Repository setiap domain memiliki 2 implementasi: in-memory (dev) & postgres pgx
- Framework HTTP: Gin
- Auth: JWT HS256 (24 jam) via header `Authorization: Bearer`
  - Login/register di identity-service (public)
  - Middleware `pkg/authtoken.RequireBearer()` melindungi semua write endpoint
- Driver DB: `pgx/v5` (helper di `be/pkg/database`)
- Deploy DB: 1 PostgreSQL per service via `be/deploy/docker-compose.yml`
  + `be/migrations/<domain>.sql`

## Service map

| Service | Port | Public GET | Protected write |
| --- | ---: | --- | --- |
| api-gateway       | 9080 | reverse proxy `/identity/*`, `/product/*`, `/inventory/*`, `/sales/*`, `/finance/*` | forward Bearer |
| identity-service  | 8081 | /users, /auth/register, /auth/login | /auth/me (JWT) |
| product-service   | 8082 | /products, /products/:id      | POST/PUT/DELETE /products |
| inventory-service | 8083 | /stocks, /stocks/:id          | POST/PUT/DELETE /stocks |
| sales-service     | 8084 | /orders, /orders/:id          | POST/PUT/DELETE /orders |
| finance-service   | 8085 | /transactions, /transactions/:id | POST/PUT/DELETE /transactions |

## Completed
### 2026-08-19 — Fondasi microservices
- Struktur `cmd/` untuk 5 service, tiap main.go bind port unik (8081-8085).
- Helper `pkg/database/postgres.go` (pgx/v5) nil-safe.
- Domain product+identity+inventory+sales+finance dibuat dengan pola sama.
- `deploy/docker-compose.yml` PostgreSQL per service + SQL migrations.

### 2026-08-19 — Persistensi + CRUD + Auth + Gateway
- **Persistensi**: setiap repository domain punya implementasi `postgresRepository`
  (pgx) selain in-memory. main.go otomatis memilih berdasarkan `DATABASE_URL`.
- **CRUD lengkap**: GET(list), GET(id), POST, PUT, DELETE per domain.
- **JWT auth**: `pkg/authtoken` (issue/parse/RequireBearer middleware),
  bcrypt password, admin seeding idempoten via `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
- **API Gateway**: `cmd/api-gateway` reverse proxy tipis di port 9080,
  strip prefix, meneruskan Authorization header. Target override via
  `<NAME>_URL` env vars.
- Verifikasi end-to-end via gateway: login admin → token → protected write ke
  product/sales/finance sukses. Request tanpa token → 401. Token invalid → 401.
  Register user baru → mengembalikan token.

## Backlog (P0/P1/P2)
- P1: Refresh token flow bila diperlukan sesi panjang.
- P2: Rate limit & brute-force protection pada login.
- P2: Password reset flow di identity-service.
- P2: Inter-service communication (mis. sales → inventory decrement).
- P2: Observability (structured logging, OpenTelemetry).
- P2: Dockerfile per service + CI pipeline per service.

## User personas
- Backend developer yang perlu domain boundary tegas.
- DevOps yang butuh deploy/scale per service.

## Notes
- Go runtime: 1.25.0 (toolchain auto-download).
- Port gateway = 9080 (port 8080 dipakai platform host).
- Legacy `be/cmd/api/main.go` sudah tidak ada.
- Test credentials di `/app/memory/test_credentials.md`.
