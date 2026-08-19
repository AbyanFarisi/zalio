import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Terminal, LogIn } from "lucide-react";
import { useAuth } from "@/auth";
import { errorMessage, gatewayURL } from "@/api";

export default function Login() {
  const { login, user, ready } = useAuth();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (ready && user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (e2) {
      setErr(errorMessage(e2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0d10] text-neutral-100 flex">
      {/* Kolom kiri: brand */}
      <aside className="hidden lg:flex flex-col justify-between w-[42%] p-14 border-r border-neutral-800 bg-[radial-gradient(ellipse_at_top_left,rgba(251,191,36,0.08),transparent_60%)]">
        <div className="flex items-center gap-3">
          <Terminal className="h-6 w-6 text-amber-400" />
          <span className="font-mono text-sm tracking-widest text-amber-400">
            MICROSERVICES/OPS
          </span>
        </div>
        <div>
          <h1 className="font-mono text-4xl leading-tight text-neutral-50">
            Five services.
            <br />
            <span className="text-amber-400">One console.</span>
          </h1>
          <p className="mt-6 text-neutral-400 text-sm max-w-md leading-relaxed">
            Login untuk mengelola identity, product, inventory, sales, dan
            finance melalui satu API gateway.
          </p>
          <div className="mt-10 font-mono text-xs text-neutral-500 space-y-1">
            <div>gateway → {gatewayURL}</div>
            <div>auth   → HS256 · Bearer · 24h</div>
          </div>
        </div>
        <div className="font-mono text-[11px] text-neutral-600">
          admin@example.com / admin123 (seeded default)
        </div>
      </aside>

      {/* Kolom kanan: form */}
      <main className="flex-1 flex items-center justify-center p-8">
        <form
          onSubmit={submit}
          data-testid="login-form"
          className="w-full max-w-sm space-y-6"
        >
          <div>
            <div className="font-mono text-[11px] tracking-widest text-amber-400">
              // SIGN IN
            </div>
            <h2 className="mt-2 text-2xl font-semibold">
              Masuk ke console
            </h2>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="block font-mono text-[11px] uppercase tracking-widest text-neutral-500 mb-2">
                email
              </span>
              <input
                data-testid="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-b border-neutral-700 focus:border-amber-400 outline-none py-2 text-neutral-100 transition-colors"
              />
            </label>
            <label className="block">
              <span className="block font-mono text-[11px] uppercase tracking-widest text-neutral-500 mb-2">
                password
              </span>
              <input
                data-testid="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-b border-neutral-700 focus:border-amber-400 outline-none py-2 text-neutral-100 transition-colors"
              />
            </label>
          </div>

          {err && (
            <div
              data-testid="login-error"
              className="text-sm text-red-400 font-mono"
            >
              ! {err}
            </div>
          )}

          <button
            type="submit"
            data-testid="login-submit"
            disabled={loading}
            className="group w-full inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-neutral-950 font-mono uppercase tracking-widest text-xs py-3 rounded-none transition-colors"
          >
            <LogIn className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            {loading ? "signing in…" : "sign in"}
          </button>
        </form>
      </main>
    </div>
  );
}
