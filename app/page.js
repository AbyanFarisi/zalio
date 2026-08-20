'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  LayoutDashboard, Building2, Wallet, ShoppingCart, ShoppingBag, Boxes,
  Package, Store, Settings, ChevronDown, ChevronRight, Search, Bell,
  LogOut, Plus, Edit2, Trash2, Filter, Download, Upload, X,
  TrendingUp, AlertCircle, Users, Truck, Warehouse, DollarSign,
  ChevronsLeft, ChevronsRight, Home, FileText, BarChart3, Sparkles
} from 'lucide-react';

const MENU = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, single: true },
  { key: 'company', label: 'Perusahaan', icon: Building2, children: [
      { key: 'branches', label: 'Cabang' }, { key: 'outlets', label: 'Outlet' },
      { key: 'employees', label: 'Karyawan' }, { key: 'roles', label: 'Peran Karyawan' },
      { key: 'salary', label: 'Gaji & Tunjangan', stub: true }, { key: 'tax', label: 'Pajak', stub: true },
      { key: 'payment-term', label: 'Termin Pembayaran', stub: true }, { key: 'period-end', label: 'Akhir Periode', stub: true },
      { key: 'activity-log', label: 'Log Aktivitas', stub: true },
  ]},
  { key: 'finance', label: 'Keuangan & Akuntansi', icon: Wallet, children: [
      { key: 'chart-of-accounts', label: 'Bagan Akun', stub: true }, { key: 'journal-voucher', label: 'Voucher Jurnal', stub: true },
      { key: 'cash-flow', label: 'Arus Kas', stub: true }, { key: 'bank-transfer', label: 'Transfer Bank', stub: true },
      { key: 'expense-accrual', label: 'Akrual Beban', stub: true }, { key: 'payroll', label: 'Payroll Karyawan', stub: true },
      { key: 'bank-history', label: 'Riwayat Bank', stub: true }, { key: 'bank-reconcile', label: 'Rekonsiliasi Bank', stub: true },
      { key: 'budget', label: 'Anggaran', stub: true },
  ]},
  { key: 'sales', label: 'Penjualan', icon: ShoppingCart, children: [
      { key: 'sales-transaction', label: 'Transaksi Penjualan', stub: true }, { key: 'sales-receipt', label: 'Penerimaan Penjualan', stub: true },
      { key: 'sales-dp', label: 'Uang Muka Penjualan', stub: true }, { key: 'sales-return', label: 'Retur Penjualan', stub: true },
      { key: 'customers', label: 'Pelanggan' }, { key: 'customer-category', label: 'Kategori Pelanggan', stub: true },
      { key: 'sales-category', label: 'Kategori Penjualan', stub: true }, { key: 'sales-target', label: 'Target Penjualan', stub: true },
      { key: 'price-adjustment', label: 'Penyesuaian Harga/Diskon', stub: true }, { key: 'sales-channel', label: 'Saluran Penjualan', stub: true },
  ]},
  { key: 'purchase', label: 'Pembelian', icon: ShoppingBag, children: [
      { key: 'purchase-transaction', label: 'Transaksi Pembelian', stub: true }, { key: 'purchase-payment', label: 'Pembayaran Pembelian', stub: true },
      { key: 'purchase-dp', label: 'Uang Muka Pembelian', stub: true }, { key: 'purchase-return', label: 'Retur Pembelian', stub: true },
      { key: 'purchase-receive', label: 'Penerimaan Pembelian', stub: true }, { key: 'suppliers', label: 'Pemasok' },
      { key: 'supplier-category', label: 'Kategori Pemasok', stub: true }, { key: 'supplier-price', label: 'Harga Pemasok', stub: true },
      { key: 'supplier-performance', label: 'Kinerja Pemasok', stub: true },
  ]},
  { key: 'inventory', label: 'Persediaan', icon: Boxes, children: [
      { key: 'stock-warehouse', label: 'Stok per Gudang', stub: true }, { key: 'stock-movement', label: 'Pergerakan Stok' },
      { key: 'stock-transfer', label: 'Transfer Stok', stub: true }, { key: 'stock-opname', label: 'Stok Opname', stub: true },
      { key: 'stock-adjustment', label: 'Penyesuaian Stok', stub: true }, { key: 'warehouses', label: 'Gudang & Lokasi' },
      { key: 'reorder-stock', label: 'Pemesanan Ulang Stok', stub: true },
  ]},
  { key: 'product', label: 'Produk', icon: Package, children: [
      { key: 'products', label: 'Produk' }, { key: 'brands', label: 'Merek' },
      { key: 'categories', label: 'Kategori' }, { key: 'subcategories', label: 'Sub Kategori', stub: true },
      { key: 'uoms', label: 'Satuan (UoM)' }, { key: 'product-performance', label: 'Kinerja Produk', stub: true },
  ]},
  { key: 'pos', label: 'Kasir POS', icon: Store, children: [
      { key: 'pos-setting', label: 'Pengaturan POS', stub: true }, { key: 'sales-type', label: 'Tipe Penjualan', stub: true },
      { key: 'expense-category', label: 'Kategori Beban', stub: true }, { key: 'promotion', label: 'Promosi', stub: true },
  ]},
  { key: 'setting', label: 'Pengaturan', icon: Settings, children: [
      { key: 'users', label: 'Pengguna' }, { key: 'user-roles', label: 'Peran Pengguna' },
      { key: 'preferences', label: 'Preferensi', stub: true }, { key: 'auto-number', label: 'Auto Number', stub: true },
  ]},
];

