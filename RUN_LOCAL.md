# Panduan Menjalankan Project di Lokal

Repo ini terdiri dari **dua bagian yang saling terhubung**:

- `be/` — Go microservices monorepo (5 domain service + API gateway).
- `frontend/` — React dashboard ops console (memanggil API gateway).

Folder `backend/` di root adalah template default Emergent (Python FastAPI)
dan **tidak dipakai** untuk proyek microservices ini. Aman diabaikan.

---

## 0. Prasyarat

Pastikan sudah terpasang:

| Tool | Versi minimum | Cek |
| --- | --- | --- |
| Go | 1.22+ (disarankan 1.25) | `go version` |
| Node.js | 18+ | `node -v` |
| Yarn | 1.22+ | `yarn -v` |
| Docker + Docker Compose | 20+ (opsional, untuk Postgres) | `docker version` |

Windows: gunakan WSL2 atau Git Bash untuk perintah di bawah.

---

## 1. Clone repo

```bash
git clone <URL_REPO_ANDA>
cd <nama-folder-repo>
git checkout main_microservices
```

---

## 2. Jalankan Go Microservices

### 2a. Install dependensi & set env

```bash
cd be
go mod tidy

# WAJIB — shared secret JWT (harus sama untuk semua service)
export JWT_SECRET="ganti-dengan-string-acak-panjang-minimum-32-karakter"

# OPSIONAL — override admin default (default admin@example.com / admin123)
export ADMIN_EMAIL="admin@example.com"
export ADMIN_PASSWORD="admin123"
```

### 2b. (Opsional) Jalankan PostgreSQL per service

Bila mau memakai Postgres nyata (bukan in-memory):

```bash
cd be/deploy
docker compose up -d
# menyalakan 5 container Postgres di port 5433, 5434, 5435, 5436, 5437
```

Lalu untuk setiap service, set `DATABASE_URL` sesuai portnya sebelum
menjalankan. Contoh:

```bash
export DATABASE_URL="postgres://identity:identity@localhost:5433/identity?sslmode=disable"
```

Bila `DATABASE_URL` **tidak diset**, service tetap jalan memakai
in-memory repository lengkap dengan data seed contoh.

### 2c. Jalankan tiap service (6 terminal terpisah)

Terminal 1 — Identity (port 8081):
```bash
cd be && go run ./cmd/identity-service
```

Terminal 2 — Product (port 8082):
```bash
cd be && go run ./cmd/product-service
```

Terminal 3 — Inventory (port 8083):
```bash
cd be && go run ./cmd/inventory-service
```

Terminal 4 — Sales (port 8084):
```bash
cd be && go run ./cmd/sales-service
```

Terminal 5 — Finance (port 8085):
```bash
cd be && go run ./cmd/finance-service
```

Terminal 6 — API Gateway (port 9080):
```bash
cd be && GATEWAY_PORT=9080 go run ./cmd/api-gateway
```

> **Tips**: agar tidak perlu 6 terminal, Anda bisa memakai `tmux`, `foreman`,
> `overmind`, atau bikin script bash sederhana yang mem-background semua.

Sanity check dari terminal manapun:

```bash
curl http://localhost:9080/health
curl http://localhost:9080/product/products
```

### 2d. Sanity check auth

```bash
# Login admin
curl -X POST http://localhost:9080/identity/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

Response akan berisi `token`.

---

## 3. Jalankan Frontend React

Buka terminal baru:

```bash
cd frontend
yarn install     # sekali saja saat pertama clone
yarn start
```

Frontend akan terbuka di **http://localhost:3000** dan otomatis menembak
gateway di `http://localhost:9080` (via `REACT_APP_API_GATEWAY_URL` di
`frontend/.env`).

Login dengan:
- Email: `admin@example.com`
- Password: `admin123`

Anda akan masuk ke dashboard dengan 5 tab (Identity, Product, Inventory,
Sales, Finance). Setiap tab menampilkan tabel data dan tombol Create /
Edit / Delete (kecuali Users yang read-only).

---

## 4. Alur test end-to-end

Setelah login di UI:

1. Buka tab **Product** → klik **new** → isi form → save.
2. Buka tab **Inventory** → **new** → hubungkan ke `product_id` yang tadi.
3. Buka tab **Sales** → **new** → buat order.
4. Buka tab **Finance** → **new** → buat transaksi mengacu ke order.
5. Coba **edit** & **delete** pada beberapa record.
6. Klik **logout** → coba operasi write lagi → harusnya diblokir (401).

---

## 5. Troubleshooting

**"connection refused" saat login**
Pastikan API gateway berjalan di port 9080 (`curl http://localhost:9080/health`).

**"CORS error" di browser console**
Frontend dan gateway sudah beda origin (`localhost:3000` → `localhost:9080`).
Bila muncul CORS, tambahkan middleware CORS di `be/cmd/api-gateway/main.go`
(misal `github.com/gin-contrib/cors`). Untuk pengembangan cepat, jalankan
Chrome dengan flag `--disable-web-security` atau install ekstensi CORS.

**Port sudah dipakai**
Ganti port lewat env:
- Gateway: `GATEWAY_PORT=9090 go run ./cmd/api-gateway`
- Service: edit port di `main.go` (angka `router.Run(":808x")`)
- Frontend: `PORT=3001 yarn start`

**Docker Postgres bentrok**
Bila port 5433-5437 sudah dipakai, edit `be/deploy/docker-compose.yml`
dan sesuaikan mapping `ports:` sebelum `up -d`.

**Reset admin password**
Ubah `ADMIN_PASSWORD` lalu jalankan identity-service. Seed **idempoten**
(hanya membuat admin bila belum ada — tidak overwrite password lama demi
keamanan). Untuk reset, hapus dulu row admin di DB / restart in-memory.

---

## 6. Ringkasan port

| Layanan | URL |
| --- | --- |
| Frontend (React) | http://localhost:3000 |
| API Gateway | http://localhost:9080 |
| identity-service | http://localhost:8081 |
| product-service | http://localhost:8082 |
| inventory-service | http://localhost:8083 |
| sales-service | http://localhost:8084 |
| finance-service | http://localhost:8085 |
| Postgres identity | localhost:5433 |
| Postgres product | localhost:5434 |
| Postgres inventory | localhost:5435 |
| Postgres sales | localhost:5436 |
| Postgres finance | localhost:5437 |
