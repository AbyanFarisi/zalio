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


@app.get("/analytics/charts")
def charts():
    """Bundle of chart data for dashboard visualizations."""
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Sales daily (14d)
            cur.execute("""
                SELECT to_char(DATE(order_date),'DD Mon') AS d, COALESCE(SUM(total),0) AS total
                FROM sales_orders WHERE order_date >= CURRENT_DATE - INTERVAL '14 days'
                GROUP BY DATE(order_date) ORDER BY DATE(order_date)
            """)
            sales_daily = [{"label": r["d"], "value": float(r["total"])} for r in cur.fetchall()]
            # Purchase daily (14d)
            cur.execute("""
                SELECT to_char(DATE(order_date),'DD Mon') AS d, COALESCE(SUM(total),0) AS total
                FROM purchase_orders WHERE order_date >= CURRENT_DATE - INTERVAL '14 days'
                GROUP BY DATE(order_date) ORDER BY DATE(order_date)
            """)
            purchase_daily = [{"label": r["d"], "value": float(r["total"])} for r in cur.fetchall()]
            # Category distribution (product value per category)
            cur.execute("""
                SELECT COALESCE(c.name,'Lainnya') AS name, COUNT(*) AS n,
                       COALESCE(SUM(p.stock_qty*p.selling_price),0) AS value
                FROM products p LEFT JOIN categories c ON p.category_id=c.id
                WHERE p.is_active=TRUE GROUP BY c.name ORDER BY value DESC LIMIT 8
            """)
            category_dist = [{"name": r["name"], "count": int(r["n"]), "value": float(r["value"])} for r in cur.fetchall()]
            # Stock status buckets
            cur.execute("""
                SELECT
                  COUNT(*) FILTER (WHERE stock_qty <= 0) AS out_stock,
                  COUNT(*) FILTER (WHERE stock_qty > 0 AND stock_qty < COALESCE(reorder_point,20)) AS low_stock,
                  COUNT(*) FILTER (WHERE stock_qty >= COALESCE(reorder_point,20)) AS in_stock
                FROM products WHERE is_active=TRUE
            """)
            r = cur.fetchone()
            stock_status = [
                {"name": "Aman", "value": int(r["in_stock"] or 0)},
                {"name": "Menipis", "value": int(r["low_stock"] or 0)},
                {"name": "Habis", "value": int(r["out_stock"] or 0)},
            ]
            # Top products by stock value
            cur.execute("""
                SELECT name, (stock_qty*selling_price) AS value FROM products
                WHERE is_active=TRUE ORDER BY value DESC LIMIT 6
            """)
            top_products = [{"name": r["name"], "value": float(r["value"])} for r in cur.fetchall()]
    return {
        "sales_daily": sales_daily,
        "purchase_daily": purchase_daily,
        "category_distribution": category_dist,
        "stock_status": stock_status,
        "top_products": top_products,
    }


@app.get("/analytics/activity-summary")
def activity_summary():
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT COUNT(*) AS c FROM activity_logs")
            total = cur.fetchone()["c"]
            cur.execute("SELECT COUNT(*) AS c FROM activity_logs WHERE DATE(created_at)=CURRENT_DATE")
            today = cur.fetchone()["c"]
            cur.execute("SELECT COALESCE(action,'') AS action, COUNT(*) AS n FROM activity_logs GROUP BY action ORDER BY n DESC")
            by_action = [{"name": r["action"], "value": int(r["n"])} for r in cur.fetchall()]
            cur.execute("SELECT COALESCE(module,'') AS module, COUNT(*) AS n FROM activity_logs GROUP BY module ORDER BY n DESC LIMIT 8")
            by_module = [{"name": r["module"], "value": int(r["n"])} for r in cur.fetchall()]
            cur.execute("""
                SELECT to_char(DATE(created_at),'DD Mon') AS d, COUNT(*) AS n
                FROM activity_logs WHERE created_at >= CURRENT_DATE - INTERVAL '14 days'
                GROUP BY DATE(created_at) ORDER BY DATE(created_at)
            """)
            trend = [{"label": r["d"], "value": int(r["n"])} for r in cur.fetchall()]
    return {"total": total, "today": today, "by_action": by_action, "by_module": by_module, "trend": trend}


