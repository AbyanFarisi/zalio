#!/usr/bin/env python3
"""
Zalio ERP - Test NEW Features (Sequence 8)
Tests generic master CRUD, purchase orders, inventory transactions, and analytics charts
"""
import json
import urllib.error
import urllib.request
from uuid import UUID
import time

# Use localhost since public URL returns 403/1010
BASE = "http://localhost:3000/api"
DEMO_EMAIL = "admin@zalio.com"
DEMO_PASSWORD = "admin123"

# Global token storage
auth_token = None


def request(method, path, payload=None, auth=False):
    """Make HTTP request with optional auth header"""
    headers = {"Content-Type": "application/json"}
    if auth and auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=headers)
    
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            raw = response.read().decode()
            return response.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode()
        try:
            body = json.loads(raw)
        except json.JSONDecodeError:
            body = raw
        return exc.code, body


def check(name, condition, detail=""):
    """Assert condition and print result"""
    if not condition:
        raise AssertionError(f"❌ {name}: {detail}")
    print(f"✅ PASS: {name}")


def is_valid_uuid(val):
    """Check if string is valid UUID"""
    try:
        UUID(str(val))
        return True
    except (ValueError, AttributeError):
        return False


def login():
    """Login and store auth token"""
    global auth_token
    print("\n=== Authenticating ===")
    status, body = request("POST", "/auth/login", {
        "email": DEMO_EMAIL,
        "password": DEMO_PASSWORD
    })
    check("Login successful", status == 200, f"status={status} body={body}")
    auth_token = body.get("token")
    print(f"✅ Authenticated with token")


