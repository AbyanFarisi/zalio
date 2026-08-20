package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// ============ helpers ============
func toStr(v interface{}) string {
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

func logActivity(action, module, desc string) {
	go func() {
		db.Exec(`INSERT INTO activity_logs (action, module, description, user_name) VALUES ($1,$2,$3,$4)`, action, module, desc, "admin")
	}()
}

// generic list+create handler (numeric-safe via ::text cast on read)
func genList(table string, fields []string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			sel := []string{"id::text"}
			for _, f := range fields {
				sel = append(sel, "COALESCE("+f+"::text,'')")
			}
			sel = append(sel, "is_active")
			q := "SELECT " + strings.Join(sel, ",") + " FROM " + table + " ORDER BY created_at DESC LIMIT 500"
			rows, err := db.Query(q)
			if err != nil {
				writeErr(w, 500, err.Error())
				return
			}
			defer rows.Close()
			list := []map[string]interface{}{}
			for rows.Next() {
				vals := make([]interface{}, len(fields)+2)
				ptrs := make([]interface{}, len(fields)+2)
				for i := range vals {
					ptrs[i] = &vals[i]
				}
				rows.Scan(ptrs...)
				item := map[string]interface{}{"id": toStr(vals[0])}
				for i, f := range fields {
					item[f] = toStr(vals[i+1])
				}
				if b, ok := vals[len(vals)-1].(bool); ok {
					item["is_active"] = b
				}
				list = append(list, item)
			}
			writeJSON(w, 200, list)
		case "POST":
			var body map[string]interface{}
			json.NewDecoder(r.Body).Decode(&body)
			var cols, ph []string
			var args []interface{}
			i := 1
			for _, f := range fields {
				if v, ok := body[f]; ok && v != nil && v != "" {
					cols = append(cols, f)
					ph = append(ph, "$"+strconv.Itoa(i))
					args = append(args, v)
					i++
				}
			}
			if len(cols) == 0 {
				writeErr(w, 400, "no fields")
				return
			}
			q := "INSERT INTO " + table + " (" + strings.Join(cols, ",") + ") VALUES (" + strings.Join(ph, ",") + ") RETURNING id"
			var id string
			if err := db.QueryRow(q, args...).Scan(&id); err != nil {
				writeErr(w, 400, err.Error())
				return
			}
			body["id"] = id
			logActivity("CREATE", table, "Menambah data pada "+table)
			writeJSON(w, 201, body)
		default:
			writeErr(w, 405, "method not allowed")
		}
	}
}

// item handler with activity logging (PATCH/PUT/DELETE)
func genItem(table string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		parts := strings.Split(r.URL.Path, "/")
		id := parts[len(parts)-1]
		if r.Method == "DELETE" {
			if _, err := db.Exec("DELETE FROM "+table+" WHERE id=$1", id); err != nil {
				writeErr(w, 400, err.Error())
				return
			}
			logActivity("DELETE", table, "Menghapus data pada "+table)
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
				if k == "id" || k == "created_at" {
					continue
				}
				if v == "" {
					v = nil
				}
				sets = append(sets, k+"=$"+strconv.Itoa(i))
				args = append(args, v)
				i++
			}
			if len(sets) == 0 {
				writeJSON(w, 200, map[string]string{"status": "nothing_to_update"})
				return
			}
			args = append(args, id)
			q := "UPDATE " + table + " SET " + strings.Join(sets, ",") + " WHERE id=$" + strconv.Itoa(i)
			if _, err := db.Exec(q, args...); err != nil {
				writeErr(w, 400, err.Error())
				return
			}
			logActivity("UPDATE", table, "Memperbarui data pada "+table)
			writeJSON(w, 200, map[string]string{"status": "updated"})
			return
		}
		writeErr(w, 405, "method not allowed")
	}
}

func genNumber(prefix string, table string) string {
	var seq int
	db.QueryRow("SELECT COUNT(*)+1 FROM " + table + " WHERE DATE(created_at)=CURRENT_DATE").Scan(&seq)
	return prefix + "-" + time.Now().Format("20060102") + "-" + padLeft(sprintfInt(seq), 4, '0')
}

