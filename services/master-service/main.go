package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"

	_ "github.com/lib/pq"
)

var db *sql.DB

func main() {
	dsn := os.Getenv("POSTGRES_URL")
	if dsn == "" {
		dsn = "postgresql://zalio:zalio123@localhost:5432/zalio?sslmode=disable"
	}
	var err error
	db, err = sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal(err)
	}
	if err := db.Ping(); err != nil {
		log.Fatal(err)
	}
	log.Println("[master-service] connected to postgres")

	mux := http.NewServeMux()
	mux.HandleFunc("/health", health)

	// Products
	mux.HandleFunc("/master/products", productsHandler)
	mux.HandleFunc("/master/products/", productItemHandler)
	// Brands
	mux.HandleFunc("/master/brands", simpleListHandler("brands", []string{"name", "description"}))
	mux.HandleFunc("/master/brands/", simpleItemHandler("brands"))
	// Categories
	mux.HandleFunc("/master/categories", categoriesHandler)
	mux.HandleFunc("/master/categories/", simpleItemHandler("categories"))
	// UoM
	mux.HandleFunc("/master/uoms", simpleListHandler("uoms", []string{"code", "name"}))
	mux.HandleFunc("/master/uoms/", simpleItemHandler("uoms"))
	// Customers
	mux.HandleFunc("/master/customers", customersHandler)
	mux.HandleFunc("/master/customers/", simpleItemHandler("customers"))
	// Suppliers
	mux.HandleFunc("/master/suppliers", suppliersHandler)
	mux.HandleFunc("/master/suppliers/", simpleItemHandler("suppliers"))
	// Warehouses
	mux.HandleFunc("/master/warehouses", warehousesHandler)
	mux.HandleFunc("/master/warehouses/", simpleItemHandler("warehouses"))
	// Stock movements
	mux.HandleFunc("/master/stock-movements", stockMovementsHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}
	log.Printf("[master-service] listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, corsMiddleware(mux)))
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, map[string]string{"service": "master-service", "status": "ok"})
}