def test_generic_master_crud():
    """Test generic master CRUD modules with numeric and date fields"""
    print("\n=== Testing Generic Master CRUD Modules ===")
    ts = int(time.time()) % 10000
    
    # Test 1: customer-categories (text fields)
    print("\n--- Testing customer-categories ---")
    status, body = request("GET", "/master/customer-categories")
    check("GET /master/customer-categories returns 200", status == 200, f"status={status}")
    check("customer-categories returns array", isinstance(body, list), f"body={body}")
    
    status, created = request("POST", "/master/customer-categories", {
        "name": f"VIP Customer {ts}",
        "description": "High value customers"
    })
    check("POST /master/customer-categories returns 201", status == 201, f"status={status}")
    check("Created customer-category has UUID id", is_valid_uuid(created.get("id")), str(created))
    cat_id = created.get("id")
    
    status, body = request("GET", "/master/customer-categories")
    check("GET list contains created item", 
          any(item.get("id") == cat_id for item in body),
          f"Looking for {cat_id} in {len(body)} items")
    
    status, updated = request("PATCH", f"/master/customer-categories/{cat_id}", {
        "description": "Updated description"
    })
    check("PATCH /master/customer-categories returns 200", status == 200, f"status={status}")
    
    status, deleted = request("DELETE", f"/master/customer-categories/{cat_id}")
    check("DELETE /master/customer-categories returns 200", status == 200, f"status={status}")
    
    # Test 2: promotions (numeric and date fields)
    print("\n--- Testing promotions (numeric + date fields) ---")
    status, body = request("GET", "/master/promotions")
    check("GET /master/promotions returns 200", status == 200, f"status={status}")
    
    status, created = request("POST", "/master/promotions", {
        "name": f"Flash Sale {ts}",
        "promo_type": "DISCOUNT",
        "value": 15.5,
        "start_date": "2025-01-01",
        "end_date": "2025-12-31",
        "description": "Year-end promotion"
    })
    check("POST /master/promotions with numeric value returns 201", status == 201, f"status={status}")
    check("Created promotion has UUID id", is_valid_uuid(created.get("id")), str(created))
    promo_id = created.get("id")
    
    status, updated = request("PATCH", f"/master/promotions/{promo_id}", {
        "value": 20.0
    })
    check("PATCH /master/promotions updates numeric field", status == 200, f"status={status}")
    
    status, deleted = request("DELETE", f"/master/promotions/{promo_id}")
    check("DELETE /master/promotions returns 200", status == 200, f"status={status}")
    
    # Test 3: chart-of-accounts
    print("\n--- Testing chart-of-accounts ---")
    status, body = request("GET", "/master/chart-of-accounts")
    check("GET /master/chart-of-accounts returns 200", status == 200, f"status={status}")
    
    status, created = request("POST", "/master/chart-of-accounts", {
        "code": f"1-{ts}",
        "name": f"Test Account {ts}",
        "account_type": "ASSET",
        "normal_balance": "DEBIT",
        "description": "Test account"
    })
    check("POST /master/chart-of-accounts returns 201", status == 201, f"status={status}")
    coa_id = created.get("id")
    
    status, updated = request("PATCH", f"/master/chart-of-accounts/{coa_id}", {
        "name": "Updated Account Name"
    })
    check("PATCH /master/chart-of-accounts returns 200", status == 200, f"status={status}")
    
    status, deleted = request("DELETE", f"/master/chart-of-accounts/{coa_id}")
    check("DELETE /master/chart-of-accounts returns 200", status == 200, f"status={status}")
    
    # Test 4: bank-transactions (numeric + date)
    print("\n--- Testing bank-transactions (numeric + date) ---")
    status, body = request("GET", "/master/bank-transactions")
    check("GET /master/bank-transactions returns 200", status == 200, f"status={status}")
    
    status, created = request("POST", "/master/bank-transactions", {
        "bank_name": "BCA",
        "trx_type": "TRANSFER",
        "amount": 5000000.50,
        "trx_date": "2025-01-15",
        "description": "Payment to supplier"
    })
    check("POST /master/bank-transactions with numeric amount returns 201", status == 201, f"status={status}")
    trx_id = created.get("id")
    
    status, updated = request("PATCH", f"/master/bank-transactions/{trx_id}", {
        "amount": 5500000.00
    })
    check("PATCH /master/bank-transactions updates amount", status == 200, f"status={status}")
    
    status, deleted = request("DELETE", f"/master/bank-transactions/{trx_id}")
    check("DELETE /master/bank-transactions returns 200", status == 200, f"status={status}")
    
    # Test 5: payrolls (multiple numeric fields)
    print("\n--- Testing payrolls (multiple numeric fields) ---")
    status, body = request("GET", "/master/payrolls")
    check("GET /master/payrolls returns 200", status == 200, f"status={status}")
    
    status, created = request("POST", "/master/payrolls", {
        "employee_name": f"John Doe {ts}",
        "period": "2025-01",
        "basic_salary": 8000000,
        "allowance": 1500000,
        "deduction": 500000,
        "net_salary": 9000000
    })
    check("POST /master/payrolls with numeric fields returns 201", status == 201, f"status={status}")
    payroll_id = created.get("id")
    
    status, updated = request("PATCH", f"/master/payrolls/{payroll_id}", {
        "allowance": 2000000,
        "net_salary": 9500000
    })
    check("PATCH /master/payrolls updates numeric fields", status == 200, f"status={status}")
    
    status, deleted = request("DELETE", f"/master/payrolls/{payroll_id}")
    check("DELETE /master/payrolls returns 200", status == 200, f"status={status}")
    
    # Test 6: auto-numbers (numeric field)
    print("\n--- Testing auto-numbers (numeric field) ---")
    status, body = request("GET", "/master/auto-numbers")
    check("GET /master/auto-numbers returns 200", status == 200, f"status={status}")
    
    status, created = request("POST", "/master/auto-numbers", {
        "module": f"TEST-{ts}",
        "prefix": "TST",
        "next_number": 1001,
        "description": "Test auto number"
    })
    check("POST /master/auto-numbers with numeric next_number returns 201", status == 201, f"status={status}")
    auto_id = created.get("id")
    
    status, updated = request("PATCH", f"/master/auto-numbers/{auto_id}", {
        "next_number": 1050
    })
    check("PATCH /master/auto-numbers updates next_number", status == 200, f"status={status}")
    
    status, deleted = request("DELETE", f"/master/auto-numbers/{auto_id}")
    check("DELETE /master/auto-numbers returns 200", status == 200, f"status={status}")


