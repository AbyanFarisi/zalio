'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  LayoutDashboard, Building2, Wallet, ShoppingCart, ShoppingBag, Boxes,
  Package, Store, Settings, ChevronDown, ChevronRight, Search, Bell,
  LogOut, Plus, Edit2, Trash2, Filter, Download, Upload, X,
  TrendingUp, AlertCircle, Users, Truck, Warehouse, DollarSign,
  ChevronsLeft, ChevronsRight, Home, FileText, BarChart3, Sparkles, Eye,
  Activity, TrendingDown, Landmark, Receipt, ClipboardList, ArrowRightLeft, RotateCcw
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

const CHART_COLORS = ['#14b8a6', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#10b981', '#3b82f6'];
const fmtNum = n => new Intl.NumberFormat('id-ID').format(Number(n) || 0);
const fmtRupiah = n => 'Rp ' + fmtNum(n);
const fmtCompact = n => new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(n) || 0);

const MENU = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, single: true },
  { key: 'company', label: 'Perusahaan', icon: Building2, children: [
      { key: 'branches', label: 'Cabang' }, { key: 'outlets', label: 'Outlet' },
      { key: 'employees', label: 'Karyawan' }, { key: 'roles', label: 'Peran Karyawan' },
      { key: 'salary', label: 'Gaji & Tunjangan' }, { key: 'tax', label: 'Pajak' },
      { key: 'payment-term', label: 'Termin Pembayaran' }, { key: 'period-end', label: 'Akhir Periode' },
      { key: 'activity-log', label: 'Log Aktivitas' },
  ]},
  { key: 'finance', label: 'Keuangan & Akuntansi', icon: Wallet, children: [
      { key: 'chart-of-accounts', label: 'Bagan Akun' }, { key: 'journal-voucher', label: 'Voucher Jurnal' },
      { key: 'cash-flow', label: 'Arus Kas' }, { key: 'bank-transfer', label: 'Transfer Bank' },
      { key: 'expense-accrual', label: 'Akrual Beban' }, { key: 'payroll', label: 'Payroll Karyawan' },
      { key: 'bank-history', label: 'Riwayat Bank' }, { key: 'bank-reconcile', label: 'Rekening Bank' },
      { key: 'budget', label: 'Anggaran' },
  ]},
  { key: 'sales', label: 'Penjualan', icon: ShoppingCart, children: [
      { key: 'sales-transaction', label: 'Transaksi Penjualan' }, { key: 'sales-receipt', label: 'Penerimaan Penjualan' },
      { key: 'sales-dp', label: 'Uang Muka Penjualan' }, { key: 'sales-return', label: 'Retur Penjualan' },
      { key: 'customers', label: 'Pelanggan' }, { key: 'customer-category', label: 'Kategori Pelanggan' },
      { key: 'sales-category', label: 'Kategori Penjualan' }, { key: 'sales-target', label: 'Target Penjualan' },
      { key: 'price-adjustment', label: 'Penyesuaian Harga/Diskon' }, { key: 'sales-channel', label: 'Saluran Penjualan' },
  ]},
  { key: 'purchase', label: 'Pembelian', icon: ShoppingBag, children: [
      { key: 'purchase-transaction', label: 'Transaksi Pembelian' }, { key: 'purchase-payment', label: 'Pembayaran Pembelian' },
      { key: 'purchase-dp', label: 'Uang Muka Pembelian' }, { key: 'purchase-return', label: 'Retur Pembelian' },
      { key: 'purchase-receive', label: 'Penerimaan Pembelian' }, { key: 'suppliers', label: 'Pemasok' },
      { key: 'supplier-category', label: 'Kategori Pemasok' }, { key: 'supplier-price', label: 'Harga Pemasok' },
      { key: 'supplier-performance', label: 'Kinerja Pemasok' },
  ]},
  { key: 'inventory', label: 'Persediaan', icon: Boxes, children: [
      { key: 'stock-warehouse', label: 'Stok per Gudang' }, { key: 'stock-movement', label: 'Pergerakan Stok' },
      { key: 'stock-transfer', label: 'Transfer Stok' }, { key: 'stock-opname', label: 'Stok Opname' },
      { key: 'stock-adjustment', label: 'Penyesuaian Stok' }, { key: 'warehouses', label: 'Gudang & Lokasi' },
      { key: 'reorder-stock', label: 'Pemesanan Ulang Stok' },
  ]},
  { key: 'product', label: 'Produk', icon: Package, children: [
      { key: 'products', label: 'Produk' }, { key: 'brands', label: 'Merek' },
      { key: 'categories', label: 'Kategori' }, { key: 'subcategories', label: 'Sub Kategori' },
      { key: 'uoms', label: 'Satuan (UoM)' }, { key: 'product-performance', label: 'Kinerja Produk' },
  ]},
  { key: 'pos', label: 'Kasir POS', icon: Store, children: [
      { key: 'pos-setting', label: 'Pengaturan POS' }, { key: 'sales-type', label: 'Tipe Penjualan' },
      { key: 'expense-category', label: 'Kategori Beban' }, { key: 'promotion', label: 'Promosi' },
  ]},
  { key: 'setting', label: 'Pengaturan', icon: Settings, children: [
      { key: 'users', label: 'Pengguna' }, { key: 'user-roles', label: 'Peran Pengguna' },
      { key: 'preferences', label: 'Preferensi' }, { key: 'auto-number', label: 'Auto Number' },
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
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    const [d, r, ch] = await Promise.all([api('/analytics/dashboard'), api('/analytics/recommendations'), api('/analytics/charts')]);
    if (d.ok) setData(d.data); if (r.ok) setRecs(r.data.recommendations || []); if (ch.ok) setCharts(ch.data);
    setLoading(false);
  })(); }, []);
  if (loading) return <div className="p-6 text-slate-500">Memuat data...</div>;
  const kpi = data?.kpi || {};
  const cards = [
    { label: 'Total Produk', value: fmtNum(kpi.total_products), icon: Package, color: 'from-blue-500 to-blue-600' },
    { label: 'Pelanggan', value: fmtNum(kpi.total_customers), icon: Users, color: 'from-purple-500 to-purple-600' },
    { label: 'Pemasok', value: fmtNum(kpi.total_suppliers), icon: Truck, color: 'from-orange-500 to-orange-600' },
    { label: 'Cabang', value: fmtNum(kpi.total_branches), icon: Building2, color: 'from-teal-500 to-teal-600' },
    { label: 'Total Stok', value: fmtNum(kpi.total_stock), icon: Warehouse, color: 'from-indigo-500 to-indigo-600' },
    { label: 'Nilai Inventaris', value: fmtRupiah(kpi.inventory_value), icon: DollarSign, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Stok Rendah', value: fmtNum(kpi.low_stock_alerts), icon: AlertCircle, color: 'from-red-500 to-red-600' },
    { label: 'Penjualan 30 Hari', value: fmtRupiah(kpi.sales_last_30_days), icon: TrendingUp, color: 'from-pink-500 to-pink-600' },
  ];
  const salesData = charts?.sales_daily || [];
  const purchaseData = charts?.purchase_daily || [];
  const catData = charts?.category_distribution || [];
  const stockStatus = charts?.stock_status || [];
  const topProducts = charts?.top_products || [];
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

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-slate-900">Tren Penjualan vs Pembelian (14 hari)</h3><BarChart3 className="w-4 h-4 text-slate-400" /></div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={salesData.length >= purchaseData.length ? salesData.map((s, i) => ({ label: s.label, penjualan: s.value, pembelian: purchaseData[i]?.value || 0 })) : purchaseData.map((p, i) => ({ label: p.label, penjualan: salesData[i]?.value || 0, pembelian: p.value }))}>
              <defs>
                <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} /><stop offset="95%" stopColor="#14b8a6" stopOpacity={0} /></linearGradient>
                <linearGradient id="gPur" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip formatter={v => fmtRupiah(v)} />
              <Legend />
              <Area type="monotone" dataKey="penjualan" stroke="#14b8a6" fill="url(#gSales)" strokeWidth={2} />
              <Area type="monotone" dataKey="pembelian" stroke="#6366f1" fill="url(#gPur)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-slate-900">Status Stok</h3><Boxes className="w-4 h-4 text-slate-400" /></div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={stockStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                {stockStatus.map((e, i) => <Cell key={i} fill={['#10b981', '#f59e0b', '#ef4444'][i % 3]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-slate-900">Nilai Persediaan per Kategori</h3><BarChart3 className="w-4 h-4 text-slate-400" /></div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={catData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip formatter={v => fmtRupiah(v)} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>{catData.map((e, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-slate-900">Produk Nilai Tertinggi</h3><TrendingUp className="w-4 h-4 text-slate-400" /></div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart layout="vertical" data={topProducts} margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tickFormatter={fmtCompact} tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip formatter={v => fmtRupiah(v)} />
              <Bar dataKey="value" fill="#14b8a6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-slate-900">Rekomendasi AI</h3><Sparkles className="w-4 h-4 text-teal-500" /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {recs.map((r, i) => (
            <div key={i} className={`p-3 rounded-lg border-l-4 ${r.priority === 'high' ? 'bg-red-50 border-red-500' : r.priority === 'medium' ? 'bg-amber-50 border-amber-500' : 'bg-slate-50 border-slate-400'}`}>
              <div className="text-sm font-medium text-slate-900">{r.title}</div><div className="text-xs text-slate-600 mt-1">{r.description}</div>
            </div>
          ))}
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
                ) : f.type === 'date' ? (
                  <Input type="date" value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
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

function SalesTransactionPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranchList] = useState([]);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [o, c, p, b] = await Promise.all([
      api('/master/sales-orders'),
      api('/master/customers'),
      api('/master/products'),
      api('/auth/branches'),
    ]);
    if (o.ok) setOrders(o.data || []);
    if (c.ok) setCustomers(c.data || []);
    if (p.ok) setProducts(p.data || []);
    if (b.ok) setBranchList(b.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = orders.filter(x => !q ||
    x.order_number?.toLowerCase().includes(q.toLowerCase()) ||
    x.customer_name?.toLowerCase().includes(q.toLowerCase())
  );

  const fmtRp = n => 'Rp ' + new Intl.NumberFormat('id-ID').format(n || 0);
  const fmtDate = d => { try { return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d; } };

  const statusBadge = (s) => {
    const map = {
      'DRAFT': 'bg-slate-100 text-slate-700',
      'CONFIRMED': 'bg-blue-100 text-blue-700',
      'INVOICED': 'bg-purple-100 text-purple-700',
      'PAID': 'bg-green-100 text-green-700',
      'CANCELLED': 'bg-red-100 text-red-700',
    };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${map[s] || 'bg-slate-100 text-slate-600'}`}>{s}</span>;
  };

  async function viewDetail(order) {
    const r = await api(`/master/sales-orders/${order.id}`);
    if (r.ok) {
      setSelectedOrder(r.data);
      setShowDetail(true);
    } else toast.error('Gagal memuat detail');
  }

  async function confirmOrder(orderId) {
    if (!confirm('Konfirmasi order ini? Stok akan dikurangi.')) return;
    const r = await api(`/master/sales-orders/${orderId}/confirm`, { method: 'POST' });
    if (r.ok) { toast.success('Order dikonfirmasi!'); load(); setShowDetail(false); }
    else toast.error(r.data?.error || 'Gagal konfirmasi');
  }

  async function cancelOrder(orderId) {
    if (!confirm('Batalkan order ini? Stok akan dikembalikan jika sudah dikonfirmasi.')) return;
    const r = await api(`/master/sales-orders/${orderId}/cancel`, { method: 'POST' });
    if (r.ok) { toast.success('Order dibatalkan'); load(); setShowDetail(false); }
    else toast.error(r.data?.error || 'Gagal batalkan');
  }

  async function deleteOrder(orderId) {
    if (!confirm('Hapus order draft ini?')) return;
    const r = await api(`/master/sales-orders/${orderId}`, { method: 'DELETE' });
    if (r.ok) { toast.success('Order dihapus'); load(); }
    else toast.error(r.data?.error || 'Gagal hapus');
  }

  return (
    <div className="p-6">
      <PageHeader title="Transaksi Penjualan" breadcrumb="Penjualan > Transaksi Penjualan" actions={
        <PrimaryButton onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />Buat Penjualan</PrimaryButton>
      } />
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Cari no. order atau pelanggan..." value={q} onChange={e => setQ(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none text-sm" />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="bg-slate-100 px-2 py-1 rounded">Total: {orders.length}</span>
            <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded">Konfirmasi: {orders.filter(o => o.status === 'CONFIRMED').length}</span>
            <span className="bg-slate-50 px-2 py-1 rounded">Draft: {orders.filter(o => o.status === 'DRAFT').length}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs text-slate-600 uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-medium">No. Order</th>
                <th className="text-left px-4 py-3 font-medium">Tanggal</th>
                <th className="text-left px-4 py-3 font-medium">Pelanggan</th>
                <th className="text-left px-4 py-3 font-medium">Cabang</th>
                <th className="text-left px-4 py-3 font-medium">Pembayaran</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-center px-4 py-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading && <tr><td colSpan="8" className="text-center py-8 text-slate-400">Memuat...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan="8" className="text-center py-8 text-slate-400">Belum ada transaksi penjualan</td></tr>}
              {filtered.map(o => (
                <tr key={o.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => viewDetail(o)}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-teal-700">{o.order_number}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{fmtDate(o.order_date)}</td>
                  <td className="px-4 py-3">
                    <div className="text-slate-900">{o.customer_name}</div>
                    <div className="text-xs text-slate-500">{o.customer_code}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{o.branch_name || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{o.payment_method || '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{fmtRp(o.total)}</td>
                  <td className="px-4 py-3 text-center">{statusBadge(o.status)}</td>
                  <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <div className="inline-flex gap-1">
                      {o.status === 'DRAFT' && (
                        <>
                          <button onClick={() => confirmOrder(o.id)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="Konfirmasi">
                            <FileText className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteOrder(o.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Hapus">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {o.status === 'CONFIRMED' && (
                        <button onClick={() => cancelOrder(o.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Batalkan">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Menampilkan {filtered.length} dari {orders.length} transaksi</span>
          <span>Total Nilai: {fmtRp(orders.reduce((s, o) => s + (o.total || 0), 0))}</span>
        </div>
      </div>

      {/* Create Sales Order Modal */}
      <CreateSalesOrderModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        customers={customers}
        products={products}
        branches={branches}
        onSaved={() => { setShowCreate(false); load(); }}
      />

      {/* Order Detail Modal */}
      <SalesOrderDetailModal
        open={showDetail}
        onClose={() => setShowDetail(false)}
        order={selectedOrder}
        onConfirm={confirmOrder}
        onCancel={cancelOrder}
        products={products}
        onReload={() => { load(); viewDetail(selectedOrder); }}
      />
    </div>
  );
}

function CreateSalesOrderModal({ open, onClose, customers, products, branches, onSaved }) {
  const [form, setForm] = useState({
    customer_id: '', branch_id: '', notes: '', payment_method: 'CASH', discount: 0, tax: 0,
  });
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemForm, setItemForm] = useState({ product_id: '', quantity: 1, price: 0 });

  useEffect(() => {
    if (open) {
      setForm({ customer_id: '', branch_id: '', notes: '', payment_method: 'CASH', discount: 0, tax: 0 });
      setItems([]);
    }
  }, [open]);

  function addItem() {
    if (!itemForm.product_id || itemForm.quantity <= 0) { toast.error('Pilih produk dan qty'); return; }
    const product = products.find(p => p.id === itemForm.product_id);
    const price = itemForm.price || product?.selling_price || 0;
    setItems([...items, {
      product_id: itemForm.product_id,
      product_name: product?.name || '',
      product_sku: product?.sku || '',
      quantity: itemForm.quantity,
      price: price,
      subtotal: itemForm.quantity * price,
    }]);
    setItemForm({ product_id: '', quantity: 1, price: 0 });
    setShowAddItem(false);
  }

  function removeItem(idx) {
    setItems(items.filter((_, i) => i !== idx));
  }

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const total = subtotal - (form.discount || 0) + (form.tax || 0);

  async function save() {
    if (items.length === 0) { toast.error('Tambahkan minimal 1 item'); return; }
    setSaving(true);
    const r = await api('/master/sales-orders', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity, price: i.price })),
      }),
    });
    setSaving(false);
    if (r.ok) {
      toast.success(`Order ${r.data.order_number} berhasil dibuat`);
      onSaved();
    } else toast.error(r.data?.error || 'Gagal buat order');
  }

  const fmtRp = n => 'Rp ' + new Intl.NumberFormat('id-ID').format(n || 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 text-lg">Buat Transaksi Penjualan</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><X className="w-4 h-4 text-slate-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Order Header */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Pelanggan">
              <SelectFld value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})}>
                <option value="">Walk-in Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
              </SelectFld>
            </Field>
            <Field label="Cabang">
              <SelectFld value={form.branch_id} onChange={e => setForm({...form, branch_id: e.target.value})}>
                <option value="">- Pilih Cabang -</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </SelectFld>
            </Field>
            <Field label="Metode Pembayaran">
              <SelectFld value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}>
                <option value="CASH">Tunai</option>
                <option value="TRANSFER">Transfer Bank</option>
                <option value="DEBIT">Kartu Debit</option>
                <option value="CREDIT">Kartu Kredit</option>
                <option value="QRIS">QRIS</option>
              </SelectFld>
            </Field>
            <Field label="Catatan">
              <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Catatan order..." />
            </Field>
          </div>

          {/* Items Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-900">Item Penjualan</h4>
              <button onClick={() => setShowAddItem(!showAddItem)} className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />Tambah Item
              </button>
            </div>

            {showAddItem && (
              <div className="bg-teal-50 rounded-lg p-4 mb-3 border border-teal-100">
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <Field label="Produk">
                      <SelectFld value={itemForm.product_id} onChange={e => {
                        const pid = e.target.value;
                        const prod = products.find(p => p.id === pid);
                        setItemForm({...itemForm, product_id: pid, price: prod?.selling_price || 0});
                      }}>
                        <option value="">- Pilih Produk -</option>
                        {products.filter(p => p.is_active).map(p => (
                          <option key={p.id} value={p.id}>{p.sku} - {p.name} (Stok: {p.stock_qty})</option>
                        ))}
                      </SelectFld>
                    </Field>
                  </div>
                  <Field label="Qty">
                    <Input type="number" min="1" value={itemForm.quantity} onChange={e => setItemForm({...itemForm, quantity: parseFloat(e.target.value) || 0})} />
                  </Field>
                  <Field label="Harga">
                    <Input type="number" value={itemForm.price} onChange={e => setItemForm({...itemForm, price: parseFloat(e.target.value) || 0})} />
                  </Field>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm text-teal-700 font-medium">
                    Subtotal: {fmtRp(itemForm.quantity * itemForm.price)}
                  </span>
                  <div className="flex gap-2">
                    <GhostButton onClick={() => setShowAddItem(false)}>Batal</GhostButton>
                    <PrimaryButton onClick={addItem}>Tambah</PrimaryButton>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Produk</th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-600">Qty</th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-600">Harga</th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-600">Subtotal</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 && <tr><td colSpan="5" className="text-center py-6 text-slate-400">Belum ada item. Klik "Tambah Item" untuk menambahkan produk.</td></tr>}
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-900">{item.product_name}</div>
                        <div className="text-xs text-slate-500">{item.product_sku}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right">{fmtRp(item.price)}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{fmtRp(item.subtotal)}</td>
                      <td className="px-2 py-2.5">
                        <button onClick={() => removeItem(idx)} className="p-1 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Diskon (Rp)">
                <Input type="number" value={form.discount} onChange={e => setForm({...form, discount: parseFloat(e.target.value) || 0})} />
              </Field>
              <Field label="Pajak (Rp)">
                <Input type="number" value={form.tax} onChange={e => setForm({...form, tax: parseFloat(e.target.value) || 0})} />
              </Field>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 space-y-1.5">
              <div className="flex justify-between text-sm text-slate-600"><span>Subtotal</span><span>{fmtRp(subtotal)}</span></div>
              {form.discount > 0 && <div className="flex justify-between text-sm text-red-600"><span>Diskon</span><span>-{fmtRp(form.discount)}</span></div>}
              {form.tax > 0 && <div className="flex justify-between text-sm text-slate-600"><span>Pajak</span><span>+{fmtRp(form.tax)}</span></div>}
              <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-300"><span>Total</span><span>{fmtRp(total)}</span></div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-2">
          <GhostButton onClick={onClose}>Batal</GhostButton>
          <PrimaryButton onClick={save} disabled={saving || items.length === 0}>
            {saving ? 'Menyimpan...' : 'Simpan sebagai Draft'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function SalesOrderDetailModal({ open, onClose, order, onConfirm, onCancel, products, onReload }) {
  const [addingItem, setAddingItem] = useState(false);
  const [itemForm, setItemForm] = useState({ product_id: '', quantity: 1, price: 0 });

  if (!open || !order) return null;

  const fmtRp = n => 'Rp ' + new Intl.NumberFormat('id-ID').format(n || 0);
  const isDraft = order.status === 'DRAFT';
  const isConfirmed = order.status === 'CONFIRMED';

  const statusColors = {
    'DRAFT': 'bg-slate-100 text-slate-700 border-slate-200',
    'CONFIRMED': 'bg-blue-100 text-blue-700 border-blue-200',
    'INVOICED': 'bg-purple-100 text-purple-700 border-purple-200',
    'PAID': 'bg-green-100 text-green-700 border-green-200',
    'CANCELLED': 'bg-red-100 text-red-700 border-red-200',
  };

  async function addItem() {
    if (!itemForm.product_id || itemForm.quantity <= 0) { toast.error('Pilih produk dan qty'); return; }
    const r = await api(`/master/sales-orders/${order.id}/items`, {
      method: 'POST',
      body: JSON.stringify(itemForm),
    });
    if (r.ok) { toast.success('Item ditambahkan'); setAddingItem(false); setItemForm({ product_id: '', quantity: 1, price: 0 }); onReload(); }
    else toast.error(r.data?.error || 'Gagal tambah item');
  }

  async function removeItem(itemId) {
    if (!confirm('Hapus item ini?')) return;
    const r = await api(`/master/sales-orders/${order.id}/items/${itemId}`, { method: 'DELETE' });
    if (r.ok) { toast.success('Item dihapus'); onReload(); }
    else toast.error(r.data?.error || 'Gagal hapus item');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-900 text-lg">{order.order_number}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {new Date(order.created_at).toLocaleString('id-ID')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[order.status] || ''}`}>{order.status}</span>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><X className="w-4 h-4 text-slate-500" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Pelanggan:</span>
              <p className="font-medium text-slate-900">{order.customer_name} {order.customer_code ? `(${order.customer_code})` : ''}</p>
            </div>
            <div>
              <span className="text-slate-500">Cabang:</span>
              <p className="font-medium text-slate-900">{order.branch_name || '-'}</p>
            </div>
            <div>
              <span className="text-slate-500">Metode Pembayaran:</span>
              <p className="font-medium text-slate-900">{order.payment_method || '-'}</p>
            </div>
            <div>
              <span className="text-slate-500">Catatan:</span>
              <p className="font-medium text-slate-900">{order.notes || '-'}</p>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-900">Item ({(order.items || []).length})</h4>
              {isDraft && (
                <button onClick={() => setAddingItem(!addingItem)} className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" />Tambah Item
                </button>
              )}
            </div>

            {addingItem && isDraft && (
              <div className="bg-teal-50 rounded-lg p-4 mb-3 border border-teal-100">
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <SelectFld value={itemForm.product_id} onChange={e => {
                      const pid = e.target.value;
                      const prod = products.find(p => p.id === pid);
                      setItemForm({...itemForm, product_id: pid, price: prod?.selling_price || 0});
                    }}>
                      <option value="">- Pilih Produk -</option>
                      {products.filter(p => p.is_active).map(p => (
                        <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                      ))}
                    </SelectFld>
                  </div>
                  <Input type="number" min="1" value={itemForm.quantity} onChange={e => setItemForm({...itemForm, quantity: parseFloat(e.target.value) || 0})} placeholder="Qty" />
                  <Input type="number" value={itemForm.price} onChange={e => setItemForm({...itemForm, price: parseFloat(e.target.value) || 0})} placeholder="Harga" />
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <GhostButton onClick={() => setAddingItem(false)}>Batal</GhostButton>
                  <PrimaryButton onClick={addItem}>Tambah</PrimaryButton>
                </div>
              </div>
            )}

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Produk</th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-600">Qty</th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-600">Harga</th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-600">Subtotal</th>
                    {isDraft && <th className="w-10"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(order.items || []).length === 0 && <tr><td colSpan={isDraft ? 5 : 4} className="text-center py-6 text-slate-400">Belum ada item</td></tr>}
                  {(order.items || []).map(item => (
                    <tr key={item.id}>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-900">{item.product_name}</div>
                        <div className="text-xs text-slate-500">{item.product_sku}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right">{fmtRp(item.price)}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{fmtRp(item.subtotal)}</td>
                      {isDraft && (
                        <td className="px-2 py-2.5">
                          <button onClick={() => removeItem(item.id)} className="p-1 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-1.5">
            <div className="flex justify-between text-sm text-slate-600"><span>Subtotal</span><span>{fmtRp(order.subtotal)}</span></div>
            {order.discount > 0 && <div className="flex justify-between text-sm text-red-600"><span>Diskon</span><span>-{fmtRp(order.discount)}</span></div>}
            {order.tax > 0 && <div className="flex justify-between text-sm text-slate-600"><span>Pajak</span><span>+{fmtRp(order.tax)}</span></div>}
            <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-300"><span>Total</span><span>{fmtRp(order.total)}</span></div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-between">
          <div>
            {(isDraft || isConfirmed) && (
              <button onClick={() => onCancel(order.id)} className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium">
                Batalkan Order
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <GhostButton onClick={onClose}>Tutup</GhostButton>
            {isDraft && (
              <PrimaryButton onClick={() => onConfirm(order.id)} disabled={(order.items || []).length === 0}>
                Konfirmasi & Proses
              </PrimaryButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between">
        <div><div className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</div><div className="text-xl font-bold text-slate-900 mt-2">{value}</div></div>
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shadow-sm`}><Icon className="w-5 h-5 text-white" /></div>
      </div>
    </div>
  );
}

function ActivityPage() {
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    const [s, l] = await Promise.all([api('/analytics/activity-summary'), api('/master/activity-logs')]);
    if (s.ok) setSummary(s.data); if (l.ok) setLogs(l.data || []);
    setLoading(false);
  })(); }, []);
  if (loading) return <div className="p-6 text-slate-500">Memuat...</div>;
  const trend = summary?.trend || [];
  const byModule = summary?.by_module || [];
  const byAction = summary?.by_action || [];
  const actionColor = { CREATE: 'bg-green-100 text-green-700', UPDATE: 'bg-blue-100 text-blue-700', DELETE: 'bg-red-100 text-red-700', CONFIRM: 'bg-teal-100 text-teal-700', CANCEL: 'bg-orange-100 text-orange-700', TRANSFER: 'bg-indigo-100 text-indigo-700', OPNAME: 'bg-purple-100 text-purple-700', ADJUSTMENT: 'bg-amber-100 text-amber-700' };
  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Log Aktivitas" breadcrumb="Perusahaan > Log Aktivitas" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Aktivitas" value={fmtNum(summary?.total)} icon={Activity} color="from-teal-500 to-teal-600" />
        <StatCard label="Hari Ini" value={fmtNum(summary?.today)} icon={ClipboardList} color="from-blue-500 to-blue-600" />
        <StatCard label="Jenis Aksi" value={fmtNum(byAction.length)} icon={FileText} color="from-purple-500 to-purple-600" />
        <StatCard label="Modul Terlibat" value={fmtNum(byModule.length)} icon={Boxes} color="from-orange-500 to-orange-600" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-4">Tren Aktivitas (14 hari)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip />
              <Line type="monotone" dataKey="value" name="Aktivitas" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-4">Aktivitas per Modul</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={byModule} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                {byModule.map((e, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100"><h3 className="font-semibold text-slate-900">Riwayat Aktivitas Terbaru</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600 uppercase tracking-wide">
              <tr><th className="text-left px-4 py-3 font-medium">Waktu</th><th className="text-left px-4 py-3 font-medium">Aksi</th><th className="text-left px-4 py-3 font-medium">Modul</th><th className="text-left px-4 py-3 font-medium">Deskripsi</th><th className="text-left px-4 py-3 font-medium">Pengguna</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-slate-400">Belum ada aktivitas</td></tr>}
              {logs.map(l => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(l.created_at).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionColor[l.action] || 'bg-slate-100 text-slate-600'}`}>{l.action}</span></td>
                  <td className="px-4 py-3 text-slate-700">{l.module}</td>
                  <td className="px-4 py-3 text-slate-700">{l.description}</td>
                  <td className="px-4 py-3 text-slate-500">{l.user_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReportPage({ title, breadcrumb, endpoint, columns, cards }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { const r = await api(endpoint); if (r.ok) setData(r.data); setLoading(false); })(); }, [endpoint]);
  if (loading) return <div className="p-6 text-slate-500">Memuat...</div>;
  const items = data?.items || [];
  const cardList = cards ? cards(data) : [];
  return (
    <div className="p-6 space-y-6">
      <PageHeader title={title} breadcrumb={breadcrumb} />
      {cardList.length > 0 && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{cardList.map((c, i) => <StatCard key={i} {...c} />)}</div>}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600 uppercase tracking-wide">
              <tr>{columns.map(c => <th key={c.key} className={`text-${c.align || 'left'} px-4 py-3 font-medium`}>{c.label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 && <tr><td colSpan={columns.length} className="text-center py-8 text-slate-400">Tidak ada data</td></tr>}
              {items.map((it, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  {columns.map(c => <td key={c.key} className={`px-4 py-3 text-${c.align || 'left'} text-slate-700`}>{c.render ? c.render(it) : String(it[c.key] ?? '-')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CashFlowReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { const r = await api('/analytics/cash-flow'); if (r.ok) setData(r.data); setLoading(false); })(); }, []);
  if (loading) return <div className="p-6 text-slate-500">Memuat...</div>;
  const rows = data?.data || [];
  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Arus Kas" breadcrumb="Keuangan & Akuntansi > Arus Kas" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Kas Masuk" value={fmtRupiah(data?.total_inflow)} icon={TrendingUp} color="from-emerald-500 to-emerald-600" />
        <StatCard label="Total Kas Keluar" value={fmtRupiah(data?.total_outflow)} icon={TrendingDown} color="from-red-500 to-red-600" />
        <StatCard label="Arus Kas Bersih" value={fmtRupiah(data?.net)} icon={Wallet} color="from-teal-500 to-teal-600" />
      </div>
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-900 mb-4">Arus Kas per Bulan</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <Tooltip formatter={v => fmtRupiah(v)} /><Legend />
            <Bar dataKey="inflow" name="Masuk" fill="#10b981" radius={[6, 6, 0, 0]} />
            <Bar dataKey="outflow" name="Keluar" fill="#ef4444" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PurchaseTransactionPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetail] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranchList] = useState([]);
  const [q, setQ] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    const [o, s, p, b] = await Promise.all([api('/master/purchase-orders'), api('/master/suppliers'), api('/master/products'), api('/auth/branches')]);
    if (o.ok) setOrders(o.data || []); if (s.ok) setSuppliers(s.data || []); if (p.ok) setProducts(p.data || []); if (b.ok) setBranchList(b.data || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  const filtered = orders.filter(x => !q || x.order_number?.toLowerCase().includes(q.toLowerCase()) || x.supplier_name?.toLowerCase().includes(q.toLowerCase()));
  const badge = s => { const m = { DRAFT: 'bg-slate-100 text-slate-700', CONFIRMED: 'bg-green-100 text-green-700', CANCELLED: 'bg-red-100 text-red-700' }; return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${m[s] || 'bg-slate-100'}`}>{s}</span>; };
  async function viewDetail(o) { const r = await api(`/master/purchase-orders/${o.id}`); if (r.ok) setDetail(r.data); }
  async function confirmPO(id) { if (!confirm('Konfirmasi PO ini? Stok akan bertambah.')) return; const r = await api(`/master/purchase-orders/${id}/confirm`, { method: 'POST' }); if (r.ok) { toast.success('PO dikonfirmasi, stok bertambah'); setDetail(null); load(); } else toast.error(r.data?.error || 'Gagal'); }
  async function cancelPO(id) { if (!confirm('Batalkan PO ini?')) return; const r = await api(`/master/purchase-orders/${id}/cancel`, { method: 'POST' }); if (r.ok) { toast.success('PO dibatalkan'); setDetail(null); load(); } else toast.error('Gagal'); }
  async function delPO(id) { if (!confirm('Hapus PO draft?')) return; const r = await api(`/master/purchase-orders/${id}`, { method: 'DELETE' }); if (r.ok) { toast.success('Dihapus'); load(); } }
  return (
    <div className="p-6">
      <PageHeader title="Transaksi Pembelian" breadcrumb="Pembelian > Transaksi Pembelian" actions={<PrimaryButton onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />Buat Pembelian</PrimaryButton>} />
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-md"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input placeholder="Cari no. PO atau pemasok..." value={q} onChange={e => setQ(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none text-sm" /></div>
          <div className="flex items-center gap-2 text-xs text-slate-500"><span className="bg-slate-100 px-2 py-1 rounded">Total: {orders.length}</span><span className="bg-green-50 text-green-600 px-2 py-1 rounded">Konfirmasi: {orders.filter(o => o.status === 'CONFIRMED').length}</span></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs text-slate-600 uppercase tracking-wide"><tr>
              <th className="text-left px-4 py-3 font-medium">No. PO</th><th className="text-left px-4 py-3 font-medium">Tanggal</th><th className="text-left px-4 py-3 font-medium">Pemasok</th><th className="text-left px-4 py-3 font-medium">Cabang</th><th className="text-right px-4 py-3 font-medium">Total</th><th className="text-center px-4 py-3 font-medium">Status</th><th className="text-center px-4 py-3 font-medium">Aksi</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading && <tr><td colSpan="7" className="text-center py-8 text-slate-400">Memuat...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan="7" className="text-center py-8 text-slate-400">Belum ada transaksi pembelian</td></tr>}
              {filtered.map(o => (
                <tr key={o.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => viewDetail(o)}>
                  <td className="px-4 py-3 font-medium text-teal-700">{o.order_number}</td>
                  <td className="px-4 py-3 text-slate-600">{o.order_date}</td>
                  <td className="px-4 py-3 text-slate-900">{o.supplier_name || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{o.branch_name || '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold">{fmtRupiah(o.total)}</td>
                  <td className="px-4 py-3 text-center">{badge(o.status)}</td>
                  <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <div className="inline-flex gap-1">
                      {o.status === 'DRAFT' && <><button onClick={() => confirmPO(o.id)} className="p-1.5 rounded hover:bg-green-50 text-green-600" title="Konfirmasi"><FileText className="w-4 h-4" /></button><button onClick={() => delPO(o.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Hapus"><Trash2 className="w-4 h-4" /></button></>}
                      {o.status === 'CONFIRMED' && <button onClick={() => cancelPO(o.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Batalkan"><X className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex justify-between text-xs text-slate-500"><span>Menampilkan {filtered.length} dari {orders.length}</span><span>Total: {fmtRupiah(orders.reduce((s, o) => s + (o.total || 0), 0))}</span></div>
      </div>
      <CreatePurchaseModal open={showCreate} onClose={() => setShowCreate(false)} suppliers={suppliers} products={products} branches={branches} onSaved={() => { setShowCreate(false); load(); }} />
      <PurchaseDetailModal order={detail} onClose={() => setDetail(null)} onConfirm={confirmPO} onCancel={cancelPO} />
    </div>
  );
}

function CreatePurchaseModal({ open, onClose, suppliers, products, branches, onSaved }) {
  const [form, setForm] = useState({ supplier_id: '', branch_id: '', notes: '', payment_method: 'TRANSFER', discount: 0, tax: 0 });
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [itemForm, setItemForm] = useState({ product_id: '', quantity: 1, price: 0 });
  useEffect(() => { if (open) { setForm({ supplier_id: '', branch_id: '', notes: '', payment_method: 'TRANSFER', discount: 0, tax: 0 }); setItems([]); } }, [open]);
  function addItem() {
    if (!itemForm.product_id || itemForm.quantity <= 0) { toast.error('Pilih produk dan qty'); return; }
    const p = products.find(x => x.id === itemForm.product_id);
    setItems([...items, { product_id: itemForm.product_id, product_name: p?.name || '', product_sku: p?.sku || '', quantity: itemForm.quantity, price: itemForm.price, subtotal: itemForm.quantity * itemForm.price }]);
    setItemForm({ product_id: '', quantity: 1, price: 0 });
  }
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const total = subtotal - (form.discount || 0) + (form.tax || 0);
  async function save() {
    if (items.length === 0) { toast.error('Tambahkan minimal 1 item'); return; }
    setSaving(true);
    const r = await api('/master/purchase-orders', { method: 'POST', body: JSON.stringify({ ...form, items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity, price: i.price })) }) });
    setSaving(false);
    if (r.ok) { toast.success(`PO ${r.data.order_number} dibuat`); onSaved(); } else toast.error(r.data?.error || 'Gagal');
  }
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100"><h3 className="font-semibold text-slate-900 text-lg">Buat Transaksi Pembelian</h3><button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><X className="w-4 h-4 text-slate-500" /></button></div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Pemasok" required><SelectFld value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })}><option value="">- Pilih Pemasok -</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}</SelectFld></Field>
            <Field label="Cabang"><SelectFld value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })}><option value="">- Pilih Cabang -</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</SelectFld></Field>
            <Field label="Metode Pembayaran"><SelectFld value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}><option value="TRANSFER">Transfer Bank</option><option value="CASH">Tunai</option><option value="CREDIT">Kredit / Tempo</option></SelectFld></Field>
            <Field label="Catatan"><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
          </div>
          <div>
            <div className="bg-teal-50 rounded-lg p-4 mb-3 border border-teal-100">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-2"><Field label="Produk"><SelectFld value={itemForm.product_id} onChange={e => { const pid = e.target.value; const pr = products.find(p => p.id === pid); setItemForm({ ...itemForm, product_id: pid, price: pr?.cogs || 0 }); }}><option value="">- Pilih Produk -</option>{products.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}</SelectFld></Field></div>
                <Field label="Qty"><Input type="number" min="1" value={itemForm.quantity} onChange={e => setItemForm({ ...itemForm, quantity: parseFloat(e.target.value) || 0 })} /></Field>
                <Field label="Harga Beli"><Input type="number" value={itemForm.price} onChange={e => setItemForm({ ...itemForm, price: parseFloat(e.target.value) || 0 })} /></Field>
              </div>
              <div className="flex justify-end mt-3"><PrimaryButton onClick={addItem}>Tambah Item</PrimaryButton></div>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="text-left px-4 py-2.5 font-medium text-slate-600">Produk</th><th className="text-right px-4 py-2.5 font-medium text-slate-600">Qty</th><th className="text-right px-4 py-2.5 font-medium text-slate-600">Harga</th><th className="text-right px-4 py-2.5 font-medium text-slate-600">Subtotal</th><th className="w-10"></th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 && <tr><td colSpan="5" className="text-center py-6 text-slate-400">Belum ada item</td></tr>}
                  {items.map((item, idx) => (<tr key={idx}><td className="px-4 py-2.5"><div className="font-medium text-slate-900">{item.product_name}</div><div className="text-xs text-slate-500">{item.product_sku}</div></td><td className="px-4 py-2.5 text-right">{item.quantity}</td><td className="px-4 py-2.5 text-right">{fmtRupiah(item.price)}</td><td className="px-4 py-2.5 text-right font-medium">{fmtRupiah(item.subtotal)}</td><td className="px-2"><button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="p-1 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></td></tr>))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-3"><Field label="Diskon (Rp)"><Input type="number" value={form.discount} onChange={e => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })} /></Field><Field label="Pajak (Rp)"><Input type="number" value={form.tax} onChange={e => setForm({ ...form, tax: parseFloat(e.target.value) || 0 })} /></Field></div>
            <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between text-lg font-bold text-slate-900"><span>Total</span><span>{fmtRupiah(total)}</span></div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-2"><GhostButton onClick={onClose}>Batal</GhostButton><PrimaryButton onClick={save} disabled={saving || items.length === 0}>{saving ? 'Menyimpan...' : 'Simpan sebagai Draft'}</PrimaryButton></div>
      </div>
    </div>
  );
}

function PurchaseDetailModal({ order, onClose, onConfirm, onCancel }) {
  if (!order) return null;
  const colors = { DRAFT: 'bg-slate-100 text-slate-700', CONFIRMED: 'bg-green-100 text-green-700', CANCELLED: 'bg-red-100 text-red-700' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100"><div><h3 className="font-semibold text-slate-900 text-lg">{order.order_number}</h3><p className="text-xs text-slate-500 mt-0.5">{new Date(order.created_at).toLocaleString('id-ID')}</p></div><div className="flex items-center gap-3"><span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[order.status] || ''}`}>{order.status}</span><button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><X className="w-4 h-4 text-slate-500" /></button></div></div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500">Pemasok:</span><p className="font-medium text-slate-900">{order.supplier_name} {order.supplier_code ? `(${order.supplier_code})` : ''}</p></div>
            <div><span className="text-slate-500">Cabang:</span><p className="font-medium text-slate-900">{order.branch_name || '-'}</p></div>
            <div><span className="text-slate-500">Pembayaran:</span><p className="font-medium text-slate-900">{order.payment_method || '-'}</p></div>
            <div><span className="text-slate-500">Catatan:</span><p className="font-medium text-slate-900">{order.notes || '-'}</p></div>
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="text-left px-4 py-2.5 font-medium text-slate-600">Produk</th><th className="text-right px-4 py-2.5 font-medium text-slate-600">Qty</th><th className="text-right px-4 py-2.5 font-medium text-slate-600">Harga</th><th className="text-right px-4 py-2.5 font-medium text-slate-600">Subtotal</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(order.items || []).map(it => (<tr key={it.id}><td className="px-4 py-2.5"><div className="font-medium text-slate-900">{it.product_name}</div><div className="text-xs text-slate-500">{it.product_sku}</div></td><td className="px-4 py-2.5 text-right">{it.quantity}</td><td className="px-4 py-2.5 text-right">{fmtRupiah(it.price)}</td><td className="px-4 py-2.5 text-right font-medium">{fmtRupiah(it.subtotal)}</td></tr>))}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 space-y-1.5">
            <div className="flex justify-between text-sm text-slate-600"><span>Subtotal</span><span>{fmtRupiah(order.subtotal)}</span></div>
            {order.discount > 0 && <div className="flex justify-between text-sm text-red-600"><span>Diskon</span><span>-{fmtRupiah(order.discount)}</span></div>}
            {order.tax > 0 && <div className="flex justify-between text-sm text-slate-600"><span>Pajak</span><span>+{fmtRupiah(order.tax)}</span></div>}
            <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-300"><span>Total</span><span>{fmtRupiah(order.total)}</span></div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-2">
          {order.status === 'DRAFT' && <PrimaryButton onClick={() => onConfirm(order.id)}><FileText className="w-4 h-4" />Konfirmasi (Terima Stok)</PrimaryButton>}
          {order.status === 'CONFIRMED' && <GhostButton onClick={() => onCancel(order.id)}>Batalkan</GhostButton>}
        </div>
      </div>
    </div>
  );
}

const rp = key => r => fmtRupiah(r[key]);
const PAGE_CONFIGS = {
  // Company
  'salary': { title: 'Gaji & Tunjangan', breadcrumb: 'Perusahaan > Gaji & Tunjangan', endpoint: '/master/salary-components', columns: [{ key: 'name', label: 'Komponen' }, { key: 'comp_type', label: 'Tipe' }, { key: 'amount', label: 'Nominal', align: 'right', render: rp('amount') }], formFields: [{ key: 'name', label: 'Nama Komponen', required: true }, { key: 'comp_type', label: 'Tipe', type: 'select', options: [{ value: 'ALLOWANCE', name: 'Tunjangan' }, { value: 'DEDUCTION', name: 'Potongan' }] }, { key: 'amount', label: 'Nominal', type: 'number' }, { key: 'description', label: 'Deskripsi', type: 'textarea', full: true }] },
  'tax': { title: 'Pajak', breadcrumb: 'Perusahaan > Pajak', endpoint: '/master/tax-rates', columns: [{ key: 'name', label: 'Nama' }, { key: 'rate', label: 'Tarif (%)', align: 'right' }, { key: 'description', label: 'Deskripsi' }], formFields: [{ key: 'name', label: 'Nama Pajak', required: true }, { key: 'rate', label: 'Tarif (%)', type: 'number' }, { key: 'description', label: 'Deskripsi', type: 'textarea', full: true }] },
  'payment-term': { title: 'Termin Pembayaran', breadcrumb: 'Perusahaan > Termin Pembayaran', endpoint: '/master/payment-terms', columns: [{ key: 'name', label: 'Nama' }, { key: 'days', label: 'Jatuh Tempo (hari)', align: 'right' }], formFields: [{ key: 'name', label: 'Nama Termin', required: true }, { key: 'days', label: 'Jumlah Hari', type: 'number' }, { key: 'description', label: 'Deskripsi', type: 'textarea', full: true }] },
  'period-end': { title: 'Akhir Periode', breadcrumb: 'Perusahaan > Akhir Periode', endpoint: '/master/period-closings', columns: [{ key: 'period', label: 'Periode' }, { key: 'status', label: 'Status' }, { key: 'notes', label: 'Catatan' }], formFields: [{ key: 'period', label: 'Periode (mis. 2025-06)', required: true }, { key: 'status', label: 'Status', type: 'select', options: [{ value: 'OPEN', name: 'Terbuka' }, { value: 'CLOSED', name: 'Ditutup' }] }, { key: 'notes', label: 'Catatan', type: 'textarea', full: true }] },
  // Finance
  'chart-of-accounts': { title: 'Bagan Akun', breadcrumb: 'Keuangan > Bagan Akun', endpoint: '/master/chart-of-accounts', columns: [{ key: 'code', label: 'Kode' }, { key: 'name', label: 'Nama Akun' }, { key: 'account_type', label: 'Tipe' }, { key: 'normal_balance', label: 'Saldo Normal' }], formFields: [{ key: 'code', label: 'Kode Akun', required: true }, { key: 'name', label: 'Nama Akun', required: true }, { key: 'account_type', label: 'Tipe', type: 'select', options: [{ value: 'ASSET', name: 'Aset' }, { value: 'LIABILITY', name: 'Kewajiban' }, { value: 'EQUITY', name: 'Ekuitas' }, { value: 'REVENUE', name: 'Pendapatan' }, { value: 'EXPENSE', name: 'Beban' }] }, { key: 'normal_balance', label: 'Saldo Normal', type: 'select', options: [{ value: 'DEBIT', name: 'Debit' }, { value: 'CREDIT', name: 'Kredit' }] }, { key: 'description', label: 'Deskripsi', type: 'textarea', full: true }] },
  'journal-voucher': { title: 'Voucher Jurnal', breadcrumb: 'Keuangan > Voucher Jurnal', endpoint: '/master/journal-vouchers', columns: [{ key: 'voucher_number', label: 'No. Voucher' }, { key: 'voucher_date', label: 'Tanggal' }, { key: 'debit_account', label: 'Debit' }, { key: 'credit_account', label: 'Kredit' }, { key: 'amount', label: 'Nominal', align: 'right', render: rp('amount') }], formFields: [{ key: 'voucher_number', label: 'No. Voucher', required: true }, { key: 'voucher_date', label: 'Tanggal', type: 'date' }, { key: 'debit_account', label: 'Akun Debit' }, { key: 'credit_account', label: 'Akun Kredit' }, { key: 'amount', label: 'Nominal', type: 'number' }, { key: 'description', label: 'Keterangan', type: 'textarea', full: true }] },
  'bank-transfer': { title: 'Transfer Bank', breadcrumb: 'Keuangan > Transfer Bank', endpoint: '/master/bank-transactions', columns: [{ key: 'bank_name', label: 'Bank' }, { key: 'trx_type', label: 'Tipe' }, { key: 'amount', label: 'Nominal', align: 'right', render: rp('amount') }, { key: 'trx_date', label: 'Tanggal' }], formFields: [{ key: 'bank_name', label: 'Bank', required: true }, { key: 'trx_type', label: 'Tipe', type: 'select', options: [{ value: 'IN', name: 'Masuk' }, { value: 'OUT', name: 'Keluar' }, { value: 'TRANSFER', name: 'Transfer' }] }, { key: 'amount', label: 'Nominal', type: 'number' }, { key: 'trx_date', label: 'Tanggal', type: 'date' }, { key: 'description', label: 'Keterangan', type: 'textarea', full: true }] },
  'expense-accrual': { title: 'Akrual Beban', breadcrumb: 'Keuangan > Akrual Beban', endpoint: '/master/expense-accruals', columns: [{ key: 'name', label: 'Nama Beban' }, { key: 'amount', label: 'Nominal', align: 'right', render: rp('amount') }, { key: 'accrual_date', label: 'Tanggal' }], formFields: [{ key: 'name', label: 'Nama Beban', required: true }, { key: 'amount', label: 'Nominal', type: 'number' }, { key: 'accrual_date', label: 'Tanggal', type: 'date' }, { key: 'description', label: 'Deskripsi', type: 'textarea', full: true }] },
  'payroll': { title: 'Payroll Karyawan', breadcrumb: 'Keuangan > Payroll', endpoint: '/master/payrolls', columns: [{ key: 'employee_name', label: 'Karyawan' }, { key: 'period', label: 'Periode' }, { key: 'basic_salary', label: 'Gaji Pokok', align: 'right', render: rp('basic_salary') }, { key: 'net_salary', label: 'Take Home', align: 'right', render: rp('net_salary') }], formFields: [{ key: 'employee_name', label: 'Nama Karyawan', required: true }, { key: 'period', label: 'Periode' }, { key: 'basic_salary', label: 'Gaji Pokok', type: 'number' }, { key: 'allowance', label: 'Tunjangan', type: 'number' }, { key: 'deduction', label: 'Potongan', type: 'number' }, { key: 'net_salary', label: 'Gaji Bersih', type: 'number' }, { key: 'description', label: 'Catatan', type: 'textarea', full: true }] },
  'bank-reconcile': { title: 'Rekening Bank', breadcrumb: 'Keuangan > Rekening Bank', endpoint: '/master/bank-accounts', columns: [{ key: 'name', label: 'Nama' }, { key: 'bank_name', label: 'Bank' }, { key: 'account_number', label: 'No. Rekening' }, { key: 'balance', label: 'Saldo', align: 'right', render: rp('balance') }], formFields: [{ key: 'name', label: 'Nama Rekening', required: true }, { key: 'bank_name', label: 'Bank' }, { key: 'account_number', label: 'No. Rekening' }, { key: 'balance', label: 'Saldo', type: 'number' }, { key: 'description', label: 'Deskripsi', type: 'textarea', full: true }] },
  'budget': { title: 'Anggaran', breadcrumb: 'Keuangan > Anggaran', endpoint: '/master/budgets', columns: [{ key: 'account_name', label: 'Akun' }, { key: 'period', label: 'Periode' }, { key: 'amount', label: 'Anggaran', align: 'right', render: rp('amount') }], formFields: [{ key: 'account_name', label: 'Nama Akun', required: true }, { key: 'period', label: 'Periode' }, { key: 'amount', label: 'Anggaran', type: 'number' }, { key: 'description', label: 'Deskripsi', type: 'textarea', full: true }] },
  // Sales
  'sales-receipt': { title: 'Penerimaan Penjualan', breadcrumb: 'Penjualan > Penerimaan', endpoint: '/master/sales-receipts', columns: [{ key: 'receipt_number', label: 'No. Terima' }, { key: 'order_number', label: 'No. Order' }, { key: 'customer_name', label: 'Pelanggan' }, { key: 'amount', label: 'Jumlah', align: 'right', render: rp('amount') }, { key: 'receipt_date', label: 'Tanggal' }], formFields: [{ key: 'receipt_number', label: 'No. Penerimaan', required: true }, { key: 'order_number', label: 'No. Order' }, { key: 'customer_name', label: 'Pelanggan' }, { key: 'amount', label: 'Jumlah', type: 'number' }, { key: 'receipt_date', label: 'Tanggal', type: 'date' }, { key: 'payment_method', label: 'Metode' }, { key: 'notes', label: 'Catatan', type: 'textarea', full: true }] },
  'sales-dp': { title: 'Uang Muka Penjualan', breadcrumb: 'Penjualan > Uang Muka', endpoint: '/master/sales-dps', columns: [{ key: 'dp_number', label: 'No. DP' }, { key: 'customer_name', label: 'Pelanggan' }, { key: 'amount', label: 'Jumlah', align: 'right', render: rp('amount') }, { key: 'dp_date', label: 'Tanggal' }], formFields: [{ key: 'dp_number', label: 'No. DP', required: true }, { key: 'customer_name', label: 'Pelanggan' }, { key: 'amount', label: 'Jumlah', type: 'number' }, { key: 'dp_date', label: 'Tanggal', type: 'date' }, { key: 'notes', label: 'Catatan', type: 'textarea', full: true }] },
  'sales-return': { title: 'Retur Penjualan', breadcrumb: 'Penjualan > Retur', endpoint: '/master/sales-returns', columns: [{ key: 'return_number', label: 'No. Retur' }, { key: 'order_number', label: 'No. Order' }, { key: 'customer_name', label: 'Pelanggan' }, { key: 'amount', label: 'Jumlah', align: 'right', render: rp('amount') }], formFields: [{ key: 'return_number', label: 'No. Retur', required: true }, { key: 'order_number', label: 'No. Order' }, { key: 'customer_name', label: 'Pelanggan' }, { key: 'amount', label: 'Jumlah', type: 'number' }, { key: 'return_date', label: 'Tanggal', type: 'date' }, { key: 'reason', label: 'Alasan', type: 'textarea', full: true }] },
  'customer-category': { title: 'Kategori Pelanggan', breadcrumb: 'Penjualan > Kategori Pelanggan', endpoint: '/master/customer-categories', columns: [{ key: 'name', label: 'Nama' }, { key: 'description', label: 'Deskripsi' }], formFields: [{ key: 'name', label: 'Nama Kategori', required: true }, { key: 'description', label: 'Deskripsi', type: 'textarea', full: true }] },
  'sales-category': { title: 'Kategori Penjualan', breadcrumb: 'Penjualan > Kategori Penjualan', endpoint: '/master/sales-categories', columns: [{ key: 'name', label: 'Nama' }, { key: 'description', label: 'Deskripsi' }], formFields: [{ key: 'name', label: 'Nama Kategori', required: true }, { key: 'description', label: 'Deskripsi', type: 'textarea', full: true }] },
  'sales-target': { title: 'Target Penjualan', breadcrumb: 'Penjualan > Target', endpoint: '/master/sales-targets', columns: [{ key: 'name', label: 'Nama' }, { key: 'period', label: 'Periode' }, { key: 'target_amount', label: 'Target', align: 'right', render: rp('target_amount') }, { key: 'achieved', label: 'Tercapai', align: 'right', render: rp('achieved') }], formFields: [{ key: 'name', label: 'Nama Target', required: true }, { key: 'period', label: 'Periode' }, { key: 'target_amount', label: 'Target', type: 'number' }, { key: 'achieved', label: 'Tercapai', type: 'number' }, { key: 'description', label: 'Deskripsi', type: 'textarea', full: true }] },
  'price-adjustment': { title: 'Penyesuaian Harga/Diskon', breadcrumb: 'Penjualan > Penyesuaian Harga', endpoint: '/master/price-adjustments', columns: [{ key: 'name', label: 'Nama' }, { key: 'product_name', label: 'Produk' }, { key: 'old_price', label: 'Harga Lama', align: 'right', render: rp('old_price') }, { key: 'new_price', label: 'Harga Baru', align: 'right', render: rp('new_price') }], formFields: [{ key: 'name', label: 'Nama', required: true }, { key: 'product_name', label: 'Produk' }, { key: 'old_price', label: 'Harga Lama', type: 'number' }, { key: 'new_price', label: 'Harga Baru', type: 'number' }, { key: 'adjustment_date', label: 'Tanggal', type: 'date' }, { key: 'reason', label: 'Alasan', type: 'textarea', full: true }] },
  'sales-channel': { title: 'Saluran Penjualan', breadcrumb: 'Penjualan > Saluran Penjualan', endpoint: '/master/sales-channels', columns: [{ key: 'name', label: 'Nama' }, { key: 'description', label: 'Deskripsi' }], formFields: [{ key: 'name', label: 'Nama Saluran', required: true }, { key: 'description', label: 'Deskripsi', type: 'textarea', full: true }] },
  // Purchase
  'purchase-payment': { title: 'Pembayaran Pembelian', breadcrumb: 'Pembelian > Pembayaran', endpoint: '/master/purchase-payments', columns: [{ key: 'payment_number', label: 'No. Bayar' }, { key: 'order_number', label: 'No. PO' }, { key: 'supplier_name', label: 'Pemasok' }, { key: 'amount', label: 'Jumlah', align: 'right', render: rp('amount') }], formFields: [{ key: 'payment_number', label: 'No. Pembayaran', required: true }, { key: 'order_number', label: 'No. PO' }, { key: 'supplier_name', label: 'Pemasok' }, { key: 'amount', label: 'Jumlah', type: 'number' }, { key: 'payment_date', label: 'Tanggal', type: 'date' }, { key: 'payment_method', label: 'Metode' }, { key: 'notes', label: 'Catatan', type: 'textarea', full: true }] },
  'purchase-dp': { title: 'Uang Muka Pembelian', breadcrumb: 'Pembelian > Uang Muka', endpoint: '/master/purchase-dps', columns: [{ key: 'dp_number', label: 'No. DP' }, { key: 'supplier_name', label: 'Pemasok' }, { key: 'amount', label: 'Jumlah', align: 'right', render: rp('amount') }, { key: 'dp_date', label: 'Tanggal' }], formFields: [{ key: 'dp_number', label: 'No. DP', required: true }, { key: 'supplier_name', label: 'Pemasok' }, { key: 'amount', label: 'Jumlah', type: 'number' }, { key: 'dp_date', label: 'Tanggal', type: 'date' }, { key: 'notes', label: 'Catatan', type: 'textarea', full: true }] },
  'purchase-return': { title: 'Retur Pembelian', breadcrumb: 'Pembelian > Retur', endpoint: '/master/purchase-returns', columns: [{ key: 'return_number', label: 'No. Retur' }, { key: 'order_number', label: 'No. PO' }, { key: 'supplier_name', label: 'Pemasok' }, { key: 'amount', label: 'Jumlah', align: 'right', render: rp('amount') }], formFields: [{ key: 'return_number', label: 'No. Retur', required: true }, { key: 'order_number', label: 'No. PO' }, { key: 'supplier_name', label: 'Pemasok' }, { key: 'amount', label: 'Jumlah', type: 'number' }, { key: 'return_date', label: 'Tanggal', type: 'date' }, { key: 'reason', label: 'Alasan', type: 'textarea', full: true }] },
  'purchase-receive': { title: 'Penerimaan Pembelian', breadcrumb: 'Pembelian > Penerimaan', endpoint: '/master/purchase-receipts', columns: [{ key: 'receipt_number', label: 'No. Terima' }, { key: 'order_number', label: 'No. PO' }, { key: 'supplier_name', label: 'Pemasok' }, { key: 'receipt_date', label: 'Tanggal' }], formFields: [{ key: 'receipt_number', label: 'No. Penerimaan', required: true }, { key: 'order_number', label: 'No. PO' }, { key: 'supplier_name', label: 'Pemasok' }, { key: 'receipt_date', label: 'Tanggal', type: 'date' }, { key: 'notes', label: 'Catatan', type: 'textarea', full: true }] },
  'supplier-category': { title: 'Kategori Pemasok', breadcrumb: 'Pembelian > Kategori Pemasok', endpoint: '/master/supplier-categories', columns: [{ key: 'name', label: 'Nama' }, { key: 'description', label: 'Deskripsi' }], formFields: [{ key: 'name', label: 'Nama Kategori', required: true }, { key: 'description', label: 'Deskripsi', type: 'textarea', full: true }] },
  'supplier-price': { title: 'Harga Pemasok', breadcrumb: 'Pembelian > Harga Pemasok', endpoint: '/master/supplier-prices', columns: [{ key: 'supplier_name', label: 'Pemasok' }, { key: 'product_name', label: 'Produk' }, { key: 'price', label: 'Harga', align: 'right', render: rp('price') }], formFields: [{ key: 'supplier_name', label: 'Pemasok', required: true }, { key: 'product_name', label: 'Produk' }, { key: 'price', label: 'Harga', type: 'number' }, { key: 'description', label: 'Deskripsi', type: 'textarea', full: true }] },
  // Inventory transactions
  'stock-transfer': { title: 'Transfer Stok', breadcrumb: 'Persediaan > Transfer Stok', endpoint: '/master/stock-transfers', columns: [{ key: 'transfer_number', label: 'No. Transfer' }, { key: 'product_name', label: 'Produk' }, { key: 'from_warehouse_name', label: 'Dari' }, { key: 'to_warehouse_name', label: 'Ke' }, { key: 'quantity', label: 'Qty', align: 'right' }], extraFetch: { products: '/master/products', warehouses: '/master/warehouses' }, formFields: [{ key: 'product_id', label: 'Produk', type: 'select', optionsKey: 'products', required: true }, { key: 'from_warehouse_id', label: 'Dari Gudang', type: 'select', optionsKey: 'warehouses', required: true }, { key: 'to_warehouse_id', label: 'Ke Gudang', type: 'select', optionsKey: 'warehouses', required: true }, { key: 'quantity', label: 'Qty', type: 'number', required: true }, { key: 'notes', label: 'Catatan', type: 'textarea', full: true }] },
  'stock-opname': { title: 'Stok Opname', breadcrumb: 'Persediaan > Stok Opname', endpoint: '/master/stock-opnames', columns: [{ key: 'opname_number', label: 'No. Opname' }, { key: 'product_name', label: 'Produk' }, { key: 'system_qty', label: 'Sistem', align: 'right' }, { key: 'actual_qty', label: 'Fisik', align: 'right' }, { key: 'difference', label: 'Selisih', align: 'right' }], extraFetch: { products: '/master/products', warehouses: '/master/warehouses' }, formFields: [{ key: 'product_id', label: 'Produk', type: 'select', optionsKey: 'products', required: true }, { key: 'warehouse_id', label: 'Gudang', type: 'select', optionsKey: 'warehouses' }, { key: 'actual_qty', label: 'Qty Fisik (Aktual)', type: 'number', required: true }, { key: 'notes', label: 'Catatan', type: 'textarea', full: true }] },
  'stock-adjustment': { title: 'Penyesuaian Stok', breadcrumb: 'Persediaan > Penyesuaian Stok', endpoint: '/master/stock-adjustments', columns: [{ key: 'adjustment_number', label: 'No. Penyesuaian' }, { key: 'product_name', label: 'Produk' }, { key: 'quantity', label: 'Qty', align: 'right' }, { key: 'adjustment_type', label: 'Tipe' }, { key: 'reason', label: 'Alasan' }], extraFetch: { products: '/master/products', warehouses: '/master/warehouses' }, formFields: [{ key: 'product_id', label: 'Produk', type: 'select', optionsKey: 'products', required: true }, { key: 'warehouse_id', label: 'Gudang', type: 'select', optionsKey: 'warehouses' }, { key: 'quantity', label: 'Qty', type: 'number', required: true }, { key: 'adjustment_type', label: 'Tipe', type: 'select', options: [{ value: 'IN', name: 'Tambah (IN)' }, { value: 'OUT', name: 'Kurang (OUT)' }] }, { key: 'reason', label: 'Alasan', type: 'textarea', full: true }] },
  // Product
  'subcategories': { title: 'Sub Kategori', breadcrumb: 'Produk > Sub Kategori', endpoint: '/master/subcategories', columns: [{ key: 'name', label: 'Nama' }, { key: 'category_name', label: 'Kategori Induk' }, { key: 'description', label: 'Deskripsi' }], extraFetch: { categories: '/master/categories' }, formFields: [{ key: 'name', label: 'Nama Sub Kategori', required: true }, { key: 'category_id', label: 'Kategori Induk', type: 'select', optionsKey: 'categories' }, { key: 'description', label: 'Deskripsi', type: 'textarea', full: true }] },
  // POS
  'pos-setting': { title: 'Pengaturan POS', breadcrumb: 'Kasir POS > Pengaturan', endpoint: '/master/pos-settings', columns: [{ key: 'name', label: 'Parameter' }, { key: 'value', label: 'Nilai' }, { key: 'description', label: 'Deskripsi' }], formFields: [{ key: 'name', label: 'Parameter', required: true }, { key: 'value', label: 'Nilai' }, { key: 'description', label: 'Deskripsi', type: 'textarea', full: true }] },
  'sales-type': { title: 'Tipe Penjualan', breadcrumb: 'Kasir POS > Tipe Penjualan', endpoint: '/master/sales-types', columns: [{ key: 'name', label: 'Nama' }, { key: 'description', label: 'Deskripsi' }], formFields: [{ key: 'name', label: 'Nama Tipe', required: true }, { key: 'description', label: 'Deskripsi', type: 'textarea', full: true }] },
  'expense-category': { title: 'Kategori Beban', breadcrumb: 'Kasir POS > Kategori Beban', endpoint: '/master/expense-categories', columns: [{ key: 'name', label: 'Nama' }, { key: 'description', label: 'Deskripsi' }], formFields: [{ key: 'name', label: 'Nama Kategori', required: true }, { key: 'description', label: 'Deskripsi', type: 'textarea', full: true }] },
  'promotion': { title: 'Promosi', breadcrumb: 'Kasir POS > Promosi', endpoint: '/master/promotions', columns: [{ key: 'name', label: 'Nama' }, { key: 'promo_type', label: 'Tipe' }, { key: 'value', label: 'Nilai', align: 'right' }, { key: 'start_date', label: 'Mulai' }, { key: 'end_date', label: 'Selesai' }], formFields: [{ key: 'name', label: 'Nama Promo', required: true }, { key: 'promo_type', label: 'Tipe', type: 'select', options: [{ value: 'PERCENT', name: 'Persentase (%)' }, { value: 'FIXED', name: 'Nominal Tetap (Rp)' }] }, { key: 'value', label: 'Nilai', type: 'number' }, { key: 'start_date', label: 'Mulai', type: 'date' }, { key: 'end_date', label: 'Selesai', type: 'date' }, { key: 'description', label: 'Deskripsi', type: 'textarea', full: true }] },
  // Setting
  'preferences': { title: 'Preferensi', breadcrumb: 'Pengaturan > Preferensi', endpoint: '/master/app-settings', columns: [{ key: 'name', label: 'Parameter' }, { key: 'value', label: 'Nilai' }, { key: 'description', label: 'Deskripsi' }], formFields: [{ key: 'name', label: 'Parameter', required: true }, { key: 'value', label: 'Nilai' }, { key: 'description', label: 'Deskripsi', type: 'textarea', full: true }] },
  'auto-number': { title: 'Auto Number', breadcrumb: 'Pengaturan > Auto Number', endpoint: '/master/auto-numbers', columns: [{ key: 'module', label: 'Modul' }, { key: 'prefix', label: 'Prefix' }, { key: 'next_number', label: 'Nomor Berikutnya', align: 'right' }], formFields: [{ key: 'module', label: 'Modul', required: true }, { key: 'prefix', label: 'Prefix' }, { key: 'next_number', label: 'Nomor Berikutnya', type: 'number' }, { key: 'description', label: 'Deskripsi', type: 'textarea', full: true }] },
};

const REPORT_CONFIGS = {
  'stock-warehouse': { title: 'Stok per Gudang', breadcrumb: 'Persediaan > Stok per Gudang', endpoint: '/analytics/stock-by-warehouse', cards: d => [{ label: 'Total Item', value: fmtNum(d?.count), icon: Package, color: 'from-blue-500 to-blue-600' }, { label: 'Nilai Total', value: fmtRupiah((d?.items || []).reduce((s, i) => s + i.value, 0)), icon: DollarSign, color: 'from-emerald-500 to-emerald-600' }], columns: [{ key: 'sku', label: 'SKU' }, { key: 'name', label: 'Produk' }, { key: 'stock_qty', label: 'Stok', align: 'right', render: r => fmtNum(r.stock_qty) + ' ' + r.uom }, { key: 'selling_price', label: 'Harga', align: 'right', render: rp('selling_price') }, { key: 'value', label: 'Nilai', align: 'right', render: rp('value') }] },
  'reorder-stock': { title: 'Pemesanan Ulang Stok', breadcrumb: 'Persediaan > Pemesanan Ulang', endpoint: '/analytics/reorder', cards: d => [{ label: 'Perlu Restock', value: fmtNum(d?.count), icon: AlertCircle, color: 'from-red-500 to-red-600' }], columns: [{ key: 'sku', label: 'SKU' }, { key: 'name', label: 'Produk' }, { key: 'category', label: 'Kategori' }, { key: 'stock_qty', label: 'Stok', align: 'right', render: r => fmtNum(r.stock_qty) }, { key: 'reorder_point', label: 'Titik Reorder', align: 'right', render: r => fmtNum(r.reorder_point) }, { key: 'suggested_qty', label: 'Saran Pesan', align: 'right', render: r => fmtNum(r.suggested_qty) }] },
  'product-performance': { title: 'Kinerja Produk', breadcrumb: 'Produk > Kinerja Produk', endpoint: '/analytics/product-performance', cards: d => [{ label: 'Produk Dianalisis', value: fmtNum(d?.count), icon: Package, color: 'from-teal-500 to-teal-600' }, { label: 'Total Pendapatan', value: fmtRupiah((d?.items || []).reduce((s, i) => s + i.revenue, 0)), icon: TrendingUp, color: 'from-pink-500 to-pink-600' }], columns: [{ key: 'sku', label: 'SKU' }, { key: 'name', label: 'Produk' }, { key: 'qty_sold', label: 'Terjual', align: 'right', render: r => fmtNum(r.qty_sold) }, { key: 'revenue', label: 'Pendapatan', align: 'right', render: rp('revenue') }] },
  'supplier-performance': { title: 'Kinerja Pemasok', breadcrumb: 'Pembelian > Kinerja Pemasok', endpoint: '/analytics/supplier-performance', cards: d => [{ label: 'Pemasok', value: fmtNum(d?.count), icon: Truck, color: 'from-orange-500 to-orange-600' }, { label: 'Total Pembelian', value: fmtRupiah((d?.items || []).reduce((s, i) => s + i.total_value, 0)), icon: ShoppingBag, color: 'from-indigo-500 to-indigo-600' }], columns: [{ key: 'code', label: 'Kode' }, { key: 'name', label: 'Pemasok' }, { key: 'po_count', label: 'Jumlah PO', align: 'right' }, { key: 'total_value', label: 'Total Nilai', align: 'right', render: rp('total_value') }] },
  'bank-history': { title: 'Riwayat Bank', breadcrumb: 'Keuangan > Riwayat Bank', endpoint: '/master/bank-transactions', isRaw: true, columns: [{ key: 'trx_date', label: 'Tanggal' }, { key: 'bank_name', label: 'Bank' }, { key: 'trx_type', label: 'Tipe' }, { key: 'amount', label: 'Nominal', align: 'right', render: rp('amount') }, { key: 'description', label: 'Keterangan' }] },
};

function RawListReport({ title, breadcrumb, endpoint, columns }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { const r = await api(endpoint); if (r.ok) setItems(r.data || []); setLoading(false); })(); }, [endpoint]);
  if (loading) return <div className="p-6 text-slate-500">Memuat...</div>;
  return (
    <div className="p-6 space-y-6">
      <PageHeader title={title} breadcrumb={breadcrumb} />
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden"><div className="overflow-x-auto">
        <table className="w-full text-sm"><thead className="bg-slate-50 text-xs text-slate-600 uppercase tracking-wide"><tr>{columns.map(c => <th key={c.key} className={`text-${c.align || 'left'} px-4 py-3 font-medium`}>{c.label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{items.length === 0 && <tr><td colSpan={columns.length} className="text-center py-8 text-slate-400">Tidak ada data</td></tr>}{items.map((it, i) => <tr key={i} className="hover:bg-slate-50">{columns.map(c => <td key={c.key} className={`px-4 py-3 text-${c.align || 'left'} text-slate-700`}>{c.render ? c.render(it) : String(it[c.key] ?? '-')}</td>)}</tr>)}</tbody>
        </table>
      </div></div>
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
    if (current === 'sales-transaction') return <SalesTransactionPage />;
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
    if (current === 'purchase-transaction') return <PurchaseTransactionPage />;
    if (current === 'activity-log') return <ActivityPage />;
    if (current === 'cash-flow') return <CashFlowReport />;
    if (REPORT_CONFIGS[current]) { const c = REPORT_CONFIGS[current]; return c.isRaw ? <RawListReport key={current} {...c} /> : <ReportPage key={current} {...c} />; }
    if (PAGE_CONFIGS[current]) return <MasterCRUD key={current} {...PAGE_CONFIGS[current]} />;
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
