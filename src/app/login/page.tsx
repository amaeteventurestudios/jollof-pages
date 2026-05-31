"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Zap } from "lucide-react";

// Prototype login — no real auth. Future: replace with real auth provider.
// See .env.example for planned env vars.

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    // Prototype: accept any credentials and redirect
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0800] relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-jollof-orange/5 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-amber-900/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-jollof-orange flex items-center justify-center mb-4 shadow-lg shadow-orange-500/20">
            <Zap size={24} className="text-black" />
          </div>
          <h1 className="text-2xl font-bold text-jollof-text">Jollof Pages</h1>
          <p className="text-sm text-jollof-subtext mt-1">Graphic Novel Production System</p>
        </div>

        {/* Card */}
        <div className="bg-[#161209] border border-jollof-border rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-jollof-text mb-6">Sign in to your workspace</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@studio.com"
                className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3.5 py-2.5 text-sm text-jollof-text placeholder:text-jollof-label focus:outline-none focus:border-jollof-orange/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3.5 py-2.5 pr-10 text-sm text-jollof-text placeholder:text-jollof-label focus:outline-none focus:border-jollof-orange/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-jollof-label hover:text-jollof-subtext"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-md px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-jollof-orange text-black font-semibold py-2.5 rounded-lg hover:bg-orange-400 transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-jollof-border">
            <p className="text-[11px] text-jollof-label text-center">
              Prototype mode · Any credentials accepted · No real auth
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-jollof-label mt-6">
          Story OS integration pending · Mock data only
        </p>
      </div>
    </div>
  );
}