def test_subcategories():
    """Test subcategories with category join"""
    print("\n=== Testing Subcategories with Category Join ===")
    ts = int(time.time()) % 10000
    
    # Get a category first
    status, categories = request("GET", "/master/categories")
    check("GET /master/categories returns 200", status == 200, f"status={status}")
    check("Categories array not empty", len(categories) > 0, f"Found {len(categories)} categories")
    
    category_id = categories[0].get("id")
    category_name = categories[0].get("name")
    
    # Create subcategory with category_id
    status, created = request("POST", "/master/subcategories", {
        "name": f"Test Subcategory {ts}",
        "category_id": category_id,
        "description": "Test subcategory with parent"
    })
    check("POST /master/subcategories with category_id returns 201", status == 201, f"status={status}")
    check("Created subcategory has UUID id", is_valid_uuid(created.get("id")), str(created))
    subcat_id = created.get("id")
    
    # GET list and verify category_name is populated
    status, subcats = request("GET", "/master/subcategories")
    check("GET /master/subcategories returns 200", status == 200, f"status={status}")
    
    created_subcat = next((s for s in subcats if s.get("id") == subcat_id), None)
    check("GET list contains created subcategory", created_subcat is not None, f"Looking for {subcat_id}")
    check("Subcategory has category_name field populated", 
          "category_name" in created_subcat and created_subcat.get("category_name") != "",
          f"subcategory={created_subcat}")
    
    # Clean up
    status, deleted = request("DELETE", f"/master/subcategories/{subcat_id}")
    check("DELETE /master/subcategories returns 200", status == 200, f"status={status}")


def test_purchase_orders():
    """Test purchase orders transaction flow with stock effects"""
    print("\n=== Testing Purchase Orders Transaction Flow ===")
    ts = int(time.time()) % 10000
    
    # Get a product and note its current stock
    status, products = request("GET", "/master/products")
    check("GET /master/products returns 200", status == 200, f"status={status}")
    check("Products array not empty", len(products) > 0, f"Found {len(products)} products")
    
    product = products[0]
    product_id = product.get("id")
    initial_stock = float(product.get("stock_qty", 0))
    print(f"  Product: {product.get('name')} (ID: {product_id})")
    print(f"  Initial stock: {initial_stock}")
    
    # Get a supplier
    status, suppliers = request("GET", "/master/suppliers")
    check("GET /master/suppliers returns 200", status == 200, f"status={status}")
    check("Suppliers array not empty", len(suppliers) > 0, f"Found {len(suppliers)} suppliers")
    supplier_id = suppliers[0].get("id")
    
    # Create purchase order (DRAFT)
    status, po = request("POST", "/master/purchase-orders", {
        "supplier_id": supplier_id,
        "payment_method": "TRANSFER",
        "discount": 0,
        "tax": 0,
        "items": [
            {
                "product_id": product_id,
                "quantity": 10,
                "price": 2000
            }
        ]
    })
    check("POST /master/purchase-orders returns 201", status == 201, f"status={status} body={po}")
    check("Created PO has order_number (PO-...)", 
          "order_number" in po and po.get("order_number", "").startswith("PO-"),
          str(po))
    check("Created PO has UUID id", is_valid_uuid(po.get("id")), str(po))
    check("Created PO status is DRAFT", po.get("status") == "DRAFT", str(po))
    
    po_id = po.get("id")
    po_number = po.get("order_number")
    print(f"  Created PO: {po_number} (ID: {po_id})")
    
    # GET purchase order detail
    status, po_detail = request("GET", f"/master/purchase-orders/{po_id}")
    check("GET /master/purchase-orders/{id} returns 200", status == 200, f"status={status}")
    check("PO detail has items array", 
          "items" in po_detail and isinstance(po_detail["items"], list),
          str(po_detail))
    check("PO items array not empty", len(po_detail["items"]) > 0, str(po_detail))
    
    # Confirm purchase order (should increase stock)
    status, confirmed = request("POST", f"/master/purchase-orders/{po_id}/confirm")
    check("POST /master/purchase-orders/{id}/confirm returns 200", status == 200, f"status={status}")
    check("Confirmed PO status is CONFIRMED", 
          confirmed.get("status") == "CONFIRMED",
          str(confirmed))
    print(f"  PO confirmed: {po_number}")
    
    # Verify product stock INCREASED by 10
    status, products = request("GET", "/master/products")
    updated_product = next((p for p in products if p.get("id") == product_id), None)
    check("Product found after PO confirm", updated_product is not None, f"Looking for {product_id}")
    
    confirmed_stock = float(updated_product.get("stock_qty", 0))
    print(f"  Stock after confirm: {confirmed_stock}")
    check("Product stock INCREASED by 10 after PO confirm",
          confirmed_stock == initial_stock + 10,
          f"Initial: {initial_stock}, After confirm: {confirmed_stock}, Expected: {initial_stock + 10}")
    
    # Cancel purchase order (should decrease stock back)
    status, cancelled = request("POST", f"/master/purchase-orders/{po_id}/cancel")
    check("POST /master/purchase-orders/{id}/cancel returns 200", status == 200, f"status={status}")
    check("Cancelled PO status is CANCELLED",
          cancelled.get("status") == "CANCELLED",
          str(cancelled))
    print(f"  PO cancelled: {po_number}")
    
    # Verify product stock DECREASED back by 10
    status, products = request("GET", "/master/products")
    final_product = next((p for p in products if p.get("id") == product_id), None)
    final_stock = float(final_product.get("stock_qty", 0))
    print(f"  Stock after cancel: {final_stock}")
    check("Product stock DECREASED by 10 after PO cancel",
          final_stock == confirmed_stock - 10,
          f"After confirm: {confirmed_stock}, After cancel: {final_stock}, Expected: {confirmed_stock - 10}")
    check("Product stock returned to initial value",
          final_stock == initial_stock,
          f"Initial: {initial_stock}, Final: {final_stock}")


