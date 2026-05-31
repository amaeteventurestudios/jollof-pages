"use client";
import { Suspense, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ArrowLeft, Lock, Mail, Copy, Check, RefreshCw, Shield, Users, GitBranch } from "lucide-react";

function generatePassword(length = 24): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => chars[b % chars.length]).join("");
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Guard against open-redirect: only allow same-origin relative paths
  const rawRedirect = searchParams.get("redirect") ?? "/admin";
  const redirectPath =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/admin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResetPanel, setShowResetPanel] = useState(false);
  const [generatedPw, setGeneratedPw] = useState("");
  const [copied, setCopied] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("Please enter your username and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed. Please try again.");
        setLoading(false);
        return;
      }
      router.push(redirectPath);
    } catch {
      setError("Network error. Please check your connection.");
      setLoading(false);
    }
  };

  const handleGeneratePassword = useCallback(() => {
    setGeneratedPw(generatePassword());
    setCopied(false);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!generatedPw) return;
    await navigator.clipboard.writeText(generatedPw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generatedPw]);

  return (
    <div className="min-h-screen bg-[#0a0800] flex flex-col lg:flex-row">
      {/* Left panel — cinematic art + copy */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-between p-12">
        {/* Background art placeholder */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/jollof-pages/login-art-placeholder.webp')" }}
          aria-hidden="true"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0800]/95 via-[#0a0800]/70 to-transparent" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0800] via-transparent to-[#0a0800]/40" aria-hidden="true" />

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2.5 w-fit">
            <div className="w-9 h-9 rounded-xl bg-jollof-orange flex items-center justify-center shadow-lg shadow-orange-500/30">
              <span className="text-black font-black text-sm">JP</span>
            </div>
            <span className="text-lg font-bold text-jollof-text">Jollof Pages</span>
          </Link>
        </div>

        {/* Center content */}
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl xl:text-5xl font-black text-jollof-text leading-tight mb-4">
            Return to your{" "}
            <span className="text-jollof-orange">story command</span> center.
          </h1>
          <p className="text-jollof-subtext text-base leading-relaxed mb-10">
            Manage canon, scenes, panels, revisions, and approvals from one connected workspace.
          </p>

          <div className="space-y-5">
            {[
              { icon: Shield, title: "Secure access", desc: "Your stories. Your data. Protected by enterprise-grade security." },
              { icon: Users, title: "Always in control", desc: "Agents draft. Humans approve. You make the final call." },
              { icon: GitBranch, title: "Everything connected", desc: "Canon, continuity, visuals, and workflows stay in sync across your entire series." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg border border-jollof-orange/30 bg-jollof-orange/10 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-jollof-orange" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-jollof-text">{title}</div>
                  <div className="text-xs text-jollof-subtext mt-0.5 leading-relaxed">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 text-xs text-jollof-label">
          © 2024 Jollof Pages. Continuity and workflow infrastructure for graphic novel creation.
        </div>
      </div>

      {/* Right panel — login card */}
      <div className="flex-1 flex flex-col">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-jollof-orange/4 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-amber-900/8 rounded-full blur-[100px]" />
        </div>

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-5 py-4 border-b border-jollof-border relative z-10">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-jollof-orange flex items-center justify-center">
              <span className="text-black font-black text-xs">JP</span>
            </div>
            <span className="text-sm font-bold text-jollof-text">Jollof Pages</span>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-5 py-8 relative z-10">
          <div className="w-full max-w-md">
            {/* Logo — desktop */}
            <div className="hidden lg:flex flex-col items-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-jollof-orange flex items-center justify-center mb-4 shadow-lg shadow-orange-500/25">
                <span className="text-black font-black text-xl">JP</span>
              </div>
              <h2 className="text-2xl font-bold text-jollof-text">Admin Login</h2>
              <p className="text-sm text-jollof-subtext mt-1">Welcome back. Let&apos;s build stories.</p>
            </div>

            {/* Mobile heading */}
            <div className="lg:hidden mb-7 text-center">
              <h2 className="text-xl font-bold text-jollof-text">Admin Login</h2>
              <p className="text-sm text-jollof-subtext mt-1">Welcome back. Let&apos;s build stories.</p>
            </div>

            {/* Login card */}
            <div className="bg-[#121008] border border-jollof-border rounded-2xl p-7 shadow-2xl shadow-black/60">
              {!showResetPanel ? (
                <form onSubmit={handleLogin} className="space-y-5">
                  {/* Username */}
                  <div>
                    <label htmlFor="username" className="block text-xs font-medium text-jollof-subtext mb-2">
                      Email or Username
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-jollof-label" aria-hidden="true" />
                      <input
                        id="username"
                        autoFocus
                        type="text"
                        name="username"
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your email or username"
                        className="w-full bg-jollof-surface border border-jollof-border rounded-xl pl-10 pr-4 py-3 text-sm text-jollof-text placeholder:text-jollof-label focus:outline-none focus:border-jollof-orange/50 focus:ring-1 focus:ring-jollof-orange/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-xs font-medium text-jollof-subtext mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-jollof-label" aria-hidden="true" />
                      <input
                        id="password"
                        type={showPw ? "text" : "password"}
                        name="current-password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full bg-jollof-surface border border-jollof-border rounded-xl pl-10 pr-12 py-3 text-sm text-jollof-text placeholder:text-jollof-label focus:outline-none focus:border-jollof-orange/50 focus:ring-1 focus:ring-jollof-orange/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-0 top-0 bottom-0 w-11 flex items-center justify-center text-jollof-label hover:text-jollof-subtext transition-colors rounded-r-xl"
                        aria-label={showPw ? "Hide password" : "Show password"}
                      >
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Remember + Forgot */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div className="w-4 h-4 rounded border border-jollof-orange bg-jollof-orange flex items-center justify-center shrink-0">
                        <Check size={10} className="text-black" strokeWidth={3} />
                      </div>
                      <span className="text-xs text-jollof-subtext">Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowResetPanel(true)}
                      className="text-xs text-jollof-orange hover:text-orange-400 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Error */}
                  {error && (
                    <div role="alert" className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 flex items-start gap-2">
                      <span className="shrink-0 mt-0.5">⚠</span>
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-jollof-orange text-black font-bold py-3.5 rounded-xl hover:bg-orange-400 active:scale-[0.98] transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2 min-h-[52px] shadow-lg shadow-orange-500/20"
                  >
                    {loading ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        Signing in…
                      </>
                    ) : (
                      <>Log In <span aria-hidden="true">→</span></>
                    )}
                  </button>

                  {/* Security note */}
                  <div className="flex items-start gap-2.5 bg-jollof-surface/50 border border-jollof-border rounded-xl px-4 py-3">
                    <Lock size={13} className="text-jollof-label shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-[11px] text-jollof-label leading-relaxed">
                      Jollof Pages is built for creators. Only authorized users can access the workspace.
                    </p>
                  </div>
                </form>
              ) : (
                /* Password reset panel */
                <div className="space-y-5">
                  <div className="flex items-center gap-3 mb-1">
                    <button
                      type="button"
                      onClick={() => { setShowResetPanel(false); setGeneratedPw(""); setCopied(false); }}
                      className="w-8 h-8 rounded-lg border border-jollof-border flex items-center justify-center text-jollof-label hover:text-jollof-text hover:bg-jollof-panel transition-colors"
                      aria-label="Back to login"
                    >
                      <ArrowLeft size={14} />
                    </button>
                    <div>
                      <h3 className="text-sm font-semibold text-jollof-text">Reset Admin Password</h3>
                      <p className="text-xs text-jollof-subtext">Environment-variable managed credentials</p>
                    </div>
                  </div>

                  <div className="bg-amber-500/8 border border-amber-500/25 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-semibold text-amber-400">How admin passwords work</p>
                    <p className="text-xs text-jollof-subtext leading-relaxed">
                      The admin password is managed through your environment variables, not stored in a database.
                      To reset it, generate a new password below, then update{" "}
                      <code className="bg-jollof-surface px-1 py-0.5 rounded text-jollof-text font-mono text-[10px]">ADMIN_PASSWORD</code>{" "}
                      in your <code className="bg-jollof-surface px-1 py-0.5 rounded text-jollof-text font-mono text-[10px]">.env.local</code> file and in Vercel.
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-jollof-subtext mb-2.5">Generate a strong password</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-jollof-surface border border-jollof-border rounded-xl px-4 py-3 font-mono text-xs text-jollof-text truncate min-h-[48px] flex items-center">
                        {generatedPw || <span className="text-jollof-label">Click generate to create a password</span>}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopy}
                        disabled={!generatedPw}
                        className="w-11 h-11 flex items-center justify-center border border-jollof-border rounded-xl text-jollof-label hover:text-jollof-text hover:bg-jollof-panel transition-colors disabled:opacity-40 shrink-0"
                        aria-label="Copy password to clipboard"
                      >
                        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="w-full border border-jollof-orange/40 text-jollof-orange hover:bg-jollof-orange/10 font-semibold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={14} />
                    Generate Password
                  </button>

                  <div className="space-y-2 text-[11px] text-jollof-label leading-relaxed">
                    <p className="font-medium text-jollof-subtext">After generating:</p>
                    <ol className="space-y-1 list-decimal list-inside">
                      <li>Copy the generated password above.</li>
                      <li>
                        Update <code className="bg-jollof-surface px-1 rounded font-mono">ADMIN_PASSWORD</code> in{" "}
                        <code className="bg-jollof-surface px-1 rounded font-mono">.env.local</code>.
                      </li>
                      <li>Update the same variable in your Vercel project environment settings.</li>
                      <li>Restart the dev server or redeploy.</li>
                    </ol>
                    <p className="text-jollof-label/70 mt-2">
                      This tool generates a suggested password only — it does not automatically update your credentials.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Need access */}
            {!showResetPanel && (
              <div className="mt-4 bg-[#121008] border border-jollof-border rounded-2xl p-5">
                <p className="text-xs font-semibold text-jollof-text mb-1">Need access?</p>
                <p className="text-xs text-jollof-subtext mb-3">
                  If you&apos;re having trouble logging in or need access to the workspace.
                </p>
                <a
                  href="mailto:amaete@jollofpages.com"
                  className="inline-flex items-center gap-2 border border-jollof-border hover:border-jollof-orange/40 text-jollof-subtext hover:text-jollof-text text-xs px-4 py-2.5 rounded-xl transition-all"
                >
                  <Mail size={13} />
                  Contact Support
                </a>
              </div>
            )}

            {/* Back to site */}
            <div className="text-center mt-6">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs text-jollof-label hover:text-jollof-subtext transition-colors"
              >
                <ArrowLeft size={12} />
                Back to Jollof Pages
              </Link>
            </div>
          </div>
        </div>

        {/* Footer row */}
        <div className="lg:hidden px-5 py-4 border-t border-jollof-border relative z-10">
          <p className="text-center text-[10px] text-jollof-label">
            © 2024 Jollof Pages. Continuity and workflow infrastructure for graphic novel creation.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0800]" />}>
      <LoginForm />
    </Suspense>
  );
}
