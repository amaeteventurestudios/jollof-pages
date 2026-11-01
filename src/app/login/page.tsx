"use client";

import { BrandName } from "@/components/brand";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthHeading, AuthShell } from "@/components/auth/auth-shell";
import { GoogleButton, needsSite } from "@/components/auth/google-button";
import { pb, errorMessage } from "@/lib/pb";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(() => params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const next = params.get("next");
  const target = next && /^\/(desk|invite|join)(\/|$)/.test(next) ? next : "/desk";

  return (
    <div className="auth-card p-6 sm:p-9">
      <AuthHeading title="Welcome back" sub="Sign in to pick up where you left off." />
      <GoogleButton
        onError={setError}
        onSignedIn={async () => {
          // a brand-new Google account still has to choose its pen name and website
          router.replace((await needsSite()) ? "/signup?google=1" : target);
        }}
      />
      <form
        className="grid gap-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await pb().collection("users").authWithPassword(email, password);
            router.replace(target);
          } catch (err) {
            const msg = errorMessage(err);
            setError(/failed to authenticate/i.test(msg) ? "That email and password do not match." : `Could not sign in: ${msg}`);
            setBusy(false);
          }
        }}
      >
        <label className="auth-rise d3 grid gap-2">
          <span className="text-sm font-medium">Email</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="auth-field" />
        </label>
        <label className="auth-rise d3 grid gap-2">
          <span className="text-sm font-medium">Password</span>
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" className="auth-field" />
        </label>
        {error && (
          <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="auth-go auth-rise d4 mt-1">
          {busy ? "Signing in…" : "Open the Desk"}
          {!busy && (
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          )}
        </button>
      </form>
      <p className="auth-rise d5 mt-7 text-center text-sm text-muted-foreground">
        New to <BrandName />?{" "}
        <Link href="/signup" className="font-semibold text-primary underline-offset-4 hover:underline">
          Create your Desk
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Write it here."
      accent="Publish it everywhere."
      lead="Your private Desk for drafting, formatting for print and ebook, and publishing to your own author site."
      points={["Write", "Format for print and Kindle", "Publish your author site"]}
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