// ==================== PRODUCTS ====================
func productsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET":
		rows, err := db.Query(`
			SELECT p.id, p.sku, p.name, COALESCE(b.name,''), COALESCE(c.name,''), COALESCE(u.code,''),
			       p.selling_price, p.cogs, p.stock_qty, COALESCE(p.image_url,''), COALESCE(p.description,''),
			       p.is_active, COALESCE(p.brand_id::text,''), COALESCE(p.category_id::text,''), COALESCE(p.uom_id::text,'')
			FROM products p
			LEFT JOIN brands b ON p.brand_id=b.id
			LEFT JOIN categories c ON p.category_id=c.id
			LEFT JOIN uoms u ON p.uom_id=u.id
			ORDER BY p.created_at DESC
		`)
		if err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		defer rows.Close()
		var list []map[string]interface{}
		for rows.Next() {
			var id, sku, name, brand, cat, uom, img, desc, bid, cid, uid string
			var price, cogs, stock float64
			var active bool
			rows.Scan(&id, &sku, &name, &brand, &cat, &uom, &price, &cogs, &stock, &img, &desc, &active, &bid, &cid, &uid)
			list = append(list, map[string]interface{}{
				"id": id, "sku": sku, "name": name,
				"brand_name": brand, "category_name": cat, "uom_code": uom,
				"selling_price": price, "cogs": cogs, "stock_qty": stock,
				"image_url": img, "description": desc, "is_active": active,
				"brand_id": bid, "category_id": cid, "uom_id": uid,
			})
		}
		writeJSON(w, 200, list)
	case "POST":
		var p struct {
			SKU          string  `json:"sku"`
			Name         string  `json:"name"`
			BrandID      string  `json:"brand_id"`
			CategoryID   string  `json:"category_id"`
			UomID        string  `json:"uom_id"`
			SellingPrice float64 `json:"selling_price"`
			Cogs         float64 `json:"cogs"`
			StockQty     float64 `json:"stock_qty"`
			ImageURL     string  `json:"image_url"`
			Description  string  `json:"description"`
		}
		json.NewDecoder(r.Body).Decode(&p)
		var bid, cid, uid interface{}
		if p.BrandID != "" {
			bid = p.BrandID
		}
		if p.CategoryID != "" {
			cid = p.CategoryID
		}
		if p.UomID != "" {
			uid = p.UomID
		}
		var id string
		err := db.QueryRow(`INSERT INTO products (sku, name, brand_id, category_id, uom_id, selling_price, cogs, stock_qty, image_url, description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
			p.SKU, p.Name, bid, cid, uid, p.SellingPrice, p.Cogs, p.StockQty, p.ImageURL, p.Description).Scan(&id)
		if err != nil {
			writeErr(w, 400, err.Error())
			return
		}
		writeJSON(w, 201, map[string]interface{}{"id": id, "sku": p.SKU, "name": p.Name})
	default:
		writeErr(w, 405, "method not allowed")
	}
}

func productItemHandler(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/master/products/")
	switch r.Method {
	case "PUT", "PATCH":
		var p struct {
			SKU          string   `json:"sku"`
			Name         string   `json:"name"`
			BrandID      string   `json:"brand_id"`
			CategoryID   string   `json:"category_id"`
			UomID        string   `json:"uom_id"`
			SellingPrice *float64 `json:"selling_price"`
			Cogs         *float64 `json:"cogs"`
			StockQty     *float64 `json:"stock_qty"`
			ImageURL     string   `json:"image_url"`
			Description  string   `json:"description"`
			IsActive     *bool    `json:"is_active"`
		}
		json.NewDecoder(r.Body).Decode(&p)
		// Toggle status only
		if p.IsActive != nil && p.SKU == "" && p.Name == "" {
			_, err := db.Exec(`UPDATE products SET is_active=$1, updated_at=NOW() WHERE id=$2`, *p.IsActive, id)
			if err != nil {
				writeErr(w, 400, err.Error())
				return
			}
			writeJSON(w, 200, map[string]interface{}{"id": id, "is_active": *p.IsActive})
			return
		}
		// Full update - build args
		var bid, cid, uid interface{}
		if p.BrandID != "" {
			bid = p.BrandID
		}
		if p.CategoryID != "" {
			cid = p.CategoryID
		}
		if p.UomID != "" {
			uid = p.UomID
		}
		var price, cogs, stock float64
		if p.SellingPrice != nil {
			price = *p.SellingPrice
		}
		if p.Cogs != nil {
			cogs = *p.Cogs
		}
		if p.StockQty != nil {
			stock = *p.StockQty
		}
		_, err := db.Exec(`UPDATE products SET 
			sku=COALESCE(NULLIF($1,''),sku), 
			name=COALESCE(NULLIF($2,''),name),
			brand_id=COALESCE($3::uuid, brand_id),
			category_id=COALESCE($4::uuid, category_id),
			uom_id=COALESCE($5::uuid, uom_id),
			selling_price=CASE WHEN $6=0 THEN selling_price ELSE $6 END,
			cogs=CASE WHEN $7=0 THEN cogs ELSE $7 END,
			stock_qty=CASE WHEN $8=0 THEN stock_qty ELSE $8 END,
			image_url=COALESCE(NULLIF($9,''),image_url),
			description=COALESCE(NULLIF($10,''),description),
			updated_at=NOW()
			WHERE id=$11`,
			p.SKU, p.Name, bid, cid, uid, price, cogs, stock, p.ImageURL, p.Description, id)
		if err != nil {
			writeErr(w, 400, err.Error())
			return
		}
		writeJSON(w, 200, map[string]string{"id": id, "status": "updated"})
	case "DELETE":
		_, err := db.Exec(`DELETE FROM products WHERE id=$1`, id)
		if err != nil {
			writeErr(w, 400, err.Error())
			return
		}
		writeJSON(w, 200, map[string]string{"status": "deleted"})
	default:
		writeErr(w, 405, "method not allowed")
	}
}

// ==================== CATEGORIES ====================
func categoriesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		rows, err := db.Query(`SELECT id, name, COALESCE(parent_id::text,''), COALESCE(description,''), is_active FROM categories ORDER BY created_at`)
		if err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		defer rows.Close()
		var list []map[string]interface{}
		for rows.Next() {
			var id, name, pid, desc string
			var active bool
			rows.Scan(&id, &name, &pid, &desc, &active)
			list = append(list, map[string]interface{}{
				"id": id, "name": name, "parent_id": pid,
				"description": desc, "is_active": active,
			})
		}
		writeJSON(w, 200, list)
		return
	}
	if r.Method == "POST" {
		var c struct {
			Name        string `json:"name"`
			ParentID    string `json:"parent_id"`
			Description string `json:"description"`
		}
		json.NewDecoder(r.Body).Decode(&c)
		var pid interface{}
		if c.ParentID != "" {
			pid = c.ParentID
		}
		var id string
		err := db.QueryRow(`INSERT INTO categories (name, parent_id, description) VALUES ($1,$2,$3) RETURNING id`,
			c.Name, pid, c.Description).Scan(&id)
		if err != nil {
			writeErr(w, 400, err.Error())
			return
		}
		writeJSON(w, 201, map[string]string{"id": id})
		return
	}
	writeErr(w, 405, "method not allowed")
}

// ==================== CUSTOMERS ====================
func customersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		rows, err := db.Query(`SELECT id, code, name, COALESCE(email,''), COALESCE(phone,''), COALESCE(address,''), COALESCE(category,''), credit_limit, is_active FROM customers ORDER BY created_at DESC`)
		if err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		defer rows.Close()
		var list []map[string]interface{}
		for rows.Next() {
			var id, code, name, email, phone, addr, cat string
			var credit float64
			var active bool
			rows.Scan(&id, &code, &name, &email, &phone, &addr, &cat, &credit, &active)
			list = append(list, map[string]interface{}{
				"id": id, "code": code, "name": name,
				"email": email, "phone": phone, "address": addr,
				"category": cat, "credit_limit": credit, "is_active": active,
			})
		}
		writeJSON(w, 200, list)
		return
	}
	if r.Method == "POST" {
		var c struct {
			Code        string  `json:"code"`
			Name        string  `json:"name"`
			Email       string  `json:"email"`
			Phone       string  `json:"phone"`
			Address     string  `json:"address"`
			Category    string  `json:"category"`
			CreditLimit float64 `json:"credit_limit"`
		}
		json.NewDecoder(r.Body).Decode(&c)
		var id string
		err := db.QueryRow(`INSERT INTO customers (code, name, email, phone, address, category, credit_limit) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
			c.Code, c.Name, c.Email, c.Phone, c.Address, c.Category, c.CreditLimit).Scan(&id)
		if err != nil {
			writeErr(w, 400, err.Error())
			return
		}
		writeJSON(w, 201, map[string]string{"id": id})
		return
	}
	writeErr(w, 405, "method not allowed")
}

