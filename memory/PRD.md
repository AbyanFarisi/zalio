# PRD — Go Microservices + React Ops Console

## Problem Statement
Backend Go dari Modular Monolith → Microservices murni (Monorepo pattern)
dengan 5 domain service + tipis API gateway, ditambah React ops console
sebagai UI untuk mengoperasikan seluruh service via satu gateway.

## Architecture
- Monorepo Go module `be` — 5 domain service + api-gateway.
- Domain terisolasi di `be/internal/<domain>/` (entity + repository memory/pgx + service + handler).
- Auth: JWT HS256 (24 jam), bcrypt password, admin seed idempoten.
- API Gateway `cmd/api-gateway` (port 9080) reverse proxy, strip prefix, CORS enabled untuk `localhost:3000` + `ALLOWED_ORIGINS` env.
- Frontend React 19 + Tailwind di `/frontend`, target `REACT_APP_API_GATEWAY_URL` (default `http://localhost:9080`).
- Panduan menjalankan lokal terpusat di `/app/RUN_LOCAL.md`.

## Service map

| Service | Port | Public GET | Protected write |
| --- | ---: | --- | --- |
| frontend (react)  | 3000 | UI login + dashboard | — |
| api-gateway       | 9080 | reverse proxy `/identity /product /inventory /sales /finance` | forward Bearer |
| identity-service  | 8081 | /users, /auth/register, /auth/login | /auth/me (JWT) |
| product-service   | 8082 | /products, /products/:id      | POST/PUT/DELETE /products |
| inventory-service | 8083 | /stocks, /stocks/:id          | POST/PUT/DELETE /stocks |
| sales-service     | 8084 | /orders, /orders/:id          | POST/PUT/DELETE /orders |
| finance-service   | 8085 | /transactions, /transactions/:id | POST/PUT/DELETE /transactions |

## Completed
### 2026-08-19 — Backend fondasi
- 5 service Gin + main.go terpisah, `pkg/database/postgres.go` nil-safe.
- Docker Compose Postgres per service + SQL migrations.

### 2026-08-19 — Persistensi + CRUD + Auth + Gateway
- Repository postgres (pgx) + in-memory per domain, dipilih otomatis via `DATABASE_URL`.
- CRUD lengkap (GET list/id, POST, PUT, DELETE) per domain.
- JWT: `pkg/authtoken` (issue/parse + middleware), bcrypt, admin seed idempoten.
- API gateway `cmd/api-gateway` (port 9080, strip prefix, forward Authorization).

### 2026-08-19 — Frontend ops console
- React 19 + Tailwind, tema terminal/dark aksen amber (JetBrains Mono + IBM Plex Sans).
- Halaman `/login` (public) + `/` dashboard (protected).
- 5 tab (Users read-only, Products/Stocks/Orders/Transactions CRUD).
- `AuthContext` menyimpan token di `localStorage`; axios interceptor auto-inject Bearer.
- Komponen tabel + form modal generik `DomainPanel` dipakai semua tab.
- CORS gateway diaktifkan (`gin-contrib/cors`) untuk `localhost:3000` +
  origin tambahan via env `ALLOWED_ORIGINS`.
- Verifikasi lokal: 6 service running, CORS preflight 204, login lewat
  gateway return JWT valid, screenshot login page rendering benar.

## Backlog (P0/P1/P2)
- P1: Dockerfile per service (bundle deploy).
- P2: Refresh token flow.
- P2: Rate limit & brute-force protection pada login.
- P2: Password reset flow.
- P2: Inter-service (sales → inventory decrement, sales → finance auto entry).
- P2: Observability (structured logging, OpenTelemetry).
- P2: CI pipeline per service.

## User personas
- Backend developer yang perlu domain boundary tegas.
- DevOps yang butuh deploy/scale per service.
- Operator yang butuh UI untuk CRUD data lima domain via satu console.

## Notes
- Go 1.25 (toolchain auto-download).
- Port gateway = 9080 (port 8080 dipakai platform).
- Frontend berjalan di 3000 secara lokal; di preview Emergent tidak bisa
  akses `localhost:9080` — panduan run lokal di `/app/RUN_LOCAL.md`.
- Test credentials di `/app/memory/test_credentials.md`.