def test_inventory_transactions():
    """Test inventory transactions with stock effects"""
    print("\n=== Testing Inventory Transactions ===")
    ts = int(time.time()) % 10000
    
    # Get a product
    status, products = request("GET", "/master/products")
    check("GET /master/products returns 200", status == 200, f"status={status}")
    product = products[0]
    product_id = product.get("id")
    initial_stock = float(product.get("stock_qty", 0))
    print(f"  Product: {product.get('name')} (ID: {product_id})")
    print(f"  Initial stock: {initial_stock}")
    
    # Test 1: Stock Adjustment IN (should increase stock)
    print("\n--- Testing stock-adjustments IN ---")
    status, adj = request("POST", "/master/stock-adjustments", {
        "product_id": product_id,
        "quantity": 5,
        "adjustment_type": "IN",
        "reason": "Test adjustment IN"
    })
    check("POST /master/stock-adjustments with IN returns 201", status == 201, f"status={status}")
    check("Created adjustment has adjustment_number", 
          "adjustment_number" in adj,
          str(adj))
    
    # Verify stock increased by 5
    status, products = request("GET", "/master/products")
    product = next((p for p in products if p.get("id") == product_id), None)
    stock_after_in = float(product.get("stock_qty", 0))
    print(f"  Stock after IN adjustment: {stock_after_in}")
    check("Stock INCREASED by 5 after adjustment IN",
          stock_after_in == initial_stock + 5,
          f"Initial: {initial_stock}, After IN: {stock_after_in}, Expected: {initial_stock + 5}")
    
    # Test 2: Stock Adjustment OUT (should decrease stock)
    print("\n--- Testing stock-adjustments OUT ---")
    status, adj = request("POST", "/master/stock-adjustments", {
        "product_id": product_id,
        "quantity": 5,
        "adjustment_type": "OUT",
        "reason": "Test adjustment OUT"
    })
    check("POST /master/stock-adjustments with OUT returns 201", status == 201, f"status={status}")
    
    # Verify stock decreased by 5
    status, products = request("GET", "/master/products")
    product = next((p for p in products if p.get("id") == product_id), None)
    stock_after_out = float(product.get("stock_qty", 0))
    print(f"  Stock after OUT adjustment: {stock_after_out}")
    check("Stock DECREASED by 5 after adjustment OUT",
          stock_after_out == stock_after_in - 5,
          f"After IN: {stock_after_in}, After OUT: {stock_after_out}, Expected: {stock_after_in - 5}")
    check("Stock returned to initial value",
          stock_after_out == initial_stock,
          f"Initial: {initial_stock}, Final: {stock_after_out}")
    
    # Test 3: Stock Opname (should set stock to actual_qty)
    print("\n--- Testing stock-opnames ---")
    status, opname = request("POST", "/master/stock-opnames", {
        "product_id": product_id,
        "actual_qty": 99,
        "notes": "Test stock opname"
    })
    check("POST /master/stock-opnames returns 201", status == 201, f"status={status}")
    check("Opname response includes difference",
          "difference" in opname,
          str(opname))
    
    difference = opname.get("difference")
    print(f"  Opname difference: {difference}")
    
    # Verify stock is now 99
    status, products = request("GET", "/master/products")
    product = next((p for p in products if p.get("id") == product_id), None)
    stock_after_opname = float(product.get("stock_qty", 0))
    print(f"  Stock after opname: {stock_after_opname}")
    check("Product stock_qty set to actual_qty (99) after opname",
          stock_after_opname == 99,
          f"Expected: 99, Actual: {stock_after_opname}")
    
    # Test 4: Stock Transfer
    print("\n--- Testing stock-transfers ---")
    # Get warehouses
    status, warehouses = request("GET", "/master/warehouses")
    check("GET /master/warehouses returns 200", status == 200, f"status={status}")
    
    if len(warehouses) >= 2:
        from_wh_id = warehouses[0].get("id")
        to_wh_id = warehouses[1].get("id")
        
        status, transfer = request("POST", "/master/stock-transfers", {
            "product_id": product_id,
            "from_warehouse_id": from_wh_id,
            "to_warehouse_id": to_wh_id,
            "quantity": 3,
            "notes": "Test transfer"
        })
        check("POST /master/stock-transfers returns 201", status == 201, f"status={status}")
        check("Transfer has transfer_number",
              "transfer_number" in transfer,
              str(transfer))
        
        # GET list and verify warehouse names are populated
        status, transfers = request("GET", "/master/stock-transfers")
        check("GET /master/stock-transfers returns 200", status == 200, f"status={status}")
        
        if len(transfers) > 0:
            latest_transfer = transfers[0]
            check("Transfer has from_warehouse_name",
                  "from_warehouse_name" in latest_transfer,
                  str(latest_transfer))
            check("Transfer has to_warehouse_name",
                  "to_warehouse_name" in latest_transfer,
                  str(latest_transfer))
    else:
        print("  ⚠️  Skipping stock-transfers test: need at least 2 warehouses")