// ==================== SUPPLIERS ====================
func suppliersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		rows, err := db.Query(`SELECT id, code, name, COALESCE(email,''), COALESCE(phone,''), COALESCE(address,''), COALESCE(category,''), COALESCE(payment_term,''), is_active FROM suppliers ORDER BY created_at DESC`)
		if err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		defer rows.Close()
		var list []map[string]interface{}
		for rows.Next() {
			var id, code, name, email, phone, addr, cat, term string
			var active bool
			rows.Scan(&id, &code, &name, &email, &phone, &addr, &cat, &term, &active)
			list = append(list, map[string]interface{}{
				"id": id, "code": code, "name": name,
				"email": email, "phone": phone, "address": addr,
				"category": cat, "payment_term": term, "is_active": active,
			})
		}
		writeJSON(w, 200, list)
		return
	}
	if r.Method == "POST" {
		var s struct {
			Code        string `json:"code"`
			Name        string `json:"name"`
			Email       string `json:"email"`
			Phone       string `json:"phone"`
			Address     string `json:"address"`
			Category    string `json:"category"`
			PaymentTerm string `json:"payment_term"`
		}
		json.NewDecoder(r.Body).Decode(&s)
		var id string
		err := db.QueryRow(`INSERT INTO suppliers (code, name, email, phone, address, category, payment_term) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
			s.Code, s.Name, s.Email, s.Phone, s.Address, s.Category, s.PaymentTerm).Scan(&id)
		if err != nil {
			writeErr(w, 400, err.Error())
			return
		}
		writeJSON(w, 201, map[string]string{"id": id})
		return
	}
	writeErr(w, 405, "method not allowed")
}

// ==================== WAREHOUSES ====================
func warehousesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		rows, err := db.Query(`SELECT w.id, w.code, w.name, COALESCE(w.location,''), w.is_active, COALESCE(b.name,''), COALESCE(w.branch_id::text,'') FROM warehouses w LEFT JOIN branches b ON w.branch_id=b.id ORDER BY w.created_at`)
		if err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		defer rows.Close()
		var list []map[string]interface{}
		for rows.Next() {
			var id, code, name, loc, bname, bid string
			var active bool
			rows.Scan(&id, &code, &name, &loc, &active, &bname, &bid)
			list = append(list, map[string]interface{}{
				"id": id, "code": code, "name": name,
				"location": loc, "is_active": active,
				"branch_name": bname, "branch_id": bid,
			})
		}
		writeJSON(w, 200, list)
		return
	}
	if r.Method == "POST" {
		var w2 struct {
			BranchID string `json:"branch_id"`
			Code     string `json:"code"`
			Name     string `json:"name"`
			Location string `json:"location"`
		}
		json.NewDecoder(r.Body).Decode(&w2)
		var bid interface{}
		if w2.BranchID != "" {
			bid = w2.BranchID
		}
		var id string
		err := db.QueryRow(`INSERT INTO warehouses (branch_id, code, name, location) VALUES ($1,$2,$3,$4) RETURNING id`,
			bid, w2.Code, w2.Name, w2.Location).Scan(&id)
		if err != nil {
			writeErr(w, 400, err.Error())
			return
		}
		writeJSON(w, 201, map[string]string{"id": id})
		return
	}
	writeErr(w, 405, "method not allowed")
}

// ==================== STOCK MOVEMENTS ====================
func stockMovementsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		rows, err := db.Query(`SELECT sm.id, COALESCE(p.name,''), COALESCE(p.sku,''), COALESCE(w.name,''), sm.movement_type, sm.quantity, COALESCE(sm.reference,''), COALESCE(sm.notes,''), sm.created_at FROM stock_movements sm LEFT JOIN products p ON sm.product_id=p.id LEFT JOIN warehouses w ON sm.warehouse_id=w.id ORDER BY sm.created_at DESC LIMIT 100`)
		if err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		defer rows.Close()
		var list []map[string]interface{}
		for rows.Next() {
			var id, pname, sku, wname, mtype, ref, notes, createdAt string
			var qty float64
			rows.Scan(&id, &pname, &sku, &wname, &mtype, &qty, &ref, &notes, &createdAt)
			list = append(list, map[string]interface{}{
				"id": id, "product_name": pname, "product_sku": sku,
				"warehouse_name": wname, "movement_type": mtype,
				"quantity": qty, "reference": ref, "notes": notes,
				"created_at": createdAt,
			})
		}
		writeJSON(w, 200, list)
		return
	}
	if r.Method == "POST" {
		var m struct {
			ProductID    string  `json:"product_id"`
			WarehouseID  string  `json:"warehouse_id"`
			MovementType string  `json:"movement_type"`
			Quantity     float64 `json:"quantity"`
			Reference    string  `json:"reference"`
			Notes        string  `json:"notes"`
		}
		json.NewDecoder(r.Body).Decode(&m)
		tx, err := db.Begin()
		if err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		var id string
		err = tx.QueryRow(`INSERT INTO stock_movements (product_id, warehouse_id, movement_type, quantity, reference, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
			m.ProductID, m.WarehouseID, m.MovementType, m.Quantity, m.Reference, m.Notes).Scan(&id)
		if err != nil {
			tx.Rollback()
			writeErr(w, 400, err.Error())
			return
		}
		// Update product stock
		delta := m.Quantity
		if m.MovementType == "OUT" {
			delta = -m.Quantity
		}
		_, err = tx.Exec(`UPDATE products SET stock_qty = stock_qty + $1, updated_at=NOW() WHERE id=$2`, delta, m.ProductID)
		if err != nil {
			tx.Rollback()
			writeErr(w, 400, err.Error())
			return
		}
		tx.Commit()
		writeJSON(w, 201, map[string]string{"id": id})
		return
	}
	writeErr(w, 405, "method not allowed")
}