// ============ registration ============
func registerModules(mux *http.ServeMux) {
	simple := map[string][]string{
		"customer-categories": {"name", "description"},
		"supplier-categories": {"name", "description"},
		"sales-categories":    {"name", "description"},
		"sales-channels":      {"name", "description"},
		"sales-types":         {"name", "description"},
		"expense-categories":  {"name", "description"},
		"payment-terms":       {"name", "days", "description"},
		"tax-rates":           {"name", "rate", "description"},
		"promotions":          {"name", "promo_type", "value", "start_date", "end_date", "description"},
		"app-settings":        {"name", "value", "description"},
		"pos-settings":        {"name", "value", "description"},
		"auto-numbers":        {"module", "prefix", "next_number", "description"},
		"salary-components":   {"name", "comp_type", "amount", "description"},
		"period-closings":     {"period", "status", "notes"},
		"chart-of-accounts":   {"code", "name", "account_type", "normal_balance", "description"},
		"journal-vouchers":    {"voucher_number", "voucher_date", "description", "debit_account", "credit_account", "amount"},
		"bank-accounts":       {"name", "bank_name", "account_number", "balance", "description"},
		"bank-transactions":   {"bank_name", "trx_type", "amount", "trx_date", "description"},
		"budgets":             {"account_name", "period", "amount", "description"},
		"payrolls":            {"employee_name", "period", "basic_salary", "allowance", "deduction", "net_salary", "description"},
		"expense-accruals":    {"name", "amount", "accrual_date", "description"},
		"sales-receipts":      {"receipt_number", "order_number", "customer_name", "amount", "receipt_date", "payment_method", "notes"},
		"sales-returns":       {"return_number", "order_number", "customer_name", "amount", "return_date", "reason"},
		"sales-dps":           {"dp_number", "customer_name", "amount", "dp_date", "notes"},
		"sales-targets":       {"name", "period", "target_amount", "achieved", "description"},
		"price-adjustments":   {"name", "product_name", "old_price", "new_price", "adjustment_date", "reason"},
		"purchase-receipts":   {"receipt_number", "order_number", "supplier_name", "receipt_date", "notes"},
		"purchase-payments":   {"payment_number", "order_number", "supplier_name", "amount", "payment_date", "payment_method", "notes"},
		"purchase-returns":    {"return_number", "order_number", "supplier_name", "amount", "return_date", "reason"},
		"purchase-dps":        {"dp_number", "supplier_name", "amount", "dp_date", "notes"},
		"supplier-prices":     {"supplier_name", "product_name", "price", "description"},
	}
	tableName := map[string]string{
		"customer-categories": "customer_categories", "supplier-categories": "supplier_categories",
		"sales-categories": "sales_categories", "sales-channels": "sales_channels",
		"sales-types": "sales_types", "expense-categories": "expense_categories",
		"payment-terms": "payment_terms", "tax-rates": "tax_rates", "promotions": "promotions",
		"app-settings": "app_settings", "pos-settings": "pos_settings", "auto-numbers": "auto_numbers",
		"salary-components": "salary_components", "period-closings": "period_closings",
		"chart-of-accounts": "chart_of_accounts", "journal-vouchers": "journal_vouchers",
		"bank-accounts": "bank_accounts", "bank-transactions": "bank_transactions",
		"budgets": "budgets", "payrolls": "payrolls", "expense-accruals": "expense_accruals",
		"sales-receipts": "sales_receipts", "sales-returns": "sales_returns", "sales-dps": "sales_dps",
		"sales-targets": "sales_targets", "price-adjustments": "price_adjustments",
		"purchase-receipts": "purchase_receipts", "purchase-payments": "purchase_payments",
		"purchase-returns": "purchase_returns", "purchase-dps": "purchase_dps",
		"supplier-prices": "supplier_prices",
	}
	for route, fields := range simple {
		tbl := tableName[route]
		mux.HandleFunc("/master/"+route, genList(tbl, fields))
		mux.HandleFunc("/master/"+route+"/", genItem(tbl))
	}

	// subcategories (join category)
	mux.HandleFunc("/master/subcategories", subcategoriesHandler)
	mux.HandleFunc("/master/subcategories/", genItem("product_subcategories"))

	// activity logs
	mux.HandleFunc("/master/activity-logs", activityLogsHandler)

	// inventory transactions
	mux.HandleFunc("/master/stock-transfers", stockTransfersHandler)
	mux.HandleFunc("/master/stock-transfers/", genItem("stock_transfers"))
	mux.HandleFunc("/master/stock-opnames", stockOpnamesHandler)
	mux.HandleFunc("/master/stock-opnames/", genItem("stock_opnames"))
	mux.HandleFunc("/master/stock-adjustments", stockAdjustmentsHandler)
	mux.HandleFunc("/master/stock-adjustments/", genItem("stock_adjustments"))

	// purchase orders (transaction)
	mux.HandleFunc("/master/purchase-orders", purchaseOrdersHandler)
	mux.HandleFunc("/master/purchase-orders/", purchaseOrderItemRouter)
}

func subcategoriesHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET":
		rows, err := db.Query(`SELECT s.id::text, s.name, COALESCE(c.name,''), COALESCE(s.description,''), s.is_active, COALESCE(s.category_id::text,'') FROM product_subcategories s LEFT JOIN categories c ON s.category_id=c.id ORDER BY s.created_at DESC`)
		if err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		defer rows.Close()
		list := []map[string]interface{}{}
		for rows.Next() {
			var id, name, cat, desc, cid string
			var active bool
			rows.Scan(&id, &name, &cat, &desc, &active, &cid)
			list = append(list, map[string]interface{}{"id": id, "name": name, "category_name": cat, "description": desc, "is_active": active, "category_id": cid})
		}
		writeJSON(w, 200, list)
	case "POST":
		var b struct {
			Name        string `json:"name"`
			CategoryID  string `json:"category_id"`
			Description string `json:"description"`
		}
		json.NewDecoder(r.Body).Decode(&b)
		var cid interface{}
		if b.CategoryID != "" {
			cid = b.CategoryID
		}
		var id string
		err := db.QueryRow(`INSERT INTO product_subcategories (name, category_id, description) VALUES ($1,$2,$3) RETURNING id`, b.Name, cid, b.Description).Scan(&id)
		if err != nil {
			writeErr(w, 400, err.Error())
			return
		}
		logActivity("CREATE", "product_subcategories", "Menambah sub kategori "+b.Name)
		writeJSON(w, 201, map[string]interface{}{"id": id, "name": b.Name})
	default:
		writeErr(w, 405, "method not allowed")
	}
}

func activityLogsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		writeErr(w, 405, "method not allowed")
		return
	}
	rows, err := db.Query(`SELECT id::text, COALESCE(action,''), COALESCE(module,''), COALESCE(description,''), COALESCE(user_name,''), created_at::text FROM activity_logs ORDER BY created_at DESC LIMIT 200`)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	defer rows.Close()
	list := []map[string]interface{}{}
	for rows.Next() {
		var id, action, module, desc, user, created string
		rows.Scan(&id, &action, &module, &desc, &user, &created)
		list = append(list, map[string]interface{}{"id": id, "action": action, "module": module, "description": desc, "user_name": user, "created_at": created})
	}
	writeJSON(w, 200, list)
}

func stockTransfersHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET":
		rows, err := db.Query(`SELECT t.id::text, COALESCE(t.transfer_number,''), COALESCE(p.name,''), COALESCE(p.sku,''), COALESCE(wf.name,''), COALESCE(wt.name,''), t.quantity, t.transfer_date::text, COALESCE(t.notes,'') FROM stock_transfers t LEFT JOIN products p ON t.product_id=p.id LEFT JOIN warehouses wf ON t.from_warehouse_id=wf.id LEFT JOIN warehouses wt ON t.to_warehouse_id=wt.id ORDER BY t.created_at DESC`)
		if err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		defer rows.Close()
		list := []map[string]interface{}{}
		for rows.Next() {
			var id, num, pn, sku, wf, wt, date, notes string
			var qty float64
			rows.Scan(&id, &num, &pn, &sku, &wf, &wt, &qty, &date, &notes)
			list = append(list, map[string]interface{}{"id": id, "transfer_number": num, "product_name": pn, "product_sku": sku, "from_warehouse_name": wf, "to_warehouse_name": wt, "quantity": qty, "transfer_date": date, "notes": notes})
		}
		writeJSON(w, 200, list)
	case "POST":
		var b struct {
			ProductID       string  `json:"product_id"`
			FromWarehouseID string  `json:"from_warehouse_id"`
			ToWarehouseID   string  `json:"to_warehouse_id"`
			Quantity        float64 `json:"quantity"`
			Notes           string  `json:"notes"`
		}
		json.NewDecoder(r.Body).Decode(&b)
		num := genNumber("TRF", "stock_transfers")
		var fw, tw interface{}
		if b.FromWarehouseID != "" {
			fw = b.FromWarehouseID
		}
		if b.ToWarehouseID != "" {
			tw = b.ToWarehouseID
		}
		var id string
		err := db.QueryRow(`INSERT INTO stock_transfers (transfer_number, product_id, from_warehouse_id, to_warehouse_id, quantity, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, num, b.ProductID, fw, tw, b.Quantity, b.Notes).Scan(&id)
		if err != nil {
			writeErr(w, 400, err.Error())
			return
		}
		db.Exec(`INSERT INTO stock_movements (product_id, warehouse_id, movement_type, quantity, reference, notes) VALUES ($1,$2,'TRANSFER',$3,$4,$5)`, b.ProductID, tw, b.Quantity, num, b.Notes)
		logActivity("TRANSFER", "stock_transfers", "Transfer stok "+num)
		writeJSON(w, 201, map[string]interface{}{"id": id, "transfer_number": num})
	default:
		writeErr(w, 405, "method not allowed")
	}
}

func stockOpnamesHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET":
		rows, err := db.Query(`SELECT o.id::text, COALESCE(o.opname_number,''), COALESCE(p.name,''), COALESCE(p.sku,''), COALESCE(w.name,''), o.system_qty, o.actual_qty, o.difference, o.opname_date::text, COALESCE(o.notes,'') FROM stock_opnames o LEFT JOIN products p ON o.product_id=p.id LEFT JOIN warehouses w ON o.warehouse_id=w.id ORDER BY o.created_at DESC`)
		if err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		defer rows.Close()
		list := []map[string]interface{}{}
		for rows.Next() {
			var id, num, pn, sku, wn, date, notes string
			var sys, act, diff float64
			rows.Scan(&id, &num, &pn, &sku, &wn, &sys, &act, &diff, &date, &notes)
			list = append(list, map[string]interface{}{"id": id, "opname_number": num, "product_name": pn, "product_sku": sku, "warehouse_name": wn, "system_qty": sys, "actual_qty": act, "difference": diff, "opname_date": date, "notes": notes})
		}
		writeJSON(w, 200, list)
	case "POST":
		var b struct {
			ProductID   string  `json:"product_id"`
			WarehouseID string  `json:"warehouse_id"`
			ActualQty   float64 `json:"actual_qty"`
			Notes       string  `json:"notes"`
		}
		json.NewDecoder(r.Body).Decode(&b)
		var sysQty float64
		db.QueryRow(`SELECT stock_qty FROM products WHERE id=$1`, b.ProductID).Scan(&sysQty)
		diff := b.ActualQty - sysQty
		num := genNumber("OPN", "stock_opnames")
		var wid interface{}
		if b.WarehouseID != "" {
			wid = b.WarehouseID
		}
		var id string
		err := db.QueryRow(`INSERT INTO stock_opnames (opname_number, product_id, warehouse_id, system_qty, actual_qty, difference, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`, num, b.ProductID, wid, sysQty, b.ActualQty, diff, b.Notes).Scan(&id)
		if err != nil {
			writeErr(w, 400, err.Error())
			return
		}
		db.Exec(`UPDATE products SET stock_qty=$1, updated_at=NOW() WHERE id=$2`, b.ActualQty, b.ProductID)
		db.Exec(`INSERT INTO stock_movements (product_id, warehouse_id, movement_type, quantity, reference, notes) VALUES ($1,$2,'ADJUSTMENT',$3,$4,'Stok Opname')`, b.ProductID, wid, diff, num)
		logActivity("OPNAME", "stock_opnames", "Stok opname "+num)
		writeJSON(w, 201, map[string]interface{}{"id": id, "opname_number": num, "difference": diff})
	default:
		writeErr(w, 405, "method not allowed")
	}
}

func stockAdjustmentsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET":
		rows, err := db.Query(`SELECT a.id::text, COALESCE(a.adjustment_number,''), COALESCE(p.name,''), COALESCE(p.sku,''), COALESCE(w.name,''), a.quantity, COALESCE(a.adjustment_type,''), COALESCE(a.reason,''), a.adjustment_date::text FROM stock_adjustments a LEFT JOIN products p ON a.product_id=p.id LEFT JOIN warehouses w ON a.warehouse_id=w.id ORDER BY a.created_at DESC`)
		if err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		defer rows.Close()
		list := []map[string]interface{}{}
		for rows.Next() {
			var id, num, pn, sku, wn, atype, reason, date string
			var qty float64
			rows.Scan(&id, &num, &pn, &sku, &wn, &qty, &atype, &reason, &date)
			list = append(list, map[string]interface{}{"id": id, "adjustment_number": num, "product_name": pn, "product_sku": sku, "warehouse_name": wn, "quantity": qty, "adjustment_type": atype, "reason": reason, "adjustment_date": date})
		}
		writeJSON(w, 200, list)
	case "POST":
		var b struct {
			ProductID      string  `json:"product_id"`
			WarehouseID    string  `json:"warehouse_id"`
			Quantity       float64 `json:"quantity"`
			AdjustmentType string  `json:"adjustment_type"`
			Reason         string  `json:"reason"`
		}
		json.NewDecoder(r.Body).Decode(&b)
		delta := b.Quantity
		if b.AdjustmentType == "OUT" || b.AdjustmentType == "DECREASE" {
			delta = -b.Quantity
		}
		num := genNumber("ADJ", "stock_adjustments")
		var wid interface{}
		if b.WarehouseID != "" {
			wid = b.WarehouseID
		}
		var id string
		err := db.QueryRow(`INSERT INTO stock_adjustments (adjustment_number, product_id, warehouse_id, quantity, adjustment_type, reason) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, num, b.ProductID, wid, b.Quantity, b.AdjustmentType, b.Reason).Scan(&id)
		if err != nil {
			writeErr(w, 400, err.Error())
			return
		}
		db.Exec(`UPDATE products SET stock_qty=stock_qty+$1, updated_at=NOW() WHERE id=$2`, delta, b.ProductID)
		db.Exec(`INSERT INTO stock_movements (product_id, warehouse_id, movement_type, quantity, reference, notes) VALUES ($1,$2,'ADJUSTMENT',$3,$4,$5)`, b.ProductID, wid, delta, num, b.Reason)
		logActivity("ADJUSTMENT", "stock_adjustments", "Penyesuaian stok "+num)
		writeJSON(w, 201, map[string]interface{}{"id": id, "adjustment_number": num})
	default:
		writeErr(w, 405, "method not allowed")
	}
}

