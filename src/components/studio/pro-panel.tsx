"use client";

import { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/studio/book/details-tab";
import { pb } from "@/lib/pb";

export interface ProStatus {
  available: boolean;
  prices: { month: number; year: number };
  pro: boolean;
  until: string;
  interval: "" | "month" | "year";
  status: string;
  canManage: boolean;
  freeDomain: { configured: boolean; used: boolean };
  domains: { id: string; domain: string; status: string; error: string; expires: string }[];
  payouts: { ready: boolean; started: boolean };
  mail: boolean;
}

const money = (c: number) => `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`;
const auth = () => ({ Authorization: pb().authStore.token, "Content-Type": "application/json" });

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: auth(), body: body === undefined ? undefined : JSON.stringify(body) });
  const out = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(out.error || "That did not work. Try again.");
  return out;
}

/** The studio's view of /api/pro, refreshed after returning from Stripe. */
export function useProStatus(): { status: ProStatus | null; reload: () => void } {
  const [status, setStatus] = useState<ProStatus | null>(null);
  const reload = useCallback(() => {
    fetch("/api/pro", { headers: auth() })
      .then((r) => (r.ok ? r.json() : null))
      .then(setStatus)
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session = params.get("session_id");
    const done = params.get("pro") === "paid" && session ? post("/api/pro/confirm", { sessionId: session }).catch(() => undefined) : Promise.resolve();
    if (params.has("pro") || params.has("payouts")) window.history.replaceState(null, "", window.location.pathname);
    done.then(reload);
  }, [reload]);
  return { status, reload };
}

const PRO_FEATURES = ["Your own domain, with a free .com for the first year on the yearly plan", "Newsletters to your reader list", "Sell ebooks straight from your site; the money goes to you", "Analytics: visits, where readers come from, sign-ups and sales"];

/** Author Site Pro: the plan, the free .com and where ebook money is paid. */
export function ProPanel({ status, reload, home = false }: { status: ProStatus | null; reload: () => void; home?: boolean }) {
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  async function go(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setMsg("");
    try {
      await fn();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }
  const redirect = (url: string, body?: unknown) => go(url, async () => window.location.assign((await post<{ url: string }>(url, body)).url));

  if (!status) return null;
  const active = status.pro;
  const domain = status.domains[0];

  // the publisher site has every Pro tool already; it only needs somewhere to be paid
  if (home)
    return (
      <Panel title="Payouts for ebook sales" description="Where money from ebooks sold on your site is paid.">
        <Payouts status={status} busy={busy} onSetup={() => redirect("/api/payouts/onboard")} />
        <p className="text-sm text-destructive" role="status">
          {msg}
        </p>
      </Panel>
    );

  return (
    <Panel title="Author Site Pro" description={active ? `Active${status.interval ? `, billed ${status.interval === "year" ? "yearly" : "monthly"}` : ""}${status.status === "canceling" ? ". Ends at the close of this period" : ""}.` : "Optional. Your free site and studio stay yours whether or not you have Pro."}>
      <ul className="grid gap-1.5 text-sm">
        {PRO_FEATURES.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            {f}
          </li>
        ))}
      </ul>

      {!active &&
        (status.available ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" disabled={!!busy} onClick={() => redirect("/api/pro/checkout", { interval: "month" })}>
              {money(status.prices.month)} a month
            </Button>
            <Button disabled={!!busy} onClick={() => redirect("/api/pro/checkout", { interval: "year" })}>
              {money(status.prices.year)} a year{status.freeDomain.configured ? ", free .com included" : ""}
            </Button>
          </div>
        ) : (
          <p className="rounded-md bg-muted p-3 text-sm">Coming soon: {money(status.prices.month)} a month or {money(status.prices.year)} a year.</p>
        ))}

      {status.canManage && (
        <div>
          <Button variant="outline" size="sm" disabled={!!busy} onClick={() => redirect("/api/pro/portal")}>
            Manage plan, card and invoices
          </Button>
        </div>
      )}

      {status.available && status.freeDomain.configured && !status.freeDomain.used && (!domain || domain.status === "failed" || domain.status === "waiting_payment") && (!active || status.interval === "year") && (
        <FreeDomain yearly={active && status.interval === "year"} price={money(status.prices.year)} onDone={reload} />
      )}
      {domain && domain.status !== "waiting_payment" && (
        <p className="text-sm">
          <span className="font-medium">{domain.domain}</span>:{" "}
          {domain.status === "active" ? `yours, connected to your site${domain.expires ? `, renews ${domain.expires.slice(0, 10)}` : ""}.` : domain.status === "registering" ? "being registered, usually under a minute." : domain.status === "failed" ? `could not be registered: ${domain.error}` : domain.status}
        </p>
      )}

      <div className="grid gap-1.5 border-t border-border pt-4">
        <p className="text-sm font-medium">Payouts for ebook sales</p>
        <Payouts status={status} busy={busy} onSetup={() => redirect("/api/payouts/onboard")} />
      </div>
      <p className="text-sm text-destructive" role="status">
        {msg}
      </p>
    </Panel>
  );
}

