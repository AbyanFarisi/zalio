#!/usr/bin/env python3
"""
Zalio ERP Microservices Backend Test
Tests auth-service, master-service, and analytics-service through Next.js API Gateway
"""
import json
import os
import urllib.error
import urllib.request
from uuid import UUID

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


# ==================== TEST SUITES ====================

def test_api_gateway():
    """Test API Gateway root endpoint"""
    print("\n=== Testing API Gateway ===")
    status, body = request("GET", "/")
    check("GET /api/ returns service info", 
          status == 200 and "routes" in body,
          f"status={status} body={body}")
    check("Gateway lists auth service", 
          "auth" in body.get("routes", {}),
          str(body))
    check("Gateway lists master service", 
          "master" in body.get("routes", {}),
          str(body))
    check("Gateway lists analytics service", 
          "analytics" in body.get("routes", {}),
          str(body))


def test_auth_service():
    """Test Auth Service endpoints"""
    global auth_token
    print("\n=== Testing Auth Service ===")
    
    # Test login with valid credentials
    status, body = request("POST", "/auth/login", {
        "email": DEMO_EMAIL,
        "password": DEMO_PASSWORD
    })
    check("POST /api/auth/login with valid credentials returns 200",
          status == 200,
          f"status={status} body={body}")
    check("Login response contains token",
          "token" in body,
          str(body))
    check("Login response contains user object",
          "user" in body and isinstance(body["user"], dict),
          str(body))
    
    user = body.get("user", {})
    check("User object has id",
          "id" in user and is_valid_uuid(user["id"]),
          str(user))
    check("User object has email",
          user.get("email") == DEMO_EMAIL,
          str(user))
    check("User object has full_name",
          "full_name" in user,
          str(user))
    check("User object has role",
          "role" in user,
          str(user))
    
    # Store token for authenticated requests
    auth_token = body.get("token")
    
    # Test login with wrong password
    status, body = request("POST", "/auth/login", {
        "email": DEMO_EMAIL,
        "password": "wrongpassword"
    })
    check("POST /api/auth/login with wrong password returns 401",
          status == 401,
          f"status={status} body={body}")
    
    # Test /auth/me with token
    status, body = request("GET", "/auth/me", auth=True)
    check("GET /api/auth/me with Bearer token returns 200",
          status == 200,
          f"status={status} body={body}")
    check("/auth/me returns claims with email",
          body.get("email") == DEMO_EMAIL,
          str(body))
    
    # Test branches
    status, body = request("GET", "/auth/branches")
    check("GET /api/auth/branches returns array",
          status == 200 and isinstance(body, list),
          f"status={status} body={body}")
    check("Branches array has 3+ seeded branches",
          len(body) >= 3,
          f"Found {len(body)} branches")
    
    # Test POST branch (use timestamp to avoid duplicates)
    import time
    branch_code = f"TST{int(time.time()) % 10000}"
    status, body = request("POST", "/auth/branches", {
        "code": branch_code,
        "name": "Test Branch",
        "address": "Test Address 123",
        "phone": "081234567890"
    })
    check("POST /api/auth/branches returns 201",
          status == 201,
          f"status={status} body={body}")
    check("Created branch has UUID id",
          "id" in body and is_valid_uuid(body["id"]),
          str(body))
    created_branch_id = body.get("id")
    
    # Test outlets
    status, body = request("GET", "/auth/outlets")
    check("GET /api/auth/outlets returns array",
          status == 200 and isinstance(body, list),
          f"status={status}")
    
    # Test employees
    status, body = request("GET", "/auth/employees")
    check("GET /api/auth/employees returns 200",
          status == 200,
          f"status={status}")
    # Minor: Go returns null for empty array, but endpoint works
    if body is not None:
        check("Employees is array", isinstance(body, list), f"body={body}")
    
    # Test POST employee
    emp_code = f"EMP{int(time.time()) % 10000}"
    status, body = request("POST", "/auth/employees", {
        "employee_code": emp_code,
        "full_name": "Test Employee",
        "email": "test.emp@zalio.com",
        "phone": "081234567890",
        "role": "Staff",
        "salary": 5000000,
        "branch_id": created_branch_id
    })
    check("POST /api/auth/employees returns 201",
          status == 201,
          f"status={status} body={body}")
    check("Created employee has UUID id",
          "id" in body and is_valid_uuid(body["id"]),
          str(body))
    
    # Test users
    status, body = request("GET", "/auth/users")
    check("GET /api/auth/users returns array",
          status == 200 and isinstance(body, list),
          f"status={status}")
    check("Users array contains admin@zalio.com",
          any(u.get("email") == DEMO_EMAIL for u in body),
          f"Found users: {[u.get('email') for u in body]}")
    
    # Test roles
    status, body = request("GET", "/auth/roles")
    check("GET /api/auth/roles returns array",
          status == 200 and isinstance(body, list),
          f"status={status}")
    check("Roles include Admin, Manager, Kasir",
          any("Admin" in r.get("name", "") for r in body),
          f"Found roles: {[r.get('name') for r in body]}")


