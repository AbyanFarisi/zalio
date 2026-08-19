# Domain Map

Folder `internal/modules` tidak tersedia pada workspace awal, jadi belum ada
kode legacy yang dapat dipindahkan. Batas domain berikut disiapkan sebagai
target pemetaan saat kode lama diberikan:

| Domain | Service owner | Status |
| --- | --- | --- |
| identity | identity-service | boundary service tersedia; domain lama belum ada |
| product | product-service | entity, repository, service, handler tersedia |
| inventory | inventory-service | boundary service tersedia; domain lama belum ada |
| sales | sales-service | boundary service tersedia; domain lama belum ada |
| finance | finance-service | boundary service tersedia; domain lama belum ada |

Product menjadi domain pertama yang dipisahkan. Repository saat ini memakai
storage memori kosong sebagai fondasi kontrak; persistence PostgreSQL akan
dimasukkan setelah skema dan kode legacy tersedia.