@app.get("/analytics/reorder")
def reorder():
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT p.sku, p.name, p.stock_qty, COALESCE(p.reorder_point,20) AS reorder_point,
                       COALESCE(b.name,'') AS brand, COALESCE(c.name,'') AS category
                FROM products p LEFT JOIN brands b ON p.brand_id=b.id
                LEFT JOIN categories c ON p.category_id=c.id
                WHERE p.stock_qty < COALESCE(p.reorder_point,20) AND p.is_active=TRUE
                ORDER BY (COALESCE(p.reorder_point,20)-p.stock_qty) DESC
            """)
            rows = []
            for r in cur.fetchall():
                d = dict(r)
                d["stock_qty"] = float(d["stock_qty"]); d["reorder_point"] = float(d["reorder_point"])
                d["suggested_qty"] = max(0, d["reorder_point"]*2 - d["stock_qty"])
                rows.append(d)
    return {"items": rows, "count": len(rows)}


@app.get("/analytics/stock-by-warehouse")
def stock_by_warehouse():
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT p.sku, p.name, p.stock_qty, p.selling_price,
                       (p.stock_qty*p.selling_price) AS value,
                       COALESCE(u.code,'') AS uom
                FROM products p LEFT JOIN uoms u ON p.uom_id=u.id
                WHERE p.is_active=TRUE ORDER BY value DESC
            """)
            rows = []
            for r in cur.fetchall():
                d = dict(r)
                d["stock_qty"] = float(d["stock_qty"]); d["selling_price"] = float(d["selling_price"]); d["value"] = float(d["value"])
                rows.append(d)
    return {"items": rows, "count": len(rows)}


@app.get("/analytics/product-performance")
def product_performance():
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT p.sku, p.name,
                       COALESCE(SUM(soi.quantity),0) AS qty_sold,
                       COALESCE(SUM(soi.subtotal),0) AS revenue
                FROM products p
                LEFT JOIN sales_order_items soi ON soi.product_id=p.id
                LEFT JOIN sales_orders so ON soi.order_id=so.id AND so.status IN ('CONFIRMED','INVOICED','PAID')
                WHERE p.is_active=TRUE
                GROUP BY p.id, p.sku, p.name ORDER BY revenue DESC LIMIT 50
            """)
            rows = []
            for r in cur.fetchall():
                d = dict(r); d["qty_sold"] = float(d["qty_sold"]); d["revenue"] = float(d["revenue"])
                rows.append(d)
    return {"items": rows, "count": len(rows)}


@app.get("/analytics/supplier-performance")
def supplier_performance():
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT s.code, s.name,
                       COUNT(po.id) AS po_count,
                       COALESCE(SUM(po.total),0) AS total_value
                FROM suppliers s
                LEFT JOIN purchase_orders po ON po.supplier_id=s.id AND po.status IN ('CONFIRMED')
                WHERE s.is_active=TRUE
                GROUP BY s.id, s.code, s.name ORDER BY total_value DESC LIMIT 50
            """)
            rows = []
            for r in cur.fetchall():
                d = dict(r); d["po_count"] = int(d["po_count"]); d["total_value"] = float(d["total_value"])
                rows.append(d)
    return {"items": rows, "count": len(rows)}


@app.get("/analytics/cash-flow")
def cash_flow():
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT to_char(DATE_TRUNC('month', trx_date),'Mon YYYY') AS period,
                       COALESCE(SUM(amount) FILTER (WHERE trx_type IN ('IN','MASUK','CREDIT')),0) AS inflow,
                       COALESCE(SUM(amount) FILTER (WHERE trx_type IN ('OUT','KELUAR','DEBIT','TRANSFER')),0) AS outflow
                FROM bank_transactions
                GROUP BY DATE_TRUNC('month', trx_date) ORDER BY DATE_TRUNC('month', trx_date)
            """)
            rows = []
            total_in = total_out = 0.0
            for r in cur.fetchall():
                inflow = float(r["inflow"]); outflow = float(r["outflow"])
                total_in += inflow; total_out += outflow
                rows.append({"label": r["period"], "inflow": inflow, "outflow": outflow, "net": inflow-outflow})
    return {"data": rows, "total_inflow": total_in, "total_outflow": total_out, "net": total_in-total_out}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8083")))