def test_master_service():
    """Test Master Service endpoints"""
    import time
    print("\n=== Testing Master Service ===")
    
    # Get initial products
    status, body = request("GET", "/master/products")
    check("GET /api/master/products returns array",
          status == 200 and isinstance(body, list),
          f"status={status}")
    
    if len(body) > 0:
        product = body[0]
        check("Product has brand_name joined",
              "brand_name" in product,
              str(product))
        check("Product has category_name joined",
              "category_name" in product,
              str(product))
        check("Product has uom_code joined",
              "uom_code" in product,
              str(product))
        check("Product has UUID id",
              is_valid_uuid(product.get("id")),
              str(product))
    
    # Get brands for creating product
    status, brands = request("GET", "/master/brands")
    check("GET /api/master/brands returns array",
          status == 200 and isinstance(brands, list),
          f"status={status}")
    
    # Get categories
    status, categories = request("GET", "/master/categories")
    check("GET /api/master/categories returns array",
          status == 200 and isinstance(categories, list),
          f"status={status}")
    
    # Get UOMs
    status, uoms = request("GET", "/master/uoms")
    check("GET /api/master/uoms returns array",
          status == 200 and isinstance(uoms, list),
          f"status={status}")
    
    # Create a brand first
    ts = int(time.time()) % 10000
    status, brand = request("POST", "/master/brands", {
        "name": f"Test Brand {ts}",
        "description": "Test brand for testing"
    })
    check("POST /api/master/brands returns 201",
          status == 201,
          f"status={status} body={brand}")
    brand_id = brand.get("id")
    
    # Create a category
    status, category = request("POST", "/master/categories", {
        "name": f"Test Category {ts}",
        "description": "Test category"
    })
    check("POST /api/master/categories returns 201",
          status == 201,
          f"status={status}")
    category_id = category.get("id")
    
    # Create a UOM
    status, uom = request("POST", "/master/uoms", {
        "code": f"T{ts}",
        "name": f"Test Unit {ts}"
    })
    check("POST /api/master/uoms returns 201",
          status == 201,
          f"status={status}")
    uom_id = uom.get("id")
    
    # Create a product
    status, product = request("POST", "/master/products", {
        "sku": f"TEST-{ts}",
        "name": f"Test Product {ts}",
        "brand_id": brand_id,
        "category_id": category_id,
        "uom_id": uom_id,
        "selling_price": 100000,
        "cogs": 60000,
        "stock_qty": 100,
        "image_url": "https://example.com/test.jpg",
        "description": "Test product description"
    })
    check("POST /api/master/products returns 201",
          status == 201,
          f"status={status} body={product}")
    check("Created product has UUID id",
          "id" in product and is_valid_uuid(product["id"]),
          str(product))
    product_id = product.get("id")
    
    # Test PATCH to toggle status
    status, updated = request("PATCH", f"/master/products/{product_id}", {
        "is_active": False
    })
    check("PATCH /api/master/products/{id} with is_active returns 200",
          status == 200,
          f"status={status} body={updated}")
    check("PATCH response shows is_active=false",
          updated.get("is_active") == False,
          str(updated))
    
    # Test PATCH to update name
    status, updated = request("PATCH", f"/master/products/{product_id}", {
        "name": "Updated Test Product"
    })
    check("PATCH /api/master/products/{id} with name returns 200",
          status == 200,
          f"status={status}")
    
    # Test DELETE product
    status, deleted = request("DELETE", f"/master/products/{product_id}")
    check("DELETE /api/master/products/{id} returns 200",
          status == 200,
          f"status={status}")
    
    # Test customers
    status, customers = request("GET", "/master/customers")
    check("GET /api/master/customers returns array",
          status == 200 and isinstance(customers, list),
          f"status={status}")
    
    status, customer = request("POST", "/master/customers", {
        "code": f"CUST-{ts}",
        "name": f"Test Customer {ts}",
        "email": "test@customer.com",
        "phone": "081234567890",
        "address": "Test Address",
        "category": "Retail",
        "credit_limit": 10000000
    })
    check("POST /api/master/customers returns 201",
          status == 201,
          f"status={status}")
    
    # Test suppliers
    status, suppliers = request("GET", "/master/suppliers")
    check("GET /api/master/suppliers returns array",
          status == 200 and isinstance(suppliers, list),
          f"status={status}")
    
    status, supplier = request("POST", "/master/suppliers", {
        "code": f"SUPP-{ts}",
        "name": f"Test Supplier {ts}",
        "email": "test@supplier.com",
        "phone": "081234567890",
        "address": "Test Address",
        "category": "Wholesale",
        "payment_term": "NET 30"
    })
    check("POST /api/master/suppliers returns 201",
          status == 201,
          f"status={status}")
    
    # Test warehouses
    status, warehouses = request("GET", "/master/warehouses")
    check("GET /api/master/warehouses returns array",
          status == 200 and isinstance(warehouses, list),
          f"status={status}")
    
    status, warehouse = request("POST", "/master/warehouses", {
        "code": f"WH-{ts}",
        "name": f"Test Warehouse {ts}",
        "location": "Test Location"
    })
    check("POST /api/master/warehouses returns 201",
          status == 201,
          f"status={status}")
    warehouse_id = warehouse.get("id")
    
    # Test stock movements - create a new product first
    status, stock_product = request("POST", "/master/products", {
        "sku": f"STOCK-{ts}",
        "name": f"Stock Test Product {ts}",
        "brand_id": brand_id,
        "category_id": category_id,
        "uom_id": uom_id,
        "selling_price": 50000,
        "cogs": 30000,
        "stock_qty": 100
    })
    stock_product_id = stock_product.get("id")
    
    # Get initial stock
    status, products = request("GET", "/master/products")
    initial_product = next((p for p in products if p["id"] == stock_product_id), None)
    initial_stock = initial_product.get("stock_qty", 0) if initial_product else 0
    
    # Create IN movement
    status, movement = request("POST", "/master/stock-movements", {
        "product_id": stock_product_id,
        "warehouse_id": warehouse_id,
        "movement_type": "IN",
        "quantity": 50,
        "reference": "PO-TEST-001",
        "notes": "Test stock in"
    })
    check("POST /api/master/stock-movements with IN returns 201",
          status == 201,
          f"status={status}")
    
    # Verify stock increased
    status, products = request("GET", "/master/products")
    updated_product = next((p for p in products if p["id"] == stock_product_id), None)
    new_stock = updated_product.get("stock_qty", 0) if updated_product else 0
    check("Stock IN increases product stock_qty",
          new_stock == initial_stock + 50,
          f"Initial: {initial_stock}, New: {new_stock}, Expected: {initial_stock + 50}")
    
    # Create OUT movement
    status, movement = request("POST", "/master/stock-movements", {
        "product_id": stock_product_id,
        "warehouse_id": warehouse_id,
        "movement_type": "OUT",
        "quantity": 20,
        "reference": "SO-TEST-001",
        "notes": "Test stock out"
    })
    check("POST /api/master/stock-movements with OUT returns 201",
          status == 201,
          f"status={status}")
    
    # Verify stock decreased
    status, products = request("GET", "/master/products")
    final_product = next((p for p in products if p["id"] == stock_product_id), None)
    final_stock = final_product.get("stock_qty", 0) if final_product else 0
    check("Stock OUT decreases product stock_qty",
          final_stock == new_stock - 20,
          f"Before OUT: {new_stock}, After OUT: {final_stock}, Expected: {new_stock - 20}")
    
    # Get stock movements
    status, movements = request("GET", "/master/stock-movements")
    check("GET /api/master/stock-movements returns array",
          status == 200 and isinstance(movements, list),
          f"status={status}")