function Payouts({ status, busy, onSetup }: { status: ProStatus; busy: string; onSetup: () => void }) {
  if (status.payouts.ready) return <p className="text-sm text-soft">Connected. Readers&apos; payments go to your own Stripe account, minus card processing.</p>;
  return (
    <>
      <p className="text-sm text-soft">Add the bank account your sales are paid into. Stripe asks for your name, address and bank details; it takes about five minutes.</p>
      <div>
        <Button variant="outline" size="sm" disabled={!!busy || !status.available} onClick={onSetup}>
          {status.payouts.started ? "Finish setting up payouts" : "Set up payouts"}
        </Button>
      </div>
    </>
  );
}

const COUNTRIES = ["US", "GB", "NG", "CA", "GH", "KE", "ZA", "AU", "IE", "DE", "FR", "NL", "JM", "TT"];

/** Search a .com, fill in the owner's details (registries require them), then buy with yearly Pro or claim at once. */
function FreeDomain({ yearly, price, onDone }: { yearly: boolean; price: string; onDone: () => void }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ domain: string; free: boolean; reason: string } | null>(null);
  const [who, setWho] = useState({ firstName: "", lastName: "", address1: "", city: "", state: "", zip: "", country: "US", phone: "", email: String(pb().authStore.record?.email ?? "") });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/domains/check?name=${encodeURIComponent(q)}`, { headers: auth() });
      const out = (await res.json()) as { domain: string; free: boolean; reason: string; error?: string };
      if (!res.ok) throw new Error(out.error);
      setFound(out);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function claim() {
    setBusy(true);
    setMsg("");
    try {
      const out = await post<{ url?: string }>("/api/domains/claim", { domain: found?.domain, registrant: who });
      if (out.url) window.location.assign(out.url);
      else {
        setMsg("Registered. It points at your site now; give it a few minutes to work everywhere.");
        onDone();
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  const set = (k: keyof typeof who) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setWho({ ...who, [k]: e.target.value });
  return (
    <div className="grid gap-3 rounded-md bg-muted p-4">
      <p className="text-sm font-medium">Claim your free .com for the first year</p>
      <form onSubmit={search} className="flex gap-2">
        <Input aria-label="Domain name" placeholder="yourname" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button type="submit" variant="outline" disabled={busy || !q.trim()}>
          Check
        </Button>
      </form>
      {found && (found.free ? <p className="text-sm text-primary">{found.domain} is available.</p> : <p className="text-sm text-destructive">{found.reason}</p>)}
      {found?.free && (
        <>
          <p className="text-[13px] text-soft">The domain is registered in your name, with your details hidden from public lookups. Registries require them to be real.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["firstName", "First name"],
                ["lastName", "Last name"],
                ["address1", "Street address"],
                ["city", "City"],
                ["state", "State or region"],
                ["zip", "Postcode"],
                ["phone", "Phone, with country code"],
                ["email", "Email"],
              ] as [keyof typeof who, string][]
            ).map(([k, label]) => (
              <div key={k} className="grid gap-1">
                <Label htmlFor={`fd-${k}`}>{label}</Label>
                <Input id={`fd-${k}`} value={who[k]} onChange={set(k)} />
              </div>
            ))}
            <div className="grid gap-1">
              <Label htmlFor="fd-country">Country</Label>
              <select id="fd-country" value={who.country} onChange={set("country")} className="h-9 rounded-md border border-input bg-card px-3 text-sm">
                {COUNTRIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Button disabled={busy} onClick={claim}>
              {yearly ? `Register ${found.domain}` : `Get Pro yearly (${price}) with ${found.domain}`}
            </Button>
          </div>
        </>
      )}
      {msg && (
        <p className="text-sm" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}