function findMenuItem(key) {
  for (const m of MENU) {
    if (m.key === key) return { parent: null, item: m };
    if (m.children) for (const c of m.children) if (c.key === key) return { parent: m, item: c };
  }
  return null;
}

async function api(path, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('zalio_token') : null;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const resp = await fetch(`/api${path}`, { ...options, headers });
  if (resp.status === 401) {
    if (typeof window !== 'undefined') { localStorage.removeItem('zalio_token'); localStorage.removeItem('zalio_user'); window.location.reload(); }
  }
  const text = await resp.text();
  try { return { ok: resp.ok, status: resp.status, data: text ? JSON.parse(text) : null }; }
  catch { return { ok: resp.ok, status: resp.status, data: text }; }
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('admin@zalio.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault(); setErr(''); setLoading(true);
    const r = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setLoading(false);
    if (!r.ok) { setErr(r.data?.error || 'Login gagal'); return; }
    localStorage.setItem('zalio_token', r.data.token);
    localStorage.setItem('zalio_user', JSON.stringify(r.data.user));
    toast.success(`Selamat datang, ${r.data.user.full_name}`);
    onLogin(r.data.user);
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 mb-3 shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Zalio ERP</h1>
            <p className="text-slate-500 text-sm mt-1">Sistem Manajemen Terpadu</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition" />
            </div>
            {err && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</div>}
            <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 text-white font-medium hover:from-teal-600 hover:to-teal-700 shadow-md disabled:opacity-50 transition">
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
          <div className="mt-5 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
            <p>Demo: <span className="font-mono">admin@zalio.com</span> / <span className="font-mono">admin123</span></p>
          </div>
        </div>
        <p className="text-center text-white/60 text-xs mt-6">Microservices: Go &bull; Next.js &bull; PostgreSQL &bull; Python Analytics</p>
      </div>
    </div>
  );
}