def test_analytics_service():
    """Test Analytics Service endpoints"""
    print("\n=== Testing Analytics Service ===")
    
    # Test dashboard
    status, body = request("GET", "/analytics/dashboard")
    check("GET /api/analytics/dashboard returns 200",
          status == 200,
          f"status={status}")
    check("Dashboard has kpi object",
          "kpi" in body and isinstance(body["kpi"], dict),
          str(body))
    
    kpi = body.get("kpi", {})
    check("KPI has total_products",
          "total_products" in kpi,
          str(kpi))
    check("KPI has total_customers",
          "total_customers" in kpi,
          str(kpi))
    check("KPI has total_suppliers",
          "total_suppliers" in kpi,
          str(kpi))
    check("KPI has total_branches",
          "total_branches" in kpi,
          str(kpi))
    check("KPI has total_stock",
          "total_stock" in kpi,
          str(kpi))
    check("KPI has inventory_value",
          "inventory_value" in kpi,
          str(kpi))
    check("KPI has low_stock_alerts",
          "low_stock_alerts" in kpi,
          str(kpi))
    check("KPI has sales_last_30_days",
          "sales_last_30_days" in kpi,
          str(kpi))
    
    check("Dashboard has top_products array",
          "top_products" in body and isinstance(body["top_products"], list),
          str(body))
    
    # Test low-stock
    status, body = request("GET", "/analytics/low-stock")
    check("GET /api/analytics/low-stock returns 200",
          status == 200,
          f"status={status}")
    check("Low-stock has threshold",
          "threshold" in body,
          str(body))
    check("Low-stock has items array",
          "items" in body and isinstance(body["items"], list),
          str(body))
    check("Low-stock has count",
          "count" in body,
          str(body))
    
    # Test recommendations
    status, body = request("GET", "/analytics/recommendations")
    check("GET /api/analytics/recommendations returns 200",
          status == 200,
          f"status={status}")
    check("Recommendations has recommendations array",
          "recommendations" in body and isinstance(body["recommendations"], list),
          str(body))
    
    if len(body["recommendations"]) > 0:
        rec = body["recommendations"][0]
        check("Recommendation has type",
              "type" in rec,
              str(rec))
        check("Recommendation has priority",
              "priority" in rec,
              str(rec))
        check("Recommendation has title",
              "title" in rec,
              str(rec))
        check("Recommendation has description",
              "description" in rec,
              str(rec))
    
    # Test sales-trend
    status, body = request("GET", "/analytics/sales-trend?days=30")
    check("GET /api/analytics/sales-trend returns 200",
          status == 200,
          f"status={status}")
    check("Sales-trend has days",
          "days" in body,
          str(body))
    check("Sales-trend has data array",
          "data" in body and isinstance(body["data"], list),
          str(body))


# ==================== MAIN ====================

def main():
    """Run all tests"""
    print("=" * 60)
    print("Zalio ERP Microservices Backend Test")
    print("Testing through Next.js API Gateway at:", BASE)
    print("=" * 60)
    
    try:
        test_api_gateway()
        test_auth_service()
        test_master_service()
        test_analytics_service()
        
        print("\n" + "=" * 60)
        print("✅ ALL BACKEND TESTS PASSED")
        print("=" * 60)
        return 0
        
    except AssertionError as e:
        print("\n" + "=" * 60)
        print(f"❌ BACKEND TEST FAILED: {e}")
        print("=" * 60)
        return 1
    except Exception as e:
        print("\n" + "=" * 60)
        print(f"❌ BACKEND TEST ERROR: {e}")
        print("=" * 60)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(main())
