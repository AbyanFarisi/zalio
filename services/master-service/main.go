package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

var db *sql.DB

func main() {
	dsn := os.Getenv("POSTGRES_URL")
	if dsn == "" {
		dsn = "postgresql://zalio:zalio123@127.0.0.1:5432/zalio?sslmode=disable"
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

	// Sales Orders
	mux.HandleFunc("/master/sales-orders", salesOrdersHandler)
	mux.HandleFunc("/master/sales-orders/", salesOrderItemRouter)

	// Additional modules (finance, purchase, inventory, categories, activity log, etc.)
	registerModules(mux)

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

// ==================== SALES ORDERS ====================

func generateOrderNumber() string {
	var seq int
	row := db.QueryRow(`SELECT COUNT(*) + 1 FROM sales_orders WHERE DATE(created_at) = CURRENT_DATE`)
	row.Scan(&seq)
	now := time.Now()
	return now.Format("20060102") + "-" + padLeft(sprintfInt(seq), 4, '0')
}

func padLeft(s string, length int, pad byte) string {
	for len(s) < length {
		s = string(pad) + s
	}
	return s
}

func salesOrdersHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET":
		rows, err := db.Query(`
			SELECT so.id, so.order_number, COALESCE(c.name,'Walk-in'), COALESCE(c.code,''),
			       COALESCE(b.name,''), so.order_date, so.subtotal, so.tax, so.discount, so.total,
			       so.status, so.created_at,
			       COALESCE(so.customer_id::text,''), COALESCE(so.branch_id::text,''),
			       COALESCE(so.notes,''), COALESCE(so.payment_method,'')
			FROM sales_orders so
			LEFT JOIN customers c ON so.customer_id=c.id
			LEFT JOIN branches b ON so.branch_id=b.id
			ORDER BY so.created_at DESC
			LIMIT 200
		`)
		if err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		defer rows.Close()
		var list []map[string]interface{}
		for rows.Next() {
			var id, orderNum, custName, custCode, branchName, status, createdAt, custID, branchID, notes, payMethod string
			var orderDate string
			var subtotal, tax, disc, total float64
			rows.Scan(&id, &orderNum, &custName, &custCode, &branchName, &orderDate, &subtotal, &tax, &disc, &total, &status, &createdAt, &custID, &branchID, &notes, &payMethod)
			list = append(list, map[string]interface{}{
				"id": id, "order_number": orderNum, "customer_name": custName,
				"customer_code": custCode, "branch_name": branchName,
				"order_date": orderDate, "subtotal": subtotal, "tax": tax,
				"discount": disc, "total": total, "status": status,
				"created_at": createdAt, "customer_id": custID, "branch_id": branchID,
				"notes": notes, "payment_method": payMethod,
			})
		}
		if list == nil {
			list = []map[string]interface{}{}
		}
		writeJSON(w, 200, list)

	case "POST":
		var req struct {
			CustomerID    string  `json:"customer_id"`
			BranchID      string  `json:"branch_id"`
			Notes         string  `json:"notes"`
			PaymentMethod string  `json:"payment_method"`
			Discount      float64 `json:"discount"`
			Tax           float64 `json:"tax"`
			Items         []struct {
				ProductID string  `json:"product_id"`
				Quantity  float64 `json:"quantity"`
				Price     float64 `json:"price"`
			} `json:"items"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeErr(w, 400, "invalid body: "+err.Error())
			return
		}

		orderNum := "SO-" + generateOrderNumber()

		tx, err := db.Begin()
		if err != nil {
			writeErr(w, 500, err.Error())
			return
		}

		var custID, branchID interface{}
		if req.CustomerID != "" {
			custID = req.CustomerID
		}
		if req.BranchID != "" {
			branchID = req.BranchID
		}

		// Calculate subtotal from items
		var subtotal float64
		for _, item := range req.Items {
			subtotal += item.Quantity * item.Price
		}
		total := subtotal - req.Discount + req.Tax

		var orderID string
		err = tx.QueryRow(`
			INSERT INTO sales_orders (order_number, customer_id, branch_id, subtotal, tax, discount, total, status, notes, payment_method)
			VALUES ($1, $2, $3, $4, $5, $6, $7, 'DRAFT', $8, $9) RETURNING id
		`, orderNum, custID, branchID, subtotal, req.Tax, req.Discount, total, req.Notes, req.PaymentMethod).Scan(&orderID)
		if err != nil {
			tx.Rollback()
			writeErr(w, 400, "create order failed: "+err.Error())
			return
		}

		// Insert items
		for _, item := range req.Items {
			itemSubtotal := item.Quantity * item.Price
			_, err = tx.Exec(`
				INSERT INTO sales_order_items (order_id, product_id, quantity, price, subtotal)
				VALUES ($1, $2, $3, $4, $5)
			`, orderID, item.ProductID, item.Quantity, item.Price, itemSubtotal)
			if err != nil {
				tx.Rollback()
				writeErr(w, 400, "add item failed: "+err.Error())
				return
			}
		}

		if err := tx.Commit(); err != nil {
			writeErr(w, 500, err.Error())
			return
		}

		writeJSON(w, 201, map[string]interface{}{
			"id": orderID, "order_number": orderNum, "status": "DRAFT", "total": total,
		})

	default:
		writeErr(w, 405, "method not allowed")
	}
}

func salesOrderItemRouter(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/master/sales-orders/")
	parts := strings.Split(path, "/")
	orderID := parts[0]

	// /master/sales-orders/{id}/confirm
	if len(parts) >= 2 && parts[1] == "confirm" && r.Method == "POST" {
		confirmOrder(w, r, orderID)
		return
	}
	// /master/sales-orders/{id}/cancel
	if len(parts) >= 2 && parts[1] == "cancel" && r.Method == "POST" {
		cancelOrder(w, r, orderID)
		return
	}
	// /master/sales-orders/{id}/items
	if len(parts) >= 2 && parts[1] == "items" {
		if r.Method == "POST" {
			addOrderItem(w, r, orderID)
			return
		}
		// DELETE /master/sales-orders/{id}/items/{itemId}
		if r.Method == "DELETE" && len(parts) >= 3 {
			removeOrderItem(w, r, orderID, parts[2])
			return
		}
	}

	// GET /master/sales-orders/{id} - get single order with items
	if r.Method == "GET" {
		getSalesOrder(w, r, orderID)
		return
	}

	// PUT/PATCH /master/sales-orders/{id} - update order
	if r.Method == "PUT" || r.Method == "PATCH" {
		updateSalesOrder(w, r, orderID)
		return
	}

	// DELETE /master/sales-orders/{id}
	if r.Method == "DELETE" {
		deleteSalesOrder(w, r, orderID)
		return
	}

	writeErr(w, 405, "method not allowed")
}

func getSalesOrder(w http.ResponseWriter, r *http.Request, orderID string) {
	var id, orderNum, custName, custCode, branchName, status, createdAt, custID, branchID, notes, payMethod string
	var orderDate string
	var subtotal, tax, disc, total float64
	err := db.QueryRow(`
		SELECT so.id, so.order_number, COALESCE(c.name,'Walk-in'), COALESCE(c.code,''),
		       COALESCE(b.name,''), so.order_date, so.subtotal, so.tax, so.discount, so.total,
		       so.status, so.created_at,
		       COALESCE(so.customer_id::text,''), COALESCE(so.branch_id::text,''),
		       COALESCE(so.notes,''), COALESCE(so.payment_method,'')
		FROM sales_orders so
		LEFT JOIN customers c ON so.customer_id=c.id
		LEFT JOIN branches b ON so.branch_id=b.id
		WHERE so.id=$1
	`, orderID).Scan(&id, &orderNum, &custName, &custCode, &branchName, &orderDate, &subtotal, &tax, &disc, &total, &status, &createdAt, &custID, &branchID, &notes, &payMethod)
	if err != nil {
		writeErr(w, 404, "order not found")
		return
	}

	// Get items
	rows, err := db.Query(`
		SELECT soi.id, soi.product_id, COALESCE(p.name,''), COALESCE(p.sku,''),
		       soi.quantity, soi.price, soi.subtotal
		FROM sales_order_items soi
		LEFT JOIN products p ON soi.product_id=p.id
		WHERE soi.order_id=$1
	`, orderID)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	defer rows.Close()
	var items []map[string]interface{}
	for rows.Next() {
		var iid, pid, pname, psku string
		var qty, price, sub float64
		rows.Scan(&iid, &pid, &pname, &psku, &qty, &price, &sub)
		items = append(items, map[string]interface{}{
			"id": iid, "product_id": pid, "product_name": pname,
			"product_sku": psku, "quantity": qty, "price": price, "subtotal": sub,
		})
	}
	if items == nil {
		items = []map[string]interface{}{}
	}

	writeJSON(w, 200, map[string]interface{}{
		"id": id, "order_number": orderNum, "customer_name": custName,
		"customer_code": custCode, "branch_name": branchName,
		"order_date": orderDate, "subtotal": subtotal, "tax": tax,
		"discount": disc, "total": total, "status": status,
		"created_at": createdAt, "customer_id": custID, "branch_id": branchID,
		"notes": notes, "payment_method": payMethod, "items": items,
	})
}

func updateSalesOrder(w http.ResponseWriter, r *http.Request, orderID string) {
	// Check status - only DRAFT can be edited
	var currentStatus string
	err := db.QueryRow(`SELECT status FROM sales_orders WHERE id=$1`, orderID).Scan(&currentStatus)
	if err != nil {
		writeErr(w, 404, "order not found")
		return
	}
	if currentStatus != "DRAFT" {
		writeErr(w, 400, "hanya order DRAFT yang bisa diedit")
		return
	}

	var req struct {
		CustomerID    string  `json:"customer_id"`
		BranchID      string  `json:"branch_id"`
		Notes         string  `json:"notes"`
		PaymentMethod string  `json:"payment_method"`
		Discount      float64 `json:"discount"`
		Tax           float64 `json:"tax"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	var custID, branchID interface{}
	if req.CustomerID != "" {
		custID = req.CustomerID
	}
	if req.BranchID != "" {
		branchID = req.BranchID
	}

	_, err = db.Exec(`
		UPDATE sales_orders SET customer_id=$1, branch_id=$2, notes=$3, payment_method=$4, discount=$5, tax=$6 WHERE id=$7
	`, custID, branchID, req.Notes, req.PaymentMethod, req.Discount, req.Tax, orderID)
	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}

	// Recalculate totals
	recalcOrderTotal(orderID)

	writeJSON(w, 200, map[string]string{"id": orderID, "status": "updated"})
}

func deleteSalesOrder(w http.ResponseWriter, r *http.Request, orderID string) {
	var currentStatus string
	err := db.QueryRow(`SELECT status FROM sales_orders WHERE id=$1`, orderID).Scan(&currentStatus)
	if err != nil {
		writeErr(w, 404, "order not found")
		return
	}
	if currentStatus != "DRAFT" {
		writeErr(w, 400, "hanya order DRAFT yang bisa dihapus")
		return
	}

	tx, _ := db.Begin()
	tx.Exec(`DELETE FROM sales_order_items WHERE order_id=$1`, orderID)
	tx.Exec(`DELETE FROM sales_orders WHERE id=$1`, orderID)
	if err := tx.Commit(); err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]string{"status": "deleted"})
}

