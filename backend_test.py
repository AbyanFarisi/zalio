import json
import os
import urllib.error
import urllib.request
from uuid import UUID

BASE = os.environ.get("NEXT_PUBLIC_BASE_URL", "https://erp-fullstack-next.preview.emergentagent.com").rstrip("/") + "/api"


def request(method, path, payload=None):
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(BASE + path, data=data, method=method, headers={"Content-Type": "application/json"})
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


def check(name, condition, detail):
    if not condition:
        raise AssertionError(f"{name}: {detail}")
    print(f"PASS: {name}")


def main():
    created_id = None
    try:
        status, body = request("GET", "/")
        check("GET /api/ root", status == 200 and body.get("message"), f"status={status} body={body}")
        status, rows = request("GET", "/products")
        check("GET products", status == 200 and isinstance(rows, list), f"status={status} body={rows}")
        check("products omit Mongo _id", all("_id" not in row for row in rows), str(rows))
        status, body = request("POST", "/products", {"name": "Kopi Arabika Premium", "brand": "Nusantara", "category": "Minuman", "price": 45000, "cost": 28000})
        check("POST valid product", status == 201 and body.get("name") == "Kopi Arabika Premium", f"status={status} body={body}")
        created_id = body.get("id")
        check("product uses UUID", bool(created_id) and UUID(created_id), str(body))
        check("POST response omit Mongo _id", "_id" not in body, str(body))
        status, body = request("POST", "/products", {"brand": "Tanpa Nama"})
        check("POST missing name returns 400", status == 400, f"status={status} body={body}")
        status, body = request("PATCH", f"/products/{created_id}", {"active": False})
        check("PATCH toggles active", status == 200 and body.get("active") is False, f"status={status} body={body}")
        check("PATCH response omit Mongo _id", "_id" not in body, str(body))
        status, body = request("DELETE", f"/products/{created_id}")
        check("DELETE product", status == 200 and body.get("deleted") is True, f"status={status} body={body}")
        status, body = request("DELETE", f"/products/{created_id}")
        check("DELETE missing product is safe", status == 200 and body.get("deleted") is False, f"status={status} body={body}")
        print("BACKEND TEST RESULT: PASS")
    except Exception as exc:
        print(f"BACKEND TEST RESULT: FAIL: {exc}")
        raise


if __name__ == "__main__":
    main()
