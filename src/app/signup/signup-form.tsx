"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pb } from "@/lib/pb";
import { subdomainProblem, suggestSubdomain } from "@/lib/sites";

export function SignupForm({ root, paid, price }: { root: string; paid: boolean; price: string }) {
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

  return (
    <form
      className="grid gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const res = await fetch("/api/accounts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password, subdomain: sub }),
          });
          const body = (await res.json()) as { ok?: boolean; checkoutUrl?: string; error?: string };
          if (!res.ok) throw new Error(body.error || "Could not create the account.");
          await pb().collection("users").authWithPassword(email, password);
          if (body.checkoutUrl) window.location.assign(body.checkoutUrl);
          else router.replace("/studio");
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
          setBusy(false);
        }
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="name">Author or pen name</Label>
        <Input id="name" required maxLength={120} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="h-11 text-base" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="sub">Your website</Label>
        <div className="flex h-11 items-center rounded-md border border-input bg-card pr-3 focus-within:ring-2 focus-within:ring-ring">
          <input
            id="sub"
            required
            value={sub}
            onChange={(e) => setTyped(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            className="h-full min-w-0 flex-1 bg-transparent px-3 text-base outline-none"
            aria-describedby="sub-note"
          />
          <span className="text-base text-soft">.{root}</span>
        </div>
        <p id="sub-note" className={subNote === "available" ? "text-sm text-primary" : "text-sm text-destructive"} role="status">
          {subNote === "available" ? `${sub}.${root} is yours to take.` : subNote}
        </p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 text-base" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" required minLength={10} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 text-base" />
        <p className="text-sm text-soft">At least 10 characters.</p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={busy || subNote !== "available"}>
        {busy ? "Creating your studio…" : paid ? `Continue to payment (${price})` : "Create my studio"}
      </Button>
    </form>
  );
}