// ==================== GENERIC HELPERS ====================
func simpleListHandler(table string, fields []string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" {
			var cols []string
			cols = append(cols, "id")
			for _, f := range fields {
				cols = append(cols, "COALESCE("+f+",'')")
			}
			cols = append(cols, "is_active")
			query := "SELECT " + strings.Join(cols, ", ") + " FROM " + table + " ORDER BY created_at DESC"
			rows, err := db.Query(query)
			if err != nil {
				writeErr(w, 500, err.Error())
				return
			}
			defer rows.Close()
			var list []map[string]interface{}
			for rows.Next() {
				vals := make([]interface{}, len(fields)+2)
				ptrs := make([]interface{}, len(fields)+2)
				for i := range vals {
					ptrs[i] = &vals[i]
				}
				rows.Scan(ptrs...)
				item := map[string]interface{}{"id": fmt(vals[0])}
				for i, f := range fields {
					item[f] = fmt(vals[i+1])
				}
				if b, ok := vals[len(vals)-1].(bool); ok {
					item["is_active"] = b
				}
				list = append(list, item)
			}
			writeJSON(w, 200, list)
			return
		}
		if r.Method == "POST" {
			var body map[string]interface{}
			json.NewDecoder(r.Body).Decode(&body)
			var placeholders []string
			var args []interface{}
			var cols []string
			i := 1
			for _, f := range fields {
				if v, ok := body[f]; ok {
					cols = append(cols, f)
					placeholders = append(placeholders, "$"+itoa(i))
					args = append(args, v)
					i++
				}
			}
			if len(cols) == 0 {
				writeErr(w, 400, "no fields")
				return
			}
			query := "INSERT INTO " + table + " (" + strings.Join(cols, ",") + ") VALUES (" + strings.Join(placeholders, ",") + ") RETURNING id"
			var id string
			err := db.QueryRow(query, args...).Scan(&id)
			if err != nil {
				writeErr(w, 400, err.Error())
				return
			}
			body["id"] = id
			writeJSON(w, 201, body)
			return
		}
		writeErr(w, 405, "method not allowed")
	}
}

