# Microservices Ops Console — Frontend

React 19 + Tailwind + Radix + Framer Motion. UI ops dashboard bertema
terminal/dark dengan aksen amber untuk mengoperasikan lima Go microservice
melalui satu API gateway.

## Konfigurasi

Variabel yang dipakai (di `/app/frontend/.env`):

```
REACT_APP_API_GATEWAY_URL=http://localhost:9080
```

Ganti nilainya bila gateway di-host di URL lain.

## Halaman

- `/login` — login form (default admin: `admin@example.com` / `admin123`).
- `/` — dashboard. Tab: Users, Products, Inventory (Stocks), Sales (Orders),
  Finance (Transactions). Setiap tab menampilkan tabel + Create/Edit/Delete
  (kecuali Users yang read-only).

Token JWT disimpan di `localStorage` sebagai `token` dan dikirim otomatis
sebagai `Authorization: Bearer` oleh interceptor axios.

## Menjalankan lokal (rekomendasi)

```bash
cd frontend
yarn install                # sekali saja
yarn start                  # http://localhost:3000
```

Frontend akan otomatis menembak `http://localhost:9080` (API gateway Go).
Pastikan seluruh Go service dan gateway sudah berjalan lebih dulu.

## Struktur

```
frontend/src/
├── App.js                  # router + AuthProvider + protected route
├── api.js                  # axios client (Bearer injection) + routes
├── auth.jsx                # AuthContext (login/logout/restore session)
├── pages/
│   ├── Login.jsx           # halaman login
│   └── Dashboard.jsx       # top bar + tabs + panel loader
├── components/
│   └── DomainPanel.jsx     # tabel CRUD generik dipakai semua domain
└── index.css               # global styling (dark + JetBrains Mono)
```
