import { useEffect, useState } from "react";
import { api, errorMessage } from "@/api";
import { Plus, Pencil, Trash2, X, RefreshCw, Lock } from "lucide-react";
import { useAuth } from "@/auth";

/**
 * DomainPanel adalah tabel CRUD generik untuk semua domain microservice.
 *
 * Props:
 *  - title       : nama domain (mis. "Products")
 *  - listPath    : "/product/products"
 *  - itemPath    : (id) => "/product/products/:id"
 *  - columns     : [{ key, label, format? }]
 *  - fields      : [{ key, label, type?, options?, required? }]
 *  - readOnly    : true → sembunyikan tombol create/edit/delete
 *  - emptyPayload: obyek default form
 */
export default function DomainPanel({
  title,
  listPath,
  itemPath,
  columns,
  fields,
  readOnly = false,
  emptyPayload = {},
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | id string
  const [form, setForm] = useState(emptyPayload);
  const { user } = useAuth();

  const fetchRows = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get(listPath);
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [listPath]);

  const openCreate = () => {
    setForm(emptyPayload);
    setEditing("new");
  };

  const openEdit = (row) => {
    const initial = { ...emptyPayload };
    for (const f of fields) initial[f.key] = row[f.key] ?? initial[f.key];
    setForm(initial);
    setEditing(row.id);
  };

  const cancel = () => {
    setEditing(null);
    setErr("");
  };

  const save = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      if (editing === "new") {
        await api.post(listPath, form);
      } else {
        await api.put(itemPath(editing), form);
      }
      setEditing(null);
      await fetchRows();
    } catch (e2) {
      setErr(errorMessage(e2));
    }
  };

  const remove = async (id) => {
    if (!window.confirm(`Hapus record ${id}?`)) return;
    try {
      await api.delete(itemPath(id));
      await fetchRows();
    } catch (e2) {
      setErr(errorMessage(e2));
    }
  };

  const canWrite = !readOnly && !!user;

  return (
    <section
      data-testid={`panel-${title.toLowerCase()}`}
      className="border border-neutral-800 bg-neutral-950/60 backdrop-blur"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3">
        <div>
          <div className="font-mono text-[11px] tracking-widest text-amber-400">
            // {title.toUpperCase()}
          </div>
          <div className="text-xs text-neutral-500 mt-0.5 font-mono">
            {listPath} · {rows.length} rows
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRows}
            data-testid={`refresh-${title.toLowerCase()}`}
            className="inline-flex items-center gap-1.5 border border-neutral-800 hover:border-neutral-600 text-neutral-300 text-xs font-mono px-3 py-1.5 transition-colors"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            refresh
          </button>
          {canWrite && (
            <button
              onClick={openCreate}
              data-testid={`create-${title.toLowerCase()}`}
              className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-mono px-3 py-1.5 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              new
            </button>
          )}
          {readOnly && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-neutral-500">
              <Lock className="h-3 w-3" /> read-only
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-widest text-neutral-500 border-b border-neutral-800">
              {columns.map((c) => (
                <th key={c.key} className="px-5 py-2 font-mono font-normal">
                  {c.label}
                </th>
              ))}
              {canWrite && (
                <th className="px-5 py-2 font-mono font-normal text-right">
                  actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={columns.length + (canWrite ? 1 : 0)}
                  className="px-5 py-10 text-center text-neutral-600 font-mono text-xs"
                >
                  — no records —
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-neutral-900 hover:bg-neutral-900/60"
              >
                {columns.map((c) => (
                  <td key={c.key} className="px-5 py-2.5 font-mono text-neutral-300">
                    {c.format ? c.format(row[c.key], row) : String(row[c.key] ?? "")}
                  </td>
                ))}
                {canWrite && (
                  <td className="px-5 py-2.5 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        onClick={() => openEdit(row)}
                        data-testid={`edit-${title.toLowerCase()}-${row.id}`}
                        className="text-neutral-400 hover:text-amber-400 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(row.id)}
                        data-testid={`delete-${title.toLowerCase()}-${row.id}`}
                        className="text-neutral-400 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {err && (
        <div
          data-testid={`error-${title.toLowerCase()}`}
          className="px-5 py-2 text-xs text-red-400 font-mono border-t border-neutral-800"
        >
          ! {err}
        </div>
      )}

      {/* Modal form */}
      {editing !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={cancel}
        >
          <form
            onSubmit={save}
            onClick={(e) => e.stopPropagation()}
            data-testid={`form-${title.toLowerCase()}`}
            className="w-full max-w-md bg-[#0f1114] border border-neutral-800 p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <div className="font-mono text-[11px] tracking-widest text-amber-400">
                // {editing === "new" ? "CREATE" : "EDIT"} {title.toUpperCase().replace(/S$/, "")}
              </div>
              <button
                type="button"
                onClick={cancel}
                className="text-neutral-500 hover:text-neutral-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {fields.map((f) => (
              <label key={f.key} className="block">
                <span className="block font-mono text-[11px] uppercase tracking-widest text-neutral-500 mb-1.5">
                  {f.label}
                </span>
                {f.options ? (
                  <select
                    required={f.required}
                    value={form[f.key] ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, [f.key]: e.target.value })
                    }
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-400 outline-none py-2 px-3 text-neutral-100 font-mono text-sm"
                  >
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type || "text"}
                    required={f.required}
                    step={f.type === "number" ? "any" : undefined}
                    value={form[f.key] ?? ""}
                    onChange={(e) => {
                      const v =
                        f.type === "number"
                          ? e.target.value === ""
                            ? ""
                            : Number(e.target.value)
                          : e.target.value;
                      setForm({ ...form, [f.key]: v });
                    }}
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-400 outline-none py-2 px-3 text-neutral-100 font-mono text-sm"
                  />
                )}
              </label>
            ))}
            {err && (
              <div className="text-xs text-red-400 font-mono">! {err}</div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={cancel}
                className="border border-neutral-800 text-neutral-400 hover:text-neutral-100 font-mono uppercase text-xs tracking-widest px-4 py-2 transition-colors"
              >
                cancel
              </button>
              <button
                type="submit"
                data-testid={`submit-${title.toLowerCase()}`}
                className="bg-amber-400 hover:bg-amber-300 text-neutral-950 font-mono uppercase text-xs tracking-widest px-4 py-2 transition-colors"
              >
                save
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
