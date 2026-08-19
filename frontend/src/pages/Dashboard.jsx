import { useMemo, useState } from "react";
import { Terminal, LogOut, Server } from "lucide-react";
import { useAuth } from "@/auth";
import { routes, gatewayURL } from "@/api";
import DomainPanel from "@/components/DomainPanel";

const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const shortDate = (s) => (s ? new Date(s).toLocaleString("id-ID") : "-");

const TABS = [
  { id: "users", label: "Identity", port: 8081 },
  { id: "products", label: "Product", port: 8082 },
  { id: "stocks", label: "Inventory", port: 8083 },
  { id: "orders", label: "Sales", port: 8084 },
  { id: "transactions", label: "Finance", port: 8085 },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [active, setActive] = useState("users");

  const panels = useMemo(
    () => ({
      users: (
        <DomainPanel
          title="Users"
          listPath={routes.users}
          itemPath={() => ""}
          readOnly
          columns={[
            { key: "id", label: "ID" },
            { key: "email", label: "Email" },
            { key: "name", label: "Name" },
            { key: "role", label: "Role" },
            { key: "created_at", label: "Created", format: shortDate },
          ]}
          fields={[]}
        />
      ),
      products: (
        <DomainPanel
          title="Products"
          listPath={routes.products}
          itemPath={routes.product}
          emptyPayload={{ name: "", description: "", price: 0 }}
          columns={[
            { key: "id", label: "ID" },
            { key: "name", label: "Name" },
            { key: "description", label: "Description" },
            { key: "price", label: "Price", format: rupiah },
            { key: "created_at", label: "Created", format: shortDate },
          ]}
          fields={[
            { key: "name", label: "name", required: true },
            { key: "description", label: "description" },
            { key: "price", label: "price (IDR)", type: "number" },
          ]}
        />
      ),
      stocks: (
        <DomainPanel
          title="Stocks"
          listPath={routes.stocks}
          itemPath={routes.stock}
          emptyPayload={{ product_id: "", warehouse: "", quantity: 0 }}
          columns={[
            { key: "id", label: "ID" },
            { key: "product_id", label: "Product" },
            { key: "warehouse", label: "Warehouse" },
            { key: "quantity", label: "Qty" },
            { key: "updated_at", label: "Updated", format: shortDate },
          ]}
          fields={[
            { key: "product_id", label: "product_id", required: true },
            { key: "warehouse", label: "warehouse", required: true },
            { key: "quantity", label: "quantity", type: "number" },
          ]}
        />
      ),
      orders: (
        <DomainPanel
          title="Orders"
          listPath={routes.orders}
          itemPath={routes.order}
          emptyPayload={{ customer_name: "", total: 0, status: "pending" }}
          columns={[
            { key: "id", label: "ID" },
            { key: "customer_name", label: "Customer" },
            { key: "total", label: "Total", format: rupiah },
            { key: "status", label: "Status" },
            { key: "created_at", label: "Created", format: shortDate },
          ]}
          fields={[
            { key: "customer_name", label: "customer_name", required: true },
            { key: "total", label: "total (IDR)", type: "number" },
            { key: "status", label: "status", options: ["pending", "paid", "cancelled"] },
          ]}
        />
      ),
      transactions: (
        <DomainPanel
          title="Transactions"
          listPath={routes.transactions}
          itemPath={routes.transaction}
          emptyPayload={{ ref_type: "", ref_id: "", amount: 0, type: "credit" }}
          columns={[
            { key: "id", label: "ID" },
            { key: "ref_type", label: "Ref Type" },
            { key: "ref_id", label: "Ref ID" },
            { key: "amount", label: "Amount", format: rupiah },
            { key: "type", label: "Type" },
            { key: "created_at", label: "Created", format: shortDate },
          ]}
          fields={[
            { key: "ref_type", label: "ref_type", required: true },
            { key: "ref_id", label: "ref_id", required: true },
            { key: "amount", label: "amount", type: "number" },
            { key: "type", label: "type", options: ["credit", "debit"], required: true },
          ]}
        />
      ),
    }),
    []
  );

  return (
    <div className="min-h-screen bg-[#0b0d10] text-neutral-100">
      {/* Top bar */}
      <header className="border-b border-neutral-800 bg-[#0b0d10]/95 sticky top-0 z-40 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="h-5 w-5 text-amber-400" />
            <div>
              <div className="font-mono text-[11px] tracking-widest text-amber-400">
                MICROSERVICES/OPS
              </div>
              <div className="font-mono text-[10px] text-neutral-500">
                {gatewayURL}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div
                data-testid="current-user-email"
                className="font-mono text-xs text-neutral-300"
              >
                {user?.email}
              </div>
              <div className="font-mono text-[10px] text-neutral-500">
                role: {user?.role}
              </div>
            </div>
            <button
              onClick={logout}
              data-testid="logout-button"
              className="inline-flex items-center gap-1.5 border border-neutral-800 hover:border-amber-400 hover:text-amber-400 text-neutral-300 text-xs font-mono px-3 py-1.5 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              logout
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="border-b border-neutral-800">
        <div className="mx-auto max-w-7xl px-6 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              data-testid={`tab-${t.id}`}
              onClick={() => setActive(t.id)}
              className={`relative flex items-center gap-2 px-4 py-3 font-mono text-xs transition-colors ${
                active === t.id
                  ? "text-amber-400"
                  : "text-neutral-500 hover:text-neutral-200"
              }`}
            >
              <Server className="h-3.5 w-3.5" />
              {t.label}
              <span className="text-[10px] text-neutral-600">:{t.port}</span>
              {active === t.id && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-400" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {panels[active]}
      </main>

      <footer className="border-t border-neutral-900 mt-16">
        <div className="mx-auto max-w-7xl px-6 py-4 font-mono text-[10px] text-neutral-600 flex justify-between">
          <span>go microservices · gin · pgx · jwt hs256</span>
          <span>gateway {gatewayURL}</span>
        </div>
      </footer>
    </div>
  );
}