function Sidebar({ current, setCurrent, collapsed, setCollapsed }) {
  const [openGroups, setOpenGroups] = useState(() => {
    const found = findMenuItem(current);
    if (found?.parent) return { [found.parent.key]: true };
    return { product: true };
  });
  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-white border-r border-slate-200 flex flex-col transition-all duration-200 flex-shrink-0`}>
      <div className="h-16 flex items-center px-4 border-b border-slate-200">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-sm flex-shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (<div className="ml-3"><div className="font-bold text-slate-900 text-sm">Zalio ERP</div><div className="text-[10px] text-slate-500">Enterprise Suite</div></div>)}
      </div>
      <nav className="flex-1 overflow-y-auto sidebar-scroll py-3 px-2">
        {MENU.map(m => {
          const Icon = m.icon;
          const isActive = m.single ? current === m.key : m.children?.some(c => c.key === current);
          const isOpen = openGroups[m.key];
          if (m.single) return (
            <button key={m.key} onClick={() => setCurrent(m.key)} className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm mb-1 transition ${isActive ? 'bg-teal-50 text-teal-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
              {!collapsed && <span className="ml-3">{m.label}</span>}
            </button>
          );
          return (
            <div key={m.key} className="mb-1">
              <button onClick={() => setOpenGroups(g => ({ ...g, [m.key]: !g[m.key] }))} className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm transition ${isActive ? 'bg-teal-50 text-teal-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                {!collapsed && (<><span className="ml-3 flex-1 text-left">{m.label}</span><ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} /></>)}
              </button>
              {!collapsed && isOpen && m.children && (
                <div className="ml-4 mt-1 border-l border-slate-100 pl-3 space-y-0.5">
                  {m.children.map(c => (
                    <button key={c.key} onClick={() => setCurrent(c.key)} className={`w-full text-left px-3 py-1.5 rounded-md text-[13px] transition flex items-center justify-between ${current === c.key ? 'bg-teal-500 text-white font-medium shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                      <span>{c.label}</span>
                      {c.stub && <span className={`text-[9px] px-1.5 py-0.5 rounded ${current === c.key ? 'bg-white/20' : 'bg-slate-100 text-slate-400'}`}>soon</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-2">
        <button onClick={() => setCollapsed(c => !c)} className="w-full flex items-center justify-center py-2 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition">
          {collapsed ? <ChevronsRight className="w-4 h-4" /> : <><ChevronsLeft className="w-4 h-4 mr-2" />Ciutkan</>}
        </button>
      </div>
    </aside>
  );
}

function Header({ user, currentKey, branches, activeBranch, setActiveBranch, onLogout }) {
  const found = findMenuItem(currentKey);
  const parentLabel = found?.parent?.label;
  const itemLabel = found?.item?.label || currentKey;
  return (
    <header className="h-16 bg-slate-900 text-white flex items-center px-6 shadow-sm">
      <div className="flex items-center text-sm text-slate-300 flex-1">
        <Home className="w-4 h-4 mr-2 text-slate-400" />
        {parentLabel && <><span>{parentLabel}</span><ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-500" /></>}
        <span className="text-white font-medium">{itemLabel}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <select value={activeBranch?.id || ''} onChange={e => { const b = branches.find(x => x.id === e.target.value); setActiveBranch(b); if (b) toast.success(`Beralih ke ${b.name}`); }} className="bg-slate-800 border border-slate-700 rounded-lg text-white text-sm px-3 py-1.5 pr-8 hover:bg-slate-700 cursor-pointer outline-none appearance-none">
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <button className="w-9 h-9 rounded-lg hover:bg-slate-800 flex items-center justify-center transition"><Search className="w-4 h-4 text-slate-300" /></button>
        <button className="w-9 h-9 rounded-lg hover:bg-slate-800 flex items-center justify-center transition relative"><Bell className="w-4 h-4 text-slate-300" /><span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full"></span></button>
        <div className="h-8 w-px bg-slate-700"></div>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-xs font-bold">{user?.full_name?.charAt(0) || 'A'}</div>
          <div className="text-right hidden md:block"><div className="text-sm font-medium">{user?.full_name || 'Admin'}</div><div className="text-[11px] text-slate-400">{user?.role || 'Administrator'}</div></div>
          <button onClick={onLogout} className="w-9 h-9 rounded-lg hover:bg-slate-800 flex items-center justify-center transition ml-1" title="Keluar"><LogOut className="w-4 h-4 text-slate-300" /></button>
        </div>
      </div>
    </header>
  );
}

function Dashboard() {
  const [data, setData] = useState(null);
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    const [d, r] = await Promise.all([api('/analytics/dashboard'), api('/analytics/recommendations')]);
    if (d.ok) setData(d.data); if (r.ok) setRecs(r.data.recommendations || []);
    setLoading(false);
  })(); }, []);
  if (loading) return <div className="p-6 text-slate-500">Memuat data...</div>;
  const kpi = data?.kpi || {};
  const fmt = n => new Intl.NumberFormat('id-ID').format(n || 0);
  const fmtRp = n => 'Rp ' + fmt(n);
  const cards = [
    { label: 'Total Produk', value: fmt(kpi.total_products), icon: Package, color: 'from-blue-500 to-blue-600' },
    { label: 'Pelanggan', value: fmt(kpi.total_customers), icon: Users, color: 'from-purple-500 to-purple-600' },
    { label: 'Pemasok', value: fmt(kpi.total_suppliers), icon: Truck, color: 'from-orange-500 to-orange-600' },
    { label: 'Cabang', value: fmt(kpi.total_branches), icon: Building2, color: 'from-teal-500 to-teal-600' },
    { label: 'Total Stok', value: fmt(kpi.total_stock), icon: Warehouse, color: 'from-indigo-500 to-indigo-600' },
    { label: 'Nilai Inventaris', value: fmtRp(kpi.inventory_value), icon: DollarSign, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Stok Rendah', value: fmt(kpi.low_stock_alerts), icon: AlertCircle, color: 'from-red-500 to-red-600' },
    { label: 'Penjualan 30 Hari', value: fmtRp(kpi.sales_last_30_days), icon: TrendingUp, color: 'from-pink-500 to-pink-600' },
  ];
  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900">Dashboard</h1><p className="text-sm text-slate-500 mt-1">Ringkasan operasional Zalio ERP &mdash; data real-time dari Python Analytics Service</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c, i) => { const Icon = c.icon; return (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition">
            <div className="flex items-start justify-between">
              <div><div className="text-xs text-slate-500 font-medium uppercase tracking-wide">{c.label}</div><div className="text-xl font-bold text-slate-900 mt-2">{c.value}</div></div>
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${c.color} flex items-center justify-center shadow-sm`}><Icon className="w-5 h-5 text-white" /></div>
            </div>
          </div>
        );})}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-slate-900">Produk Nilai Tertinggi</h3><BarChart3 className="w-4 h-4 text-slate-400" /></div>
          <div className="space-y-2">
            {(data?.top_products || []).map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 font-bold text-xs flex items-center justify-center">{i + 1}</div>
                  <div><div className="text-sm font-medium text-slate-900">{p.name}</div><div className="text-xs text-slate-500">{p.sku} &bull; Stok: {fmt(p.stock_qty)}</div></div>
                </div>
                <div className="text-right"><div className="text-sm font-semibold text-slate-900">{fmtRp(p.value)}</div><div className="text-xs text-slate-500">@ {fmtRp(p.selling_price)}</div></div>
              </div>
            ))}
            {(!data?.top_products || data.top_products.length === 0) && <div className="text-center text-sm text-slate-400 py-6">Belum ada produk</div>}
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-slate-900">Rekomendasi AI</h3><Sparkles className="w-4 h-4 text-teal-500" /></div>
          <div className="space-y-2">
            {recs.map((r, i) => (
              <div key={i} className={`p-3 rounded-lg border-l-4 ${r.priority === 'high' ? 'bg-red-50 border-red-500' : r.priority === 'medium' ? 'bg-amber-50 border-amber-500' : 'bg-slate-50 border-slate-400'}`}>
                <div className="text-sm font-medium text-slate-900">{r.title}</div><div className="text-xs text-slate-600 mt-1">{r.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PageHeader({ title, breadcrumb, actions }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div><h1 className="text-xl font-bold text-slate-900">{title}</h1>{breadcrumb && <p className="text-xs text-slate-500 mt-1">{breadcrumb}</p>}</div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}

function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

function Field({ label, children, required }) { return (<div><label className="block text-xs font-medium text-slate-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>{children}</div>); }
function Input(props) { return <input {...props} className={`w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none text-sm ${props.className || ''}`} />; }
function TextArea(props) { return <textarea {...props} className={`w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none text-sm ${props.className || ''}`} />; }
function SelectFld({ children, ...props }) { return <select {...props} className={`w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none text-sm bg-white ${props.className || ''}`}>{children}</select>; }
function PrimaryButton({ children, ...props }) { return <button {...props} className={`px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium shadow-sm inline-flex items-center gap-2 disabled:opacity-50 transition ${props.className || ''}`}>{children}</button>; }
function GhostButton({ children, ...props }) { return <button {...props} className={`px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium inline-flex items-center gap-2 transition ${props.className || ''}`}>{children}</button>; }
function Toggle({ checked, onChange }) { return (<button onClick={() => onChange(!checked)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${checked ? 'bg-teal-500' : 'bg-slate-300'}`}><span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : 'translate-x-1'}`} /></button>); }

function ProductsPage() {
  const [items, setItems] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    const [p, b, c, u] = await Promise.all([api('/master/products'), api('/master/brands'), api('/master/categories'), api('/master/uoms')]);
    if (p.ok) setItems(p.data || []); if (b.ok) setBrands(b.data || []);
    if (c.ok) setCategories(c.data || []); if (u.ok) setUoms(u.data || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  const filtered = items.filter(x => !q || x.name?.toLowerCase().includes(q.toLowerCase()) || x.sku?.toLowerCase().includes(q.toLowerCase()));
  async function toggleActive(id, cur) {
    const r = await api(`/master/products/${id}`, { method: 'PATCH', body: JSON.stringify({ is_active: !cur }) });
    if (r.ok) { toast.success('Status diperbarui'); load(); } else toast.error(r.data?.error || 'Gagal update');
  }
  async function del(id) {
    if (!confirm('Hapus produk ini?')) return;
    const r = await api(`/master/products/${id}`, { method: 'DELETE' });
    if (r.ok) { toast.success('Produk dihapus'); load(); } else toast.error(r.data?.error || 'Gagal hapus');
  }
  return (
    <div className="p-6">
      <PageHeader title="Produk" breadcrumb="Manajemen Produk > Produk" actions={<>
        <GhostButton><Upload className="w-4 h-4" />Import</GhostButton>
        <GhostButton><Download className="w-4 h-4" />Export</GhostButton>
        <PrimaryButton onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="w-4 h-4" />Tambah Baru</PrimaryButton>
      </>} />
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Cari produk atau SKU..." value={q} onChange={e => setQ(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none text-sm" />
          </div>
          <GhostButton><Filter className="w-4 h-4" />Filter</GhostButton>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 text-xs text-slate-600 uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Produk</th><th className="text-left px-4 py-3 font-medium">Merek</th>
              <th className="text-left px-4 py-3 font-medium">Kategori</th><th className="text-right px-4 py-3 font-medium">Harga Jual</th>
              <th className="text-right px-4 py-3 font-medium">HPP</th><th className="text-right px-4 py-3 font-medium">Stok</th>
              <th className="text-center px-4 py-3 font-medium">Status</th><th className="text-center px-4 py-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading && <tr><td colSpan="8" className="text-center py-8 text-slate-400">Memuat...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan="8" className="text-center py-8 text-slate-400">Belum ada data</td></tr>}
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-slate-400" />}
                    </div>
                    <div><div className="font-medium text-slate-900">{p.name}</div><div className="text-xs text-slate-500">{p.sku} &bull; {p.uom_code}</div></div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700">{p.brand_name || '-'}</td>
                <td className="px-4 py-3 text-slate-700">{p.category_name || '-'}</td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">Rp {new Intl.NumberFormat('id-ID').format(p.selling_price)}</td>
                <td className="px-4 py-3 text-right text-slate-600">Rp {new Intl.NumberFormat('id-ID').format(p.cogs)}</td>
                <td className="px-4 py-3 text-right text-slate-700">{new Intl.NumberFormat('id-ID').format(p.stock_qty)}</td>
                <td className="px-4 py-3 text-center"><Toggle checked={p.is_active} onChange={() => toggleActive(p.id, p.is_active)} /></td>
                <td className="px-4 py-3 text-center">
                  <div className="inline-flex gap-1">
                    <button onClick={() => { setEditing(p); setShowForm(true); }} className="p-1.5 rounded hover:bg-slate-100 text-slate-500"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => del(p.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500"><span>Menampilkan {filtered.length} dari {items.length} produk</span></div>
      </div>
      <ProductForm open={showForm} onClose={() => setShowForm(false)} initial={editing} brands={brands} categories={categories} uoms={uoms} onSaved={() => { setShowForm(false); load(); }} />
    </div>
  );
}

function ProductForm({ open, onClose, initial, brands, categories, uoms, onSaved }) {
  const [form, setForm] = useState({ sku: '', name: '', brand_id: '', category_id: '', uom_id: '', selling_price: 0, cogs: 0, stock_qty: 0, image_url: '', description: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (initial) setForm({ sku: initial.sku || '', name: initial.name || '', brand_id: initial.brand_id || '', category_id: initial.category_id || '', uom_id: initial.uom_id || '', selling_price: initial.selling_price || 0, cogs: initial.cogs || 0, stock_qty: initial.stock_qty || 0, image_url: initial.image_url || '', description: initial.description || '' });
    else setForm({ sku: '', name: '', brand_id: '', category_id: '', uom_id: '', selling_price: 0, cogs: 0, stock_qty: 0, image_url: '', description: '' });
  }, [initial, open]);
  async function save() {
    setSaving(true);
    const path = initial ? `/master/products/${initial.id}` : '/master/products';
    const method = initial ? 'PATCH' : 'POST';
    const r = await api(path, { method, body: JSON.stringify(form) });
    setSaving(false);
    if (r.ok) { toast.success(initial ? 'Produk diperbarui' : 'Produk dibuat'); onSaved(); } else toast.error(r.data?.error || 'Gagal simpan');
  }
  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Produk' : 'Tambah Produk Baru'} footer={<><GhostButton onClick={onClose}>Batal</GhostButton><PrimaryButton onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</PrimaryButton></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="SKU" required><Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} /></Field>
        <Field label="Nama Produk" required><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Merek"><SelectFld value={form.brand_id} onChange={e => setForm({ ...form, brand_id: e.target.value })}><option value="">- Pilih -</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</SelectFld></Field>
        <Field label="Kategori"><SelectFld value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}><option value="">- Pilih -</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</SelectFld></Field>
        <Field label="Satuan (UoM)"><SelectFld value={form.uom_id} onChange={e => setForm({ ...form, uom_id: e.target.value })}><option value="">- Pilih -</option>{uoms.map(u => <option key={u.id} value={u.id}>{u.code} - {u.name}</option>)}</SelectFld></Field>
        <Field label="Stok Awal"><Input type="number" value={form.stock_qty} onChange={e => setForm({ ...form, stock_qty: parseFloat(e.target.value) || 0 })} /></Field>
        <Field label="Harga Jual (Rp)"><Input type="number" value={form.selling_price} onChange={e => setForm({ ...form, selling_price: parseFloat(e.target.value) || 0 })} /></Field>
        <Field label="HPP / COGS (Rp)"><Input type="number" value={form.cogs} onChange={e => setForm({ ...form, cogs: parseFloat(e.target.value) || 0 })} /></Field>
        <div className="col-span-2"><Field label="URL Gambar"><Input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." /></Field></div>
        <div className="col-span-2"><Field label="Deskripsi"><TextArea rows="2" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field></div>
      </div>
    </Modal>
  );
}

function MasterCRUD({ title, breadcrumb, endpoint, columns, formFields, extraFetch }) {
  const [items, setItems] = useState([]);
  const [extra, setExtra] = useState({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const load = useCallback(async () => {
    setLoading(true);
    const r = await api(endpoint);
    if (r.ok) setItems(r.data || []);
    if (extraFetch) {
      const ex = {};
      for (const [k, url] of Object.entries(extraFetch)) {
        if (!url) continue;
        const rr = await api(url);
        if (rr.ok) ex[k] = rr.data || [];
      }
      setExtra(ex);
    }
    setLoading(false);
  }, [endpoint, extraFetch]);
  useEffect(() => { load(); }, [load]);
  const filtered = items.filter(x => !q || Object.values(x).some(v => String(v).toLowerCase().includes(q.toLowerCase())));
  async function save() {
    const path = editing ? `${endpoint}/${editing.id}` : endpoint;
    const method = editing ? 'PATCH' : 'POST';
    const r = await api(path, { method, body: JSON.stringify(form) });
    if (r.ok) { toast.success(editing ? 'Data diperbarui' : 'Data dibuat'); setShowForm(false); load(); }
    else toast.error(r.data?.error || 'Gagal simpan');
  }
  async function del(id) {
    if (!confirm('Hapus data ini?')) return;
    const r = await api(`${endpoint}/${id}`, { method: 'DELETE' });
    if (r.ok) { toast.success('Data dihapus'); load(); } else toast.error(r.data?.error || 'Gagal hapus');
  }
  function openForm(item) {
    setEditing(item);
    if (item) { const init = {}; formFields.forEach(f => { init[f.key] = item[f.key] ?? ''; }); setForm(init); }
    else { const init = {}; formFields.forEach(f => { init[f.key] = f.default ?? ''; }); setForm(init); }
    setShowForm(true);
  }
  return (
    <div className="p-6">
      <PageHeader title={title} breadcrumb={breadcrumb} actions={<PrimaryButton onClick={() => openForm(null)}><Plus className="w-4 h-4" />Tambah Baru</PrimaryButton>} />
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Cari..." value={q} onChange={e => setQ(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none text-sm" />
          </div>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 text-xs text-slate-600 uppercase tracking-wide">
            <tr>{columns.map(c => <th key={c.key} className={`text-${c.align || 'left'} px-4 py-3 font-medium`}>{c.label}</th>)}<th className="text-center px-4 py-3 font-medium">Aksi</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading && <tr><td colSpan={columns.length + 1} className="text-center py-8 text-slate-400">Memuat...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={columns.length + 1} className="text-center py-8 text-slate-400">Belum ada data</td></tr>}
            {filtered.map(it => (
              <tr key={it.id} className="hover:bg-slate-50">
                {columns.map(c => (<td key={c.key} className={`px-4 py-3 text-${c.align || 'left'} text-slate-700`}>{c.render ? c.render(it) : String(it[c.key] ?? '-')}</td>))}
                <td className="px-4 py-3 text-center">
                  <div className="inline-flex gap-1">
                    <button onClick={() => openForm(it)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => del(it.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? `Edit ${title}` : `Tambah ${title}`} footer={<><GhostButton onClick={() => setShowForm(false)}>Batal</GhostButton><PrimaryButton onClick={save}>Simpan</PrimaryButton></>}>
        <div className="grid grid-cols-2 gap-3">
          {formFields.map(f => (
            <div key={f.key} className={f.full ? 'col-span-2' : ''}>
              <Field label={f.label} required={f.required}>
                {f.type === 'select' ? (
                  <SelectFld value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })}>
                    <option value="">- Pilih -</option>
                    {(extra[f.optionsKey] || f.options || []).map(o => (<option key={o.id || o.value} value={o.id || o.value}>{o.name || o.label}</option>))}
                  </SelectFld>
                ) : f.type === 'textarea' ? (
                  <TextArea rows="2" value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                ) : f.type === 'number' ? (
                  <Input type="number" value={form[f.key] || 0} onChange={e => setForm({ ...form, [f.key]: parseFloat(e.target.value) || 0 })} />
                ) : (
                  <Input value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                )}
              </Field>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function StubPage({ title, breadcrumb }) {
  return (
    <div className="p-6">
      <PageHeader title={title} breadcrumb={breadcrumb} />
      <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center mx-auto mb-4"><FileText className="w-8 h-8 text-teal-600" /></div>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Modul sedang dikembangkan</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">Fitur <span className="font-medium">{title}</span> akan segera hadir. Modul ini menjadi bagian dari roadmap microservices berikutnya dengan integrasi ke Go backend dan PostgreSQL.</p>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [current, setCurrent] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [branches, setBranches] = useState([]);
  const [activeBranch, setActiveBranch] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = localStorage.getItem('zalio_token');
    const u = localStorage.getItem('zalio_user');
    if (t && u) setUser(JSON.parse(u));
    setReady(true);
  }, []);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const r = await api('/auth/branches');
      if (r.ok) {
        setBranches(r.data || []);
        const saved = localStorage.getItem('zalio_active_branch');
        const found = r.data?.find(b => b.id === saved) || r.data?.[0];
        setActiveBranch(found);
      }
    })();
  }, [user]);
  useEffect(() => { if (activeBranch) localStorage.setItem('zalio_active_branch', activeBranch.id); }, [activeBranch]);
  if (!ready) return <div className="min-h-screen flex items-center justify-center text-slate-500">Memuat...</div>;
  if (!user) return <LoginPage onLogin={setUser} />;
  function logout() { localStorage.removeItem('zalio_token'); localStorage.removeItem('zalio_user'); setUser(null); toast.success('Berhasil keluar'); }
  const found = findMenuItem(current);
  const isStub = found?.item?.stub;
  const breadcrumb = found?.parent ? `${found.parent.label} > ${found.item.label}` : found?.item?.label;
  function renderContent() {
    if (current === 'dashboard') return <Dashboard />;
    if (isStub) return <StubPage title={found.item.label} breadcrumb={breadcrumb} />;
    if (current === 'products') return <ProductsPage />;
    if (current === 'brands') return <MasterCRUD title="Merek" breadcrumb="Manajemen Produk > Merek" endpoint="/master/brands" columns={[{ key: 'name', label: 'Nama' }, { key: 'description', label: 'Deskripsi' }]} formFields={[{ key: 'name', label: 'Nama Merek', required: true }, { key: 'description', label: 'Deskripsi', type: 'textarea', full: true }]} />;
    if (current === 'categories') return <MasterCRUD title="Kategori" breadcrumb="Manajemen Produk > Kategori" endpoint="/master/categories" columns={[{ key: 'name', label: 'Nama' }, { key: 'description', label: 'Deskripsi' }]} formFields={[{ key: 'name', label: 'Nama Kategori', required: true }, { key: 'description', label: 'Deskripsi', type: 'textarea', full: true }]} />;
    if (current === 'uoms') return <MasterCRUD title="Satuan (UoM)" breadcrumb="Manajemen Produk > UoM" endpoint="/master/uoms" columns={[{ key: 'code', label: 'Kode' }, { key: 'name', label: 'Nama' }]} formFields={[{ key: 'code', label: 'Kode', required: true }, { key: 'name', label: 'Nama Satuan', required: true }]} />;
    if (current === 'customers') return <MasterCRUD title="Pelanggan" breadcrumb="Penjualan > Pelanggan" endpoint="/master/customers"
      columns={[{ key: 'code', label: 'Kode' }, { key: 'name', label: 'Nama' }, { key: 'phone', label: 'Telepon' }, { key: 'category', label: 'Kategori' }, { key: 'credit_limit', label: 'Limit', align: 'right', render: r => 'Rp ' + new Intl.NumberFormat('id-ID').format(r.credit_limit || 0) }]}
      formFields={[{ key: 'code', label: 'Kode', required: true }, { key: 'name', label: 'Nama', required: true }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Telepon' }, { key: 'category', label: 'Kategori' }, { key: 'credit_limit', label: 'Limit Kredit', type: 'number' }, { key: 'address', label: 'Alamat', type: 'textarea', full: true }]} />;
    if (current === 'suppliers') return <MasterCRUD title="Pemasok" breadcrumb="Pembelian > Pemasok" endpoint="/master/suppliers"
      columns={[{ key: 'code', label: 'Kode' }, { key: 'name', label: 'Nama' }, { key: 'phone', label: 'Telepon' }, { key: 'category', label: 'Kategori' }, { key: 'payment_term', label: 'Termin' }]}
      formFields={[{ key: 'code', label: 'Kode', required: true }, { key: 'name', label: 'Nama', required: true }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Telepon' }, { key: 'category', label: 'Kategori' }, { key: 'payment_term', label: 'Termin Pembayaran' }, { key: 'address', label: 'Alamat', type: 'textarea', full: true }]} />;
    if (current === 'warehouses') return <MasterCRUD title="Gudang & Lokasi" breadcrumb="Persediaan > Gudang" endpoint="/master/warehouses"
      columns={[{ key: 'code', label: 'Kode' }, { key: 'name', label: 'Nama Gudang' }, { key: 'branch_name', label: 'Cabang' }, { key: 'location', label: 'Lokasi' }]}
      extraFetch={{ branches: '/auth/branches' }}
      formFields={[{ key: 'code', label: 'Kode', required: true }, { key: 'name', label: 'Nama Gudang', required: true }, { key: 'branch_id', label: 'Cabang', type: 'select', optionsKey: 'branches' }, { key: 'location', label: 'Lokasi', full: true }]} />;
    if (current === 'branches') return <MasterCRUD title="Cabang" breadcrumb="Perusahaan > Cabang" endpoint="/auth/branches"
      columns={[{ key: 'code', label: 'Kode' }, { key: 'name', label: 'Nama Cabang' }, { key: 'phone', label: 'Telepon' }, { key: 'address', label: 'Alamat' }]}
      formFields={[{ key: 'code', label: 'Kode', required: true }, { key: 'name', label: 'Nama Cabang', required: true }, { key: 'phone', label: 'Telepon' }, { key: 'address', label: 'Alamat', type: 'textarea', full: true }]} />;
    if (current === 'outlets') return <MasterCRUD title="Outlet" breadcrumb="Perusahaan > Outlet" endpoint="/auth/outlets"
      columns={[{ key: 'code', label: 'Kode' }, { key: 'name', label: 'Nama Outlet' }, { key: 'branch_name', label: 'Cabang' }, { key: 'address', label: 'Alamat' }]}
      extraFetch={{ branches: '/auth/branches' }}
      formFields={[{ key: 'branch_id', label: 'Cabang', type: 'select', optionsKey: 'branches', required: true }, { key: 'code', label: 'Kode', required: true }, { key: 'name', label: 'Nama Outlet', required: true }, { key: 'phone', label: 'Telepon' }, { key: 'address', label: 'Alamat', type: 'textarea', full: true }]} />;
    if (current === 'employees') return <MasterCRUD title="Karyawan" breadcrumb="Perusahaan > Karyawan" endpoint="/auth/employees"
      columns={[{ key: 'employee_code', label: 'Kode' }, { key: 'full_name', label: 'Nama' }, { key: 'role', label: 'Jabatan' }, { key: 'branch_name', label: 'Cabang' }, { key: 'salary', label: 'Gaji', align: 'right', render: r => 'Rp ' + new Intl.NumberFormat('id-ID').format(r.salary || 0) }]}
      extraFetch={{ branches: '/auth/branches' }}
      formFields={[{ key: 'employee_code', label: 'Kode Karyawan', required: true }, { key: 'full_name', label: 'Nama Lengkap', required: true }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Telepon' }, { key: 'role', label: 'Jabatan' }, { key: 'salary', label: 'Gaji', type: 'number' }, { key: 'branch_id', label: 'Cabang', type: 'select', optionsKey: 'branches' }]} />;
    if (current === 'users') return <MasterCRUD title="Pengguna" breadcrumb="Pengaturan > Pengguna" endpoint="/auth/users"
      columns={[{ key: 'email', label: 'Email' }, { key: 'full_name', label: 'Nama' }, { key: 'role', label: 'Peran' }, { key: 'branch_name', label: 'Cabang' }, { key: 'is_active', label: 'Aktif', render: r => r.is_active ? 'Ya' : 'Tidak' }]}
      formFields={[{ key: 'email', label: 'Email', required: true }, { key: 'full_name', label: 'Nama Lengkap', required: true }]} />;
    if (current === 'roles' || current === 'user-roles') return <MasterCRUD title="Peran Pengguna" breadcrumb="Pengaturan > Peran Pengguna" endpoint="/auth/roles"
      columns={[{ key: 'name', label: 'Peran' }, { key: 'description', label: 'Deskripsi' }]}
      formFields={[{ key: 'name', label: 'Nama Peran', required: true }, { key: 'description', label: 'Deskripsi', type: 'textarea', full: true }]} />;
    if (current === 'stock-movement') return <MasterCRUD title="Pergerakan Stok" breadcrumb="Persediaan > Pergerakan Stok" endpoint="/master/stock-movements"
      columns={[{ key: 'product_name', label: 'Produk' }, { key: 'product_sku', label: 'SKU' }, { key: 'warehouse_name', label: 'Gudang' }, { key: 'movement_type', label: 'Tipe' }, { key: 'quantity', label: 'Qty', align: 'right' }, { key: 'reference', label: 'Referensi' }]}
      extraFetch={{ products: '/master/products', warehouses: '/master/warehouses' }}
      formFields={[{ key: 'product_id', label: 'Produk', type: 'select', optionsKey: 'products', required: true }, { key: 'warehouse_id', label: 'Gudang', type: 'select', optionsKey: 'warehouses', required: true }, { key: 'movement_type', label: 'Tipe', type: 'select', options: [{ value: 'IN', name: 'IN - Masuk' }, { value: 'OUT', name: 'OUT - Keluar' }, { value: 'ADJUSTMENT', name: 'ADJUSTMENT - Penyesuaian' }], required: true }, { key: 'quantity', label: 'Qty', type: 'number', required: true }, { key: 'reference', label: 'Referensi' }, { key: 'notes', label: 'Catatan', type: 'textarea', full: true }]} />;
    return <StubPage title={found?.item?.label || current} breadcrumb={breadcrumb} />;
  }
  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar current={current} setCurrent={setCurrent} collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={user} currentKey={current} branches={branches} activeBranch={activeBranch} setActiveBranch={setActiveBranch} onLogout={logout} />
        <main className="flex-1 overflow-y-auto">{renderContent()}</main>
      </div>
    </div>
  );
}

export default App;