func simpleItemHandler(table string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		parts := strings.Split(r.URL.Path, "/")
		id := parts[len(parts)-1]
		if r.Method == "DELETE" {
			_, err := db.Exec("DELETE FROM "+table+" WHERE id=$1", id)
			if err != nil {
				writeErr(w, 400, err.Error())
				return
			}
			writeJSON(w, 200, map[string]string{"status": "deleted"})
			return
		}
		if r.Method == "PATCH" || r.Method == "PUT" {
			var body map[string]interface{}
			json.NewDecoder(r.Body).Decode(&body)
			var sets []string
			var args []interface{}
			i := 1
			for k, v := range body {
				sets = append(sets, k+"=$"+itoa(i))
				args = append(args, v)
				i++
			}
			if len(sets) == 0 {
				writeJSON(w, 200, map[string]string{"status": "nothing_to_update"})
				return
			}
			args = append(args, id)
			query := "UPDATE " + table + " SET " + strings.Join(sets, ", ") + " WHERE id=$" + itoa(i)
			_, err := db.Exec(query, args...)
			if err != nil {
				writeErr(w, 400, err.Error())
				return
			}
			writeJSON(w, 200, map[string]string{"status": "updated"})
			return
		}
		writeErr(w, 405, "method not allowed")
	}
}

func fmt(v interface{}) string {
	if v == nil {
		return ""
	}
	switch t := v.(type) {
	case []byte:
		return string(t)
	case string:
		return t
	}
	return ""
}

func itoa(i int) string {
	return strings.TrimSpace(sprintfInt(i))
}

func sprintfInt(i int) string {
	if i == 0 {
		return "0"
	}
	var b []byte
	neg := false
	if i < 0 {
		neg = true
		i = -i
	}
	for i > 0 {
		b = append([]byte{byte('0' + i%10)}, b...)
		i /= 10
	}
	if neg {
		b = append([]byte{'-'}, b...)
	}
	return string(b)
}
