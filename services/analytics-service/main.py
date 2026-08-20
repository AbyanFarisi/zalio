"""Zalio Analytics Service (Python + FastAPI)
Provides dashboard KPIs, product recommendations, and sales analysis.
"""
import os
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
import psycopg2.extras
from collections import defaultdict

DATABASE_URL = os.getenv("POSTGRES_URL", "postgresql://zalio:zalio123@localhost:5432/zalio")

app = FastAPI(title="Zalio Analytics Service", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_conn():
    return psycopg2.connect(DATABASE_URL)


@app.get("/health")
def health():
    return {"service": "analytics-service", "status": "ok"}


@app.get("/analytics/dashboard")
def dashboard():
    """Return KPI summary for dashboard."""
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT COUNT(*) AS c FROM products WHERE is_active=TRUE")
            products = cur.fetchone()["c"]
            cur.execute("SELECT COUNT(*) AS c FROM customers WHERE is_active=TRUE")
            customers = cur.fetchone()["c"]
            cur.execute("SELECT COUNT(*) AS c FROM suppliers WHERE is_active=TRUE")
            suppliers = cur.fetchone()["c"]
            cur.execute("SELECT COUNT(*) AS c FROM branches WHERE is_active=TRUE")
            branches = cur.fetchone()["c"]
            cur.execute("SELECT COALESCE(SUM(stock_qty),0) AS s FROM products")
            total_stock = float(cur.fetchone()["s"] or 0)
            cur.execute("SELECT COALESCE(SUM(stock_qty * selling_price),0) AS v FROM products")
            inv_value = float(cur.fetchone()["v"] or 0)
            cur.execute("SELECT COUNT(*) AS c FROM products WHERE stock_qty < 50 AND is_active=TRUE")
            low_stock = cur.fetchone()["c"]
            cur.execute("SELECT COALESCE(SUM(total),0) AS s FROM sales_orders WHERE order_date >= CURRENT_DATE - INTERVAL '30 days'")
            sales_30d = float(cur.fetchone()["s"] or 0)
            # Top products by stock value
            cur.execute("""
                SELECT p.name, p.sku, p.stock_qty, p.selling_price,
                       (p.stock_qty * p.selling_price) AS value
                FROM products p WHERE p.is_active=TRUE
                ORDER BY value DESC LIMIT 5
            """)
            top_products = [dict(r) for r in cur.fetchall()]
            for p in top_products:
                p["stock_qty"] = float(p["stock_qty"])
                p["selling_price"] = float(p["selling_price"])
                p["value"] = float(p["value"])

    return {
        "kpi": {
            "total_products": products,
            "total_customers": customers,
            "total_suppliers": suppliers,
            "total_branches": branches,
            "total_stock": total_stock,
            "inventory_value": inv_value,
            "low_stock_alerts": low_stock,
            "sales_last_30_days": sales_30d,
        },
        "top_products": top_products,
    }


@app.get("/analytics/low-stock")
def low_stock(threshold: float = 50):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT p.id, p.sku, p.name, p.stock_qty, p.selling_price,
                       COALESCE(b.name,'') AS brand, COALESCE(c.name,'') AS category
                FROM products p
                LEFT JOIN brands b ON p.brand_id = b.id
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.stock_qty < %s AND p.is_active=TRUE
                ORDER BY p.stock_qty ASC
                LIMIT 50
            """, (threshold,))
            rows = [dict(r) for r in cur.fetchall()]
            for r in rows:
                r["stock_qty"] = float(r["stock_qty"])
                r["selling_price"] = float(r["selling_price"])
    return {"threshold": threshold, "items": rows, "count": len(rows)}


@app.get("/analytics/recommendations")
def recommendations():
    """Simple heuristic recommendations for restock, pricing, and category performance."""
    recs: List[Dict[str, Any]] = []
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Restock recommendation: stock < 50
            cur.execute("SELECT sku, name, stock_qty FROM products WHERE stock_qty < 50 AND is_active=TRUE ORDER BY stock_qty ASC LIMIT 5")
            for row in cur.fetchall():
                recs.append({
                    "type": "restock",
                    "priority": "high" if float(row["stock_qty"]) < 20 else "medium",
                    "title": f"Segera restock: {row['name']}",
                    "description": f"SKU {row['sku']} tinggal {float(row['stock_qty']):.0f} unit. Buat purchase order.",
                })
            # Margin analysis: cogs > 80% of selling price
            cur.execute("SELECT sku, name, selling_price, cogs FROM products WHERE selling_price > 0 AND (cogs / selling_price) > 0.8 AND is_active=TRUE LIMIT 3")
            for row in cur.fetchall():
                margin = (float(row["selling_price"]) - float(row["cogs"])) / float(row["selling_price"]) * 100
                recs.append({
                    "type": "pricing",
                    "priority": "medium",
                    "title": f"Margin tipis: {row['name']}",
                    "description": f"Margin hanya {margin:.1f}%. Pertimbangkan naikkan harga atau nego supplier.",
                })
            # Category dominance
            cur.execute("""
                SELECT COALESCE(c.name,'Tanpa Kategori') AS category, COUNT(*) AS n
                FROM products p LEFT JOIN categories c ON p.category_id=c.id
                WHERE p.is_active=TRUE
                GROUP BY c.name ORDER BY n DESC LIMIT 1
            """)
            row = cur.fetchone()
            if row:
                recs.append({
                    "type": "insight",
                    "priority": "low",
                    "title": f"Kategori dominan: {row['category']}",
                    "description": f"Ada {row['n']} produk. Diversifikasi bisa memperluas market.",
                })
    if not recs:
        recs.append({
            "type": "info",
            "priority": "low",
            "title": "Semua indikator stabil",
            "description": "Tidak ada rekomendasi urgent saat ini.",
        })
    return {"recommendations": recs, "generated_at": "now"}


@app.get("/analytics/sales-trend")
def sales_trend(days: int = 30):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT DATE(order_date) AS d, COALESCE(SUM(total),0) AS total
                FROM sales_orders
                WHERE order_date >= CURRENT_DATE - (%s || ' days')::interval
                GROUP BY DATE(order_date) ORDER BY d
            """, (days,))
            rows = [{"date": str(r["d"]), "total": float(r["total"])} for r in cur.fetchall()]
    return {"days": days, "data": rows}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8083")))
