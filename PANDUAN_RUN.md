# Panduan Menjalankan Project Zalio ERP

## Arsitektur Project

Project ini menggunakan arsitektur **microservices** dengan susunan sebagai berikut:

| Komponen | Teknologi | Lokasi | Port |
|---|---|---|---|
| **Frontend** | Next.js | Root folder (`/`) | `3000` |
| **Auth Service** | Go | `services/auth-service/` | `8081` |
| **Master Service** | Go | `services/master-service/` | `8082` |
| **Analytics Service** | Python FastAPI | `services/analytics-service/` | `8083` |
| **Database** | PostgreSQL 15 | Docker container | `5432` |

Frontend berfungsi sebagai **API Gateway** — semua request dari browser diarahkan melalui Next.js API route (`app/api/[[...path]]/route.js`) ke masing-masing backend service berdasarkan prefix URL:
- `/api/auth/*` → Auth Service (`:8081`)
- `/api/master/*` → Master Service (`:8082`)
- `/api/analytics/*` → Analytics Service (`:8083`)

---

## Prasyarat

Pastikan sudah terinstall di komputer Anda:

| Tool | Cek Instalasi | Keterangan |
|---|---|---|
| **Docker Desktop** | `docker version` | Untuk menjalankan PostgreSQL |
| **Go** | `go version` | Versi 1.19+ |
| **Python** | `python --version` | Versi 3.9+ |
| **Node.js** | `node -v` | Versi 18+ |
| **npm** | `npm -v` | Biasanya sudah ikut Node.js |

---

## Pertama Kali Setup (Fresh Install)

Ikuti semua langkah di bawah ini **hanya saat pertama kali** menjalankan project.

### Langkah 1: Jalankan Database PostgreSQL

Buka terminal di **root folder** project (`c:\laragon\www\zalio_erp`):

```bash
docker run --name zalio-postgres -e POSTGRES_USER=zalio -e POSTGRES_PASSWORD=zalio123 -e POSTGRES_DB=zalio -p 5432:5432 -d postgres:15
```

Tunggu beberapa detik agar PostgreSQL siap, lalu inisialisasi tabel dan data:

```powershell
# Untuk PowerShell / CMD di Windows:
cmd.exe /c "docker exec -i zalio-postgres psql -U zalio -d zalio < db/init.sql"
```

Jika berhasil, Anda akan melihat output berupa `CREATE TABLE`, `INSERT`, dst.

### Langkah 2: Install Dependencies

**Go services** — tidak perlu install manual, `go run` akan otomatis download dependensi.

**Python (Analytics Service):**
```bash
cd services/analytics-service
pip install -r requirements.txt
```

**Frontend (Next.js):**
```bash
# Di root folder project
npm install
```

### Langkah 3: Jalankan Semua Services

Anda memerlukan **4 terminal terpisah**. Buka semuanya di root folder project.

**Terminal 1 — Auth Service (Go, port 8081):**
```bash
cd services/auth-service
go run main.go
```
> Tunggu sampai muncul: `[auth-service] listening on :8081`

**Terminal 2 — Master Service (Go, port 8082):**
```bash
cd services/master-service
go run .
```
> ⚠️ Gunakan `go run .` (dengan titik), **bukan** `go run main.go`, karena service ini punya lebih dari satu file Go.
> Tunggu sampai muncul: `[master-service] listening on :8082`

**Terminal 3 — Analytics Service (Python, port 8083):**
```bash
cd services/analytics-service
python main.py
```
> Tunggu sampai muncul: `Uvicorn running on http://0.0.0.0:8083`

**Terminal 4 — Frontend (Next.js, port 3000):**
```bash
npm run dev
```

### Langkah 4: Buka di Browser

Buka **http://localhost:3000** dan login dengan:
- **Email:** `admin@example.com`
- **Password:** `admin123`

---

## Menjalankan Selanjutnya (Sehari-hari)

Setelah setup awal selesai, Anda **TIDAK perlu** lagi:
- ❌ Install ulang dependencies (`npm install`, `pip install`)
- ❌ Menjalankan `docker run` (container sudah ada)
- ❌ Inisialisasi database (`init.sql`) — data masih tersimpan di container

Cukup lakukan langkah ini setiap kali ingin menjalankan project:

### 1. Nyalakan Docker Desktop
Buka aplikasi Docker Desktop dan tunggu sampai statusnya **Running**.

### 2. Nyalakan Database
```bash
docker start zalio-postgres
```

### 3. Nyalakan Backend (3 terminal terpisah)
```bash
# Terminal 1
cd services/auth-service
go run main.go

# Terminal 2
cd services/master-service
go run .

# Terminal 3
cd services/analytics-service
python main.py
```

### 4. Nyalakan Frontend
```bash
# Terminal 4 (di root folder)
npm run dev
```

### 5. Buka Browser
Akses **http://localhost:3000** — selesai! 🎉

---

## Mematikan Project

Untuk mematikan project, tekan `Ctrl+C` di masing-masing terminal (4 terminal).

Untuk mematikan database:
```bash
docker stop zalio-postgres
```

---

## Jika Database Hilang / Container Terhapus

Jika container Docker terhapus (misal setelah `docker rm`), Anda perlu membuat ulang:

```bash
# Buat container baru
docker run --name zalio-postgres -e POSTGRES_USER=zalio -e POSTGRES_PASSWORD=zalio123 -e POSTGRES_DB=zalio -p 5432:5432 -d postgres:15

# Inisialisasi ulang tabel dan data
cmd.exe /c "docker exec -i zalio-postgres psql -U zalio -d zalio < db/init.sql"
```

---

## Troubleshooting

### ❌ Error: `connection refused (::1), port 5432`
Ini terjadi karena Windows mengarahkan `localhost` ke IPv6. Sudah diperbaiki di kode — semua service menggunakan `127.0.0.1` secara eksplisit.

### ❌ Error: `undefined: registerModules` saat `go run main.go` di master-service
Gunakan `go run .` (dengan titik) karena master-service memiliki lebih dari satu file Go (`main.go` + `modules.go`).

### ❌ Backend service tidak bisa diakses dari frontend
Pastikan port 8081, 8082, dan 8083 tidak dipakai aplikasi lain. Cek dengan:
```powershell
netstat -ano | findstr "8081 8082 8083"
```

### ❌ Frontend error saat build / dev
```bash
# Hapus cache dan install ulang
Remove-Item -Recurse -Force .next, node_modules
npm install
npm run dev
```

---

## Ringkasan Port

| Service | URL | Status Check |
|---|---|---|
| Frontend | http://localhost:3000 | Buka di browser |
| Auth Service | http://localhost:8081 | `curl http://localhost:8081/health` |
| Master Service | http://localhost:8082 | `curl http://localhost:8082/health` |
| Analytics Service | http://localhost:8083 | `curl http://localhost:8083/health` |
| PostgreSQL | localhost:5432 | `docker exec zalio-postgres pg_isready` |