def test_analytics_endpoints():
    """Test analytics endpoints for charts and reports"""
    print("\n=== Testing Analytics Endpoints ===")
    
    # Test 1: /analytics/charts
    print("\n--- Testing /analytics/charts ---")
    status, body = request("GET", "/analytics/charts")
    check("GET /analytics/charts returns 200", status == 200, f"status={status}")
    check("Charts has sales_daily", "sales_daily" in body, str(body.keys()))
    check("Charts has purchase_daily", "purchase_daily" in body, str(body.keys()))
    check("Charts has category_distribution", "category_distribution" in body, str(body.keys()))
    check("Charts has stock_status", "stock_status" in body, str(body.keys()))
    check("Charts has top_products", "top_products" in body, str(body.keys()))
    
    # Test 2: /analytics/activity-summary
    print("\n--- Testing /analytics/activity-summary ---")
    status, body = request("GET", "/analytics/activity-summary")
    check("GET /analytics/activity-summary returns 200", status == 200, f"status={status}")
    check("Activity summary has total", "total" in body, str(body.keys()))
    check("Activity summary has today", "today" in body, str(body.keys()))
    check("Activity summary has by_action", "by_action" in body, str(body.keys()))
    check("Activity summary has by_module", "by_module" in body, str(body.keys()))
    check("Activity summary has trend", "trend" in body, str(body.keys()))
    
    # Test 3: /analytics/reorder
    print("\n--- Testing /analytics/reorder ---")
    status, body = request("GET", "/analytics/reorder")
    check("GET /analytics/reorder returns 200", status == 200, f"status={status}")
    check("Reorder has items", "items" in body, str(body.keys()))
    check("Reorder has count", "count" in body, str(body.keys()))
    
    # Test 4: /analytics/stock-by-warehouse
    print("\n--- Testing /analytics/stock-by-warehouse ---")
    status, body = request("GET", "/analytics/stock-by-warehouse")
    check("GET /analytics/stock-by-warehouse returns 200", status == 200, f"status={status}")
    check("Stock-by-warehouse has items", "items" in body, str(body.keys()))
    check("Stock-by-warehouse has count", "count" in body, str(body.keys()))
    
    # Test 5: /analytics/product-performance
    print("\n--- Testing /analytics/product-performance ---")
    status, body = request("GET", "/analytics/product-performance")
    check("GET /analytics/product-performance returns 200", status == 200, f"status={status}")
    check("Product-performance has items", "items" in body, str(body.keys()))
    check("Product-performance has count", "count" in body, str(body.keys()))
    
    # Test 6: /analytics/supplier-performance
    print("\n--- Testing /analytics/supplier-performance ---")
    status, body = request("GET", "/analytics/supplier-performance")
    check("GET /analytics/supplier-performance returns 200", status == 200, f"status={status}")
    check("Supplier-performance has items", "items" in body, str(body.keys()))
    check("Supplier-performance has count", "count" in body, str(body.keys()))
    
    # Test 7: /analytics/cash-flow
    print("\n--- Testing /analytics/cash-flow ---")
    status, body = request("GET", "/analytics/cash-flow")
    check("GET /analytics/cash-flow returns 200", status == 200, f"status={status}")
    check("Cash-flow has data", "data" in body, str(body.keys()))
    check("Cash-flow has total_inflow", "total_inflow" in body, str(body.keys()))
    check("Cash-flow has total_outflow", "total_outflow" in body, str(body.keys()))
    check("Cash-flow has net", "net" in body, str(body.keys()))


