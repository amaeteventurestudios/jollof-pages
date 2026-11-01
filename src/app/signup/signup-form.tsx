"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthHeading } from "@/components/auth/auth-shell";
import { GoogleButton, needsSite } from "@/components/auth/google-button";
import { pb } from "@/lib/pb";
import { subdomainProblem, suggestSubdomain } from "@/lib/sites";

export function SignupForm({ root, paid, price, invite }: { root: string; paid: boolean; price: string; invite?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  // the address follows the name until the author types their own
  const [typed, setTyped] = useState<string | null>(null);
  const sub = typed ?? suggestSubdomain(name);
  const [remote, setRemote] = useState<{ name: string; problem: string } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // signed in with Google: only the pen name and the website are left to choose
  const [google, setGoogle] = useState<string | null>(null);
  // opened a tester link while already signed in: one button turns on tester access
  const [existing, setExisting] = useState<string | null>(null);
  const local = sub ? subdomainProblem(sub) : "";
  const subNote = local || (remote?.name === sub ? remote.problem || "available" : "");

  // ask the server whether the address is taken, after a short pause
  useEffect(() => {
    if (!sub || subdomainProblem(sub)) return;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/sites/check?name=${encodeURIComponent(sub)}`).catch(() => null);
      const body = (await res?.json().catch(() => null)) as { ok?: boolean; problem?: string } | null;
      if (body) setRemote({ name: sub, problem: body.ok ? "" : body.problem || "" });
    }, 350);
    return () => clearTimeout(t);
  }, [sub]);

  // back from the sign-in page with a fresh Google account
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("google") && pb().authStore.isValid) void afterGoogle();
    else if (invite && pb().authStore.isValid) void Promise.resolve(String(pb().authStore.record?.email ?? "")).then(setExisting);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function claim() {
    const body = await finish(
      await fetch("/api/accounts/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: pb().authStore.token },
        body: JSON.stringify({ invite }),
      }),
    );
    await pb().collection("users").authRefresh().catch(() => undefined);
    return body;
  }

  async function afterGoogle() {
    if (!(await needsSite())) {
      if (invite) {
        try {
          await claim();
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
          return;
        }
      }
      return router.replace("/desk");
    }
    const me = pb().authStore.record;
    setGoogle(String(me?.email ?? ""));
    setName((n) => n || String(me?.name ?? ""));
  }

  async function finish(res: Response) {
    const body = (await res.json()) as { ok?: boolean; checkoutUrl?: string; error?: string };
    if (!res.ok) throw new Error(body.error || "Could not create the account.");
    return body;
  }

  if (existing)
    return (
      <>
        <AuthHeading
          title="Turn on tester access"
          sub={
            <>
              You are signed in as <strong className="text-foreground">{existing}</strong>. Use this invite on that account?
            </>
          }
        />
        {error && (
          <p role="alert" className="mb-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="grid gap-3">
          <button
            type="button"
            className="auth-go"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await claim();
                router.replace("/desk");
              } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
                setBusy(false);
              }
            }}
          >
            {busy ? "Opening your Desk…" : "Open my Desk"}
          </button>
          <button
            type="button"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            onClick={() => {
              pb().authStore.clear();
              setExisting(null);
            }}
          >
            Use a different email
          </button>
        </div>
      </>
    );

  return (
    <>
      <AuthHeading
        title={google ? "Almost there" : invite ? "Create your tester account" : "Create your Desk"}
        sub={
          google ? (
            <>
              Signed in with Google as <strong className="text-foreground">{google}</strong>. Pick your pen name and your website.
            </>
          ) : (
            invite ? "Your email is your username. Pick a password and you are in." : "Start writing in minutes. Your author site comes with it."
          )
        }
      />
      {!google && <GoogleButton label="Sign up with Google" onError={setError} onSignedIn={afterGoogle} />}
      <form
        className="grid gap-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            let body;
            if (google) {
              body = await finish(
                await fetch("/api/accounts/google", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: pb().authStore.token },
                  body: JSON.stringify({ name, subdomain: sub, invite }),
                }),
              );
            } else {
              body = await finish(
                await fetch("/api/accounts", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name, email, password, subdomain: sub, invite }),
                }),
              );
              await pb().collection("users").authWithPassword(email, password);
            }
            if (body.checkoutUrl) window.location.assign(body.checkoutUrl);
            else router.replace("/desk");
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setBusy(false);
          }
        }}
      >
        <label className="auth-rise d3 grid gap-2">
          <span className="text-sm font-medium">Author or pen name</span>
          <input required maxLength={120} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tola Ekanem" className="auth-field" />
        </label>
        <div className="auth-rise d3 grid gap-2">
          <label htmlFor="sub" className="text-sm font-medium">
            Your website
          </label>
          <div className="auth-field flex items-center pr-4">
            <input
              id="sub"
              required
              value={sub}
              onChange={(e) => setTyped(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="yourname"
              className="h-full min-w-0 flex-1 bg-transparent text-base outline-none"
              aria-describedby="sub-note"
            />
            <span className="text-base text-muted-foreground">.{root}</span>
          </div>
          <p id="sub-note" className={`min-h-5 text-sm ${subNote === "available" ? "text-ok" : "text-destructive"}`} role="status">
            {subNote === "available" ? `${sub}.${root} is yours to take.` : subNote}
          </p>
        </div>
        {!google && (
          <>
            <label className="auth-rise d4 grid gap-2">
              <span className="text-sm font-medium">Email</span>
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="auth-field" />
            </label>
            <label className="auth-rise d4 grid gap-2">
              <span className="text-sm font-medium">Password</span>
              <input type="password" required minLength={10} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 10 characters" className="auth-field" />
            </label>
          </>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy || subNote !== "available"} className="auth-go auth-rise d5 mt-1">
          {busy ? "Creating your Desk…" : paid ? `Continue to payment (${price})` : "Create my Desk"}
        </button>
      </form>
    </>
  );
}