func addOrderItem(w http.ResponseWriter, r *http.Request, orderID string) {
	var currentStatus string
	err := db.QueryRow(`SELECT status FROM sales_orders WHERE id=$1`, orderID).Scan(&currentStatus)
	if err != nil {
		writeErr(w, 404, "order not found")
		return
	}
	if currentStatus != "DRAFT" {
		writeErr(w, 400, "tidak bisa menambah item ke order yang sudah dikonfirmasi")
		return
	}

	var req struct {
		ProductID string  `json:"product_id"`
		Quantity  float64 `json:"quantity"`
		Price     float64 `json:"price"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	if req.ProductID == "" || req.Quantity <= 0 {
		writeErr(w, 400, "product_id dan quantity wajib diisi")
		return
	}

	// If price not specified, get from product
	if req.Price == 0 {
		db.QueryRow(`SELECT selling_price FROM products WHERE id=$1`, req.ProductID).Scan(&req.Price)
	}

	subtotal := req.Quantity * req.Price
	var itemID string
	err = db.QueryRow(`
		INSERT INTO sales_order_items (order_id, product_id, quantity, price, subtotal)
		VALUES ($1, $2, $3, $4, $5) RETURNING id
	`, orderID, req.ProductID, req.Quantity, req.Price, subtotal).Scan(&itemID)
	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}

	recalcOrderTotal(orderID)

	writeJSON(w, 201, map[string]interface{}{
		"id": itemID, "product_id": req.ProductID, "quantity": req.Quantity, "price": req.Price, "subtotal": subtotal,
	})
}

func removeOrderItem(w http.ResponseWriter, r *http.Request, orderID string, itemID string) {
	var currentStatus string
	err := db.QueryRow(`SELECT status FROM sales_orders WHERE id=$1`, orderID).Scan(&currentStatus)
	if err != nil {
		writeErr(w, 404, "order not found")
		return
	}
	if currentStatus != "DRAFT" {
		writeErr(w, 400, "tidak bisa menghapus item dari order yang sudah dikonfirmasi")
		return
	}

	_, err = db.Exec(`DELETE FROM sales_order_items WHERE id=$1 AND order_id=$2`, itemID, orderID)
	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}

	recalcOrderTotal(orderID)

	writeJSON(w, 200, map[string]string{"status": "deleted"})
}

func confirmOrder(w http.ResponseWriter, r *http.Request, orderID string) {
	var currentStatus string
	err := db.QueryRow(`SELECT status FROM sales_orders WHERE id=$1`, orderID).Scan(&currentStatus)
	if err != nil {
		writeErr(w, 404, "order not found")
		return
	}
	if currentStatus != "DRAFT" {
		writeErr(w, 400, "order sudah dikonfirmasi sebelumnya")
		return
	}

	// Check items exist
	var itemCount int
	db.QueryRow(`SELECT COUNT(*) FROM sales_order_items WHERE order_id=$1`, orderID).Scan(&itemCount)
	if itemCount == 0 {
		writeErr(w, 400, "order tidak memiliki item")
		return
	}

	tx, err := db.Begin()
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}

	// Deduct stock for each item
	rows, err := tx.Query(`SELECT product_id, quantity FROM sales_order_items WHERE order_id=$1`, orderID)
	if err != nil {
		tx.Rollback()
		writeErr(w, 500, err.Error())
		return
	}
	type lineItem struct {
		ProductID string
		Quantity  float64
	}
	var items []lineItem
	for rows.Next() {
		var li lineItem
		rows.Scan(&li.ProductID, &li.Quantity)
		items = append(items, li)
	}
	rows.Close()

	for _, li := range items {
		// Check sufficient stock
		var stockQty float64
		tx.QueryRow(`SELECT stock_qty FROM products WHERE id=$1`, li.ProductID).Scan(&stockQty)
		if stockQty < li.Quantity {
			tx.Rollback()
			var pname string
			db.QueryRow(`SELECT name FROM products WHERE id=$1`, li.ProductID).Scan(&pname)
			writeErr(w, 400, "stok tidak cukup untuk: "+pname+" (tersedia: "+sprintfInt(int(stockQty))+")")
			return
		}

		// Deduct stock
		_, err = tx.Exec(`UPDATE products SET stock_qty = stock_qty - $1, updated_at=NOW() WHERE id=$2`, li.Quantity, li.ProductID)
		if err != nil {
			tx.Rollback()
			writeErr(w, 500, err.Error())
			return
		}

		// Record stock movement
		var orderNum string
		tx.QueryRow(`SELECT order_number FROM sales_orders WHERE id=$1`, orderID).Scan(&orderNum)
		_, err = tx.Exec(`INSERT INTO stock_movements (product_id, movement_type, quantity, reference, notes) VALUES ($1, 'OUT', $2, $3, 'Penjualan')`,
			li.ProductID, li.Quantity, orderNum)
		if err != nil {
			tx.Rollback()
			writeErr(w, 500, err.Error())
			return
		}
	}

	// Update status to CONFIRMED
	_, err = tx.Exec(`UPDATE sales_orders SET status='CONFIRMED' WHERE id=$1`, orderID)
	if err != nil {
		tx.Rollback()
		writeErr(w, 500, err.Error())
		return
	}

	if err := tx.Commit(); err != nil {
		writeErr(w, 500, err.Error())
		return
	}

	writeJSON(w, 200, map[string]string{"id": orderID, "status": "CONFIRMED"})
}

func cancelOrder(w http.ResponseWriter, r *http.Request, orderID string) {
	var currentStatus string
	err := db.QueryRow(`SELECT status FROM sales_orders WHERE id=$1`, orderID).Scan(&currentStatus)
	if err != nil {
		writeErr(w, 404, "order not found")
		return
	}

	tx, err := db.Begin()
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}

	// If confirmed, restore stock
	if currentStatus == "CONFIRMED" {
		rows, err := tx.Query(`SELECT product_id, quantity FROM sales_order_items WHERE order_id=$1`, orderID)
		if err != nil {
			tx.Rollback()
			writeErr(w, 500, err.Error())
			return
		}
		type lineItem struct {
			ProductID string
			Quantity  float64
		}
		var items []lineItem
		for rows.Next() {
			var li lineItem
			rows.Scan(&li.ProductID, &li.Quantity)
			items = append(items, li)
		}
		rows.Close()

		for _, li := range items {
			_, err = tx.Exec(`UPDATE products SET stock_qty = stock_qty + $1, updated_at=NOW() WHERE id=$2`, li.Quantity, li.ProductID)
			if err != nil {
				tx.Rollback()
				writeErr(w, 500, err.Error())
				return
			}
			var orderNum string
			tx.QueryRow(`SELECT order_number FROM sales_orders WHERE id=$1`, orderID).Scan(&orderNum)
			_, _ = tx.Exec(`INSERT INTO stock_movements (product_id, movement_type, quantity, reference, notes) VALUES ($1, 'IN', $2, $3, 'Pembatalan Penjualan')`,
				li.ProductID, li.Quantity, orderNum)
		}
	}

	_, err = tx.Exec(`UPDATE sales_orders SET status='CANCELLED' WHERE id=$1`, orderID)
	if err != nil {
		tx.Rollback()
		writeErr(w, 500, err.Error())
		return
	}

	if err := tx.Commit(); err != nil {
		writeErr(w, 500, err.Error())
		return
	}

	writeJSON(w, 200, map[string]string{"id": orderID, "status": "CANCELLED"})
}

func recalcOrderTotal(orderID string) {
	var subtotal float64
	db.QueryRow(`SELECT COALESCE(SUM(subtotal),0) FROM sales_order_items WHERE order_id=$1`, orderID).Scan(&subtotal)
	var tax, discount float64
	db.QueryRow(`SELECT COALESCE(tax,0), COALESCE(discount,0) FROM sales_orders WHERE id=$1`, orderID).Scan(&tax, &discount)
	total := subtotal - discount + tax
	db.Exec(`UPDATE sales_orders SET subtotal=$1, total=$2 WHERE id=$3`, subtotal, total, orderID)
}
