"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pb, errorMessage } from "@/lib/pb";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const next = params.get("next");
  const target = next && next.startsWith("/studio") ? next : "/studio";

  return (
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
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 text-base" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 text-base" />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? "Signing in…" : "Open the studio"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-paper md:grid-cols-2">
      <section className="flex flex-col justify-between bg-ink p-8 text-paper md:p-12">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Jollof Pages
        </Link>
        <div className="max-w-md py-16">
          <p className="text-[clamp(2rem,4vw,3.25rem)] leading-[1.02] tracking-[-0.02em]">Write it here. Publish it everywhere.</p>
          <p className="mt-6 text-lg text-paper/80">The private studio where Jollof Pages books are drafted, formatted for print and ebook, and sent to readers.</p>
        </div>
        <p className="text-sm text-paper/70">Accounts are created by the publisher. There is no public sign-up.</p>
      </section>
      <section className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h1 className="mb-8 text-3xl tracking-tight">Sign in</h1>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