def test_activity_logs():
    """Test activity logs endpoint"""
    print("\n=== Testing Activity Logs ===")
    
    status, body = request("GET", "/master/activity-logs")
    check("GET /master/activity-logs returns 200", status == 200, f"status={status}")
    check("Activity logs returns array", isinstance(body, list), f"body type={type(body)}")
    
    if len(body) > 0:
        log = body[0]
        check("Activity log has action field", "action" in log, str(log))
        check("Activity log has module field", "module" in log, str(log))
        check("Activity log has description field", "description" in log, str(log))
        print(f"  Found {len(body)} activity log entries")
        print(f"  Latest: {log.get('action')} on {log.get('module')} - {log.get('description')}")
    else:
        print("  ⚠️  No activity logs found (expected after mutations)")


def main():
    """Run all tests"""
    print("=" * 70)
    print("Zalio ERP - Testing NEW Features (Sequence 8)")
    print("Testing through Next.js API Gateway at:", BASE)
    print("=" * 70)
    
    try:
        login()
        test_generic_master_crud()
        test_subcategories()
        test_purchase_orders()
        test_inventory_transactions()
        test_analytics_endpoints()
        test_activity_logs()
        
        print("\n" + "=" * 70)
        print("✅ ALL NEW FEATURE TESTS PASSED")
        print("=" * 70)
        return 0
        
    except AssertionError as e:
        print("\n" + "=" * 70)
        print(f"❌ TEST FAILED: {e}")
        print("=" * 70)
        return 1
    except Exception as e:
        print("\n" + "=" * 70)
        print(f"❌ TEST ERROR: {e}")
        print("=" * 70)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(main())