// ============ PURCHASE ORDERS ============
func purchaseOrdersHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET":
		rows, err := db.Query(`SELECT po.id::text, po.order_number, COALESCE(s.name,''), COALESCE(s.code,''), COALESCE(b.name,''), po.order_date::text, po.subtotal, po.tax, po.discount, po.total, po.status, po.created_at::text, COALESCE(po.supplier_id::text,''), COALESCE(po.branch_id::text,''), COALESCE(po.notes,''), COALESCE(po.payment_method,'') FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id=s.id LEFT JOIN branches b ON po.branch_id=b.id ORDER BY po.created_at DESC LIMIT 200`)
		if err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		defer rows.Close()
		list := []map[string]interface{}{}
		for rows.Next() {
			var id, num, sn, sc, bn, date, status, created, sid, bid, notes, pm string
			var sub, tax, disc, total float64
			rows.Scan(&id, &num, &sn, &sc, &bn, &date, &sub, &tax, &disc, &total, &status, &created, &sid, &bid, &notes, &pm)
			list = append(list, map[string]interface{}{"id": id, "order_number": num, "supplier_name": sn, "supplier_code": sc, "branch_name": bn, "order_date": date, "subtotal": sub, "tax": tax, "discount": disc, "total": total, "status": status, "created_at": created, "supplier_id": sid, "branch_id": bid, "notes": notes, "payment_method": pm})
		}
		writeJSON(w, 200, list)
	case "POST":
		var req struct {
			SupplierID    string  `json:"supplier_id"`
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
			writeErr(w, 400, "invalid body")
			return
		}
		num := genNumber("PO", "purchase_orders")
		tx, err := db.Begin()
		if err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		var sid, bid interface{}
		if req.SupplierID != "" {
			sid = req.SupplierID
		}
		if req.BranchID != "" {
			bid = req.BranchID
		}
		var subtotal float64
		for _, it := range req.Items {
			subtotal += it.Quantity * it.Price
		}
		total := subtotal - req.Discount + req.Tax
		var orderID string
		err = tx.QueryRow(`INSERT INTO purchase_orders (order_number, supplier_id, branch_id, subtotal, tax, discount, total, status, notes, payment_method) VALUES ($1,$2,$3,$4,$5,$6,$7,'DRAFT',$8,$9) RETURNING id`, num, sid, bid, subtotal, req.Tax, req.Discount, total, req.Notes, req.PaymentMethod).Scan(&orderID)
		if err != nil {
			tx.Rollback()
			writeErr(w, 400, err.Error())
			return
		}
		for _, it := range req.Items {
			if _, err := tx.Exec(`INSERT INTO purchase_order_items (order_id, product_id, quantity, price, subtotal) VALUES ($1,$2,$3,$4,$5)`, orderID, it.ProductID, it.Quantity, it.Price, it.Quantity*it.Price); err != nil {
				tx.Rollback()
				writeErr(w, 400, err.Error())
				return
			}
		}
		if err := tx.Commit(); err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		logActivity("CREATE", "purchase_orders", "Membuat PO "+num)
		writeJSON(w, 201, map[string]interface{}{"id": orderID, "order_number": num, "status": "DRAFT", "total": total})
	default:
		writeErr(w, 405, "method not allowed")
	}
}

