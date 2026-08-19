# PRD — Go Microservices Monorepo Foundation

## Original problem statement
Membaca repositori dan merombak arsitektur backend Go di folder `/be` dari Modular Monolith menjadi Microservices murni dengan lima service: identity, product, inventory, sales, dan finance; menyiapkan Gin, port 8081–8085, helper koneksi PostgreSQL pgx, serta pemindahan domain dari `internal/modules` secara bertahap.

## Architecture decisions
- Workspace tidak memiliki folder Go `/be`, sehingga fondasi baru dibuat dari nol.
- Tahap pertama hanya membuat lima service dan helper database; modul domain lama belum dipindahkan.
- `DATABASE_URL` bersifat opsional saat startup. Jika kosong, service tetap dapat melayani health check.
- Setiap service memiliki proses dan port sendiri serta endpoint `GET /health`.

## Implemented
- `be/go.mod` dengan Gin dan pgx/v5.
- `be/pkg/database/postgres.go` dengan pool PostgreSQL opsional dan ping saat URL tersedia.
- Lima entry point di `be/cmd/*-service/main.go` pada port 8081–8085.
- `be/README.md` berisi peta service dan langkah menjalankan.

## Prioritized backlog
- P0: Instal Go toolchain lalu jalankan `go mod tidy` dan `go test ./...`.
- P1: Rancang pemetaan kode `internal/modules` ke domain mandiri bersama pengguna.
- P1: Pindahkan domain dan route satu service per tahap, disertai test.
- P2: Tambahkan konfigurasi per service, migration PostgreSQL, dan observability.