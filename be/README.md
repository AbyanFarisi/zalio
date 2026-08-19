# Go Microservices Monorepo

Fondasi lima service Gin yang berdiri sendiri:

| Service | Port | Health check |
| --- | ---: | --- |
| identity-service | 8081 | `GET /health` |
| product-service | 8082 | `GET /health` |
| inventory-service | 8083 | `GET /health` |
| sales-service | 8084 | `GET /health` |
| finance-service | 8085 | `GET /health` |

Set `DATABASE_URL` bila PostgreSQL ingin digunakan. Tanpa variabel tersebut,
service tetap berjalan dan helper database mengembalikan pool `nil` secara aman.

Jalankan dari folder ini setelah Go terpasang:

```bash
go mod tidy
go run ./cmd/identity-service
```

Kode lama belum dipindahkan karena tahap ini sengaja dibatasi pada fondasi lima
service, sesuai keputusan refactoring bertahap.