func purchaseOrderItemRouter(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/master/purchase-orders/")
	parts := strings.Split(path, "/")
	orderID := parts[0]
	if len(parts) >= 2 && parts[1] == "confirm" && r.Method == "POST" {
		confirmPurchase(w, orderID)
		return
	}
	if len(parts) >= 2 && parts[1] == "cancel" && r.Method == "POST" {
		cancelPurchase(w, orderID)
		return
	}
	if r.Method == "GET" {
		getPurchaseOrder(w, orderID)
		return
	}
	if r.Method == "DELETE" {
		db.Exec(`DELETE FROM purchase_orders WHERE id=$1 AND status='DRAFT'`, orderID)
		logActivity("DELETE", "purchase_orders", "Menghapus PO draft")
		writeJSON(w, 200, map[string]string{"status": "deleted"})
		return
	}
	writeErr(w, 405, "method not allowed")
}

func getPurchaseOrder(w http.ResponseWriter, orderID string) {
	var id, num, sn, sc, bn, date, status, created, sid, bid, notes, pm string
	var sub, tax, disc, total float64
	err := db.QueryRow(`SELECT po.id::text, po.order_number, COALESCE(s.name,''), COALESCE(s.code,''), COALESCE(b.name,''), po.order_date::text, po.subtotal, po.tax, po.discount, po.total, po.status, po.created_at::text, COALESCE(po.supplier_id::text,''), COALESCE(po.branch_id::text,''), COALESCE(po.notes,''), COALESCE(po.payment_method,'') FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id=s.id LEFT JOIN branches b ON po.branch_id=b.id WHERE po.id=$1`, orderID).Scan(&id, &num, &sn, &sc, &bn, &date, &sub, &tax, &disc, &total, &status, &created, &sid, &bid, &notes, &pm)
	if err != nil {
		writeErr(w, 404, "not found")
		return
	}
	rows, _ := db.Query(`SELECT i.id::text, i.product_id::text, COALESCE(p.name,''), COALESCE(p.sku,''), i.quantity, i.price, i.subtotal FROM purchase_order_items i LEFT JOIN products p ON i.product_id=p.id WHERE i.order_id=$1`, orderID)
	items := []map[string]interface{}{}
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var iid, pid, pn, sku string
			var qty, price, st float64
			rows.Scan(&iid, &pid, &pn, &sku, &qty, &price, &st)
			items = append(items, map[string]interface{}{"id": iid, "product_id": pid, "product_name": pn, "product_sku": sku, "quantity": qty, "price": price, "subtotal": st})
		}
	}
	writeJSON(w, 200, map[string]interface{}{"id": id, "order_number": num, "supplier_name": sn, "supplier_code": sc, "branch_name": bn, "order_date": date, "subtotal": sub, "tax": tax, "discount": disc, "total": total, "status": status, "created_at": created, "supplier_id": sid, "branch_id": bid, "notes": notes, "payment_method": pm, "items": items})
}

func confirmPurchase(w http.ResponseWriter, orderID string) {
	var status string
	db.QueryRow(`SELECT status FROM purchase_orders WHERE id=$1`, orderID).Scan(&status)
	if status != "DRAFT" {
		writeErr(w, 400, "hanya draft yang bisa dikonfirmasi")
		return
	}
	tx, _ := db.Begin()
	rows, err := tx.Query(`SELECT product_id, quantity FROM purchase_order_items WHERE order_id=$1`, orderID)
	if err != nil {
		tx.Rollback()
		writeErr(w, 500, err.Error())
		return
	}
	type li struct {
		pid string
		qty float64
	}
	var lines []li
	for rows.Next() {
		var l li
		rows.Scan(&l.pid, &l.qty)
		lines = append(lines, l)
	}
	rows.Close()
	for _, l := range lines {
		if _, err := tx.Exec(`UPDATE products SET stock_qty=stock_qty+$1, updated_at=NOW() WHERE id=$2`, l.qty, l.pid); err != nil {
			tx.Rollback()
			writeErr(w, 400, err.Error())
			return
		}
		tx.Exec(`INSERT INTO stock_movements (product_id, movement_type, quantity, reference, notes) VALUES ($1,'IN',$2,$3,'Penerimaan PO')`, l.pid, l.qty, orderID)
	}
	tx.Exec(`UPDATE purchase_orders SET status='CONFIRMED' WHERE id=$1`, orderID)
	tx.Commit()
	logActivity("CONFIRM", "purchase_orders", "Konfirmasi PO (stok bertambah)")
	writeJSON(w, 200, map[string]string{"status": "CONFIRMED"})
}

func cancelPurchase(w http.ResponseWriter, orderID string) {
	var status string
	db.QueryRow(`SELECT status FROM purchase_orders WHERE id=$1`, orderID).Scan(&status)
	tx, _ := db.Begin()
	if status == "CONFIRMED" {
		rows, _ := tx.Query(`SELECT product_id, quantity FROM purchase_order_items WHERE order_id=$1`, orderID)
		type li struct {
			pid string
			qty float64
		}
		var lines []li
		for rows.Next() {
			var l li
			rows.Scan(&l.pid, &l.qty)
			lines = append(lines, l)
		}
		rows.Close()
		for _, l := range lines {
			tx.Exec(`UPDATE products SET stock_qty=stock_qty-$1, updated_at=NOW() WHERE id=$2`, l.qty, l.pid)
		}
	}
	tx.Exec(`UPDATE purchase_orders SET status='CANCELLED' WHERE id=$1`, orderID)
	tx.Commit()
	logActivity("CANCEL", "purchase_orders", "Membatalkan PO")
	writeJSON(w, 200, map[string]string{"status": "CANCELLED"})
}
