"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Coins, Gift, Inbox, Lightbulb, Loader2, Search, ShieldCheck } from "lucide-react";
import { StudioNav } from "@/components/studio/studio-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pb } from "@/lib/pb";
import { siteLabel, siteUrl } from "@/lib/sites";
import { money, type MoneyKind, type Overview, type Payment, type Writer } from "@/lib/admin";
import { cn } from "@/lib/utils";

const auth = () => ({ Authorization: `Bearer ${pb().authStore.token}`, "Content-Type": "application/json" });

async function call<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, body === undefined ? { headers: auth() } : { method: "POST", headers: auth(), body: JSON.stringify(body) });
  const j = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(j.error || `Request failed (${res.status}).`);
  return j;
}

const date = (iso: string) => new Date(iso.replace(" ", "T")).toLocaleDateString(undefined, { dateStyle: "medium" });
function ago(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso.replace(" ", "T")).getTime()) / 86400_000);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : days < 30 ? `${days} days ago` : date(iso);
}

type Tab = "overview" | "writers" | "money";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "writers", label: "Writers" },
  { id: "money", label: "Money" },
];

/** The owner's admin: signups, writers, and every dollar that came in. The server checks who may see it. */
export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<{ overview: Overview; payments: Payment[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    call<{ overview: Overview; payments: Payment[] }>("/api/admin")
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <StudioNav />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
        <p className="flex items-center gap-2 text-sm font-medium tracking-[0.12em] text-primary uppercase">
          <ShieldCheck className="size-4" /> Admin
        </p>
        <h1 className="mt-2 text-[clamp(1.75rem,3vw,2.5rem)] leading-tight tracking-[-0.02em]">Your business at a glance</h1>
        <p className="mt-1 text-soft">Only you can see this page.</p>

        <div className="mt-8 flex flex-wrap items-center gap-1 border-b border-border" role="tablist" aria-label="Admin">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn("-mb-px h-10 border-b-2 px-4 text-sm font-medium", tab === t.id ? "border-primary text-primary" : "border-transparent text-ink-2 hover:text-ink")}
            >
              {t.label}
            </button>
          ))}
          <Link href="/studio/help#inbox" className="ml-auto inline-flex h-10 items-center gap-1.5 px-3 text-sm text-ink-2 hover:text-primary">
            <Inbox className="size-4" /> Tickets
          </Link>
          <Link href="/studio/ideas" className="inline-flex h-10 items-center gap-1.5 px-3 text-sm text-ink-2 hover:text-primary">
            <Lightbulb className="size-4" /> Feature requests
          </Link>
        </div>

        {error ? (
          <p className="mt-6 bg-danger-soft p-3 text-sm text-destructive">{error}</p>
        ) : !data ? (
          <p className="mt-6 flex items-center gap-2 text-soft">
            <Loader2 className="size-4 animate-spin" /> Adding things up…
          </p>
        ) : tab === "overview" ? (
          <OverviewView o={data.overview} />
        ) : tab === "writers" ? (
          <WritersView />
        ) : (
          <MoneyView payments={data.payments} o={data.overview} />
        )}
      </main>
    </>
  );
}

function Tile({ label, value, sub, href }: { label: string; value: string | number; sub?: string; href?: string }) {
  const body = (
    <>
      <p className="text-[13px] text-soft">{label}</p>
      <p className="mt-1 text-[1.75rem] leading-none font-semibold tracking-tight text-ink tabular-nums">{value}</p>
      {sub && <p className="mt-2 text-[13px] text-ink-2">{sub}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="group relative border border-border bg-card p-4 hover:border-primary">
      {body}
      <ArrowUpRight className="absolute top-3 right-3 size-4 text-soft group-hover:text-primary" />
    </Link>
  ) : (
    <div className="border border-border bg-card p-4">{body}</div>
  );
}

function OverviewView({ o }: { o: Overview }) {
  const m = o.money;
  const total = m.studioCents + m.creditCents + m.ebookFeeCents;
  return (
    <div className="mt-6 grid gap-8">
      <section>
        <h2 className="text-sm font-medium tracking-wide text-soft uppercase">Money</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label="Total earned" value={money(total)} sub={`${money(m.thisMonthCents)} this month`} />
          <Tile label="Studio sales" value={money(m.studioCents)} sub={`${m.studioCount} ${m.studioCount === 1 ? "writer" : "writers"} paid`} />
          <Tile label="AI cover credits sold" value={money(m.creditCents)} sub={`${m.creditCount} purchases, ${m.creditsUsed} credits used`} />
          <Tile label="Ebook sales (your fees)" value={money(m.ebookFeeCents)} sub={`${m.ebookCount} sold, ${money(m.ebookCents)} to writers`} />
        </div>
      </section>
      <section>
        <h2 className="text-sm font-medium tracking-wide text-soft uppercase">Writers</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label="Accounts" value={o.writers.total} sub={`${o.writers.new7} new this week, ${o.writers.new30} this month`} />
          <Tile label="Paid" value={o.writers.paid} sub={`${o.writers.comp} given free access`} />
          <Tile label="Signed up, not paid yet" value={o.writers.pending} sub={`plus ${o.writers.collaborator} invited collaborators`} />
          <Tile label="Books in the studio" value={o.books} sub={`Author Site Pro: ${o.money.proMonthly} monthly, ${o.money.proYearly} yearly`} />
        </div>
        <Signups days={o.signups} />
      </section>
      <section>
        <h2 className="text-sm font-medium tracking-wide text-soft uppercase">Support</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label="Tickets waiting for you" value={o.tickets.open} sub={`${o.tickets.answered} answered, waiting on the writer`} href="/studio/help#inbox" />
          <Tile label="New feature requests" value={o.ideas.new} sub={`${o.ideas.total} ideas in all`} href="/studio/ideas" />
        </div>
      </section>
    </div>
  );
}

/** Sign-ups per day for the last 30 days: one series, so no legend; each bar names its day on hover. */
function Signups({ days }: { days: Overview["signups"] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((s, d) => s + d.count, 0);
  const label = (d: string) => new Date(d + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return (
    <figure className="mt-3 border border-border bg-card p-4">
      <figcaption className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-ink">Sign-ups, last 30 days</span>
        <span className="text-soft tabular-nums">{total} in all</span>
      </figcaption>
      <div className="relative mt-4 h-32">
        <div aria-hidden className="absolute inset-x-0 bottom-0 border-t border-border" />
        <div className="absolute inset-0 flex items-end gap-[2px]" role="list" aria-label="Sign-ups per day">
          {days.map((d) => (
            <div key={d.date} role="listitem" className="group relative flex h-full flex-1 items-end" aria-label={`${label(d.date)}: ${d.count}`}>
              <div className={cn("w-full rounded-t-[4px]", d.count ? "bg-primary group-hover:opacity-80" : "")} style={{ height: d.count ? `${(d.count / max) * 100}%` : 0 }} />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 border border-border bg-popover px-2 py-1 text-xs whitespace-nowrap text-ink shadow group-hover:block">
                {label(d.date)}: {d.count}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1.5 flex justify-between text-[12px] text-soft">
        <span>{label(days[0].date)}</span>
        <span>Today</span>
      </div>
    </figure>
  );
}

const ACCESS: Record<Writer["access"], { label: string; cls: string }> = {
  paid: { label: "Paid", cls: "bg-primary-soft text-primary" },
  comp: { label: "Free access", cls: "bg-[#e3ecfa] text-[#1d4f91]" },
  pending: { label: "Not paid", cls: "bg-paper-2 text-soft" },
  collaborator: { label: "Collaborator", cls: "bg-[#fbecd0] text-[#7a4b06]" },
};

type WriterFilter = "writers" | "all" | Writer["access"];

function WritersView() {
  const [list, setList] = useState<Writer[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<WriterFilter>("writers");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    call<{ writers: Writer[] }>("/api/admin/writers")
      .then((j) => setList(j.writers))
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="mt-6 bg-danger-soft p-3 text-sm text-destructive">{error}</p>;
  if (!list) return <p className="mt-6 text-soft">Loading writers…</p>;
  const needle = q.trim().toLowerCase();
  const shown = list.filter(
    (w) =>
      (filter === "all" || (filter === "writers" ? w.access !== "collaborator" : w.access === filter)) &&
      (!needle || `${w.email} ${w.name} ${w.site?.subdomain ?? ""} ${w.site?.custom_domain ?? ""}`.toLowerCase().includes(needle)),
  );
  const replace = (w: Writer) => setList((all) => (all ?? []).map((x) => (x.id === w.id ? w : x)));

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-soft" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email, name or site" aria-label="Search writers" className="pl-9" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value as WriterFilter)} aria-label="Show" className="h-10 border border-input bg-card px-2 text-sm">
          <option value="writers">Writers ({list.filter((w) => w.access !== "collaborator").length})</option>
          <option value="paid">Paid ({list.filter((w) => w.access === "paid").length})</option>
          <option value="comp">Free access ({list.filter((w) => w.access === "comp").length})</option>
          <option value="pending">Not paid ({list.filter((w) => w.access === "pending").length})</option>
          <option value="collaborator">Collaborators ({list.filter((w) => w.access === "collaborator").length})</option>
          <option value="all">Everyone ({list.length})</option>
        </select>
      </div>

      <div className="mt-4 overflow-x-auto border border-border bg-card">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-border text-[12.5px] text-soft">
            <tr>
              <th className="px-3 py-2 font-medium">Writer</th>
              <th className="px-3 py-2 font-medium">Plan</th>
              <th className="px-3 py-2 text-right font-medium">Books</th>
              <th className="px-3 py-2 font-medium">Last active</th>
              <th className="px-3 py-2 font-medium">Site</th>
              <th className="px-3 py-2 text-right font-medium">Credits</th>
              <th className="px-3 py-2 text-right font-medium">Spent</th>
              <th className="px-3 py-2 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((w) => (
              <WriterRow key={w.id} w={w} open={open === w.id} onToggle={() => setOpen(open === w.id ? null : w.id)} onChange={replace} />
            ))}
          </tbody>
        </table>
        {!shown.length && <p className="p-4 text-soft">No writers match.</p>}
      </div>
    </div>
  );
}

function WriterRow({ w, open, onToggle, onChange }: { w: Writer; open: boolean; onToggle: () => void; onChange: (w: Writer) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [credits, setCredits] = useState("20");
  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    setErr("");
    try {
      onChange((await call<{ writer: Writer }>("/api/admin/writers", { id: w.id, ...body })).writer);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <tr className={cn("cursor-pointer border-b border-border last:border-0 hover:bg-muted/50", open && "bg-muted/50")} onClick={onToggle} aria-expanded={open}>
        <td className="px-3 py-2.5">
          <p className="font-medium text-ink">{w.name || w.email.split("@")[0]}</p>
          <p className="text-[12.5px] text-soft">{w.email}</p>
        </td>
        <td className="px-3 py-2.5">
          <span className={cn("px-2 py-0.5 text-xs font-medium whitespace-nowrap", ACCESS[w.access].cls)}>{ACCESS[w.access].label}</span>
          {w.pro && <span className="ml-1 bg-ink px-2 py-0.5 text-xs font-medium text-card">Pro</span>}
        </td>
        <td className="px-3 py-2.5 text-right tabular-nums">{w.books}</td>
        <td className="px-3 py-2.5 whitespace-nowrap">{ago(w.lastActive)}</td>
        <td className="px-3 py-2.5">
          {w.site?.home || w.site?.subdomain || w.site?.custom_domain ? (
            <a href={siteUrl(w.site)} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="text-primary hover:underline">
              {siteLabel(w.site)}
            </a>
          ) : (
            <span className="text-soft">None yet</span>
          )}
        </td>
        <td className="px-3 py-2.5 text-right tabular-nums">{w.credits}</td>
        <td className="px-3 py-2.5 text-right tabular-nums">{money(w.spentCents)}</td>
        <td className="px-3 py-2.5 whitespace-nowrap">{date(w.created)}</td>
      </tr>
      {open && (
        <tr className="border-b border-border bg-muted/30">
          <td colSpan={8} className="px-3 py-3">
            <div className="flex flex-wrap items-center gap-3">
              {(w.access === "comp" || w.access === "pending") && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => act({ action: w.access === "comp" ? "pending" : "comp" })}>
                  <Gift /> {w.access === "comp" ? "Take back free access" : "Give free access"}
                </Button>
              )}
              <span className="flex items-center gap-2">
                <Input type="number" value={credits} onChange={(e) => setCredits(e.target.value)} className="h-8 w-20" aria-label="Credits to give" />
                <Button size="sm" variant="outline" disabled={busy || !Number(credits)} onClick={() => act({ action: "grant", credits: Number(credits) })}>
                  <Coins /> Give AI credits
                </Button>
              </span>
              <a href={`mailto:${w.email}`} className="text-sm text-primary hover:underline">
                Email {w.email}
              </a>
              {busy && <Loader2 className="size-4 animate-spin text-soft" />}
            </div>
            {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
          </td>
        </tr>
      )}
    </>
  );
}

const KIND: Record<MoneyKind, string> = { studio: "Studio", credits: "AI credits", ebook: "Ebook" };

function MoneyView({ payments, o }: { payments: Payment[]; o: Overview }) {
  const [kind, setKind] = useState<"all" | MoneyKind>("all");
  const shown = payments.filter((p) => kind === "all" || p.kind === kind);
  const m = o.money;
  return (
    <div className="mt-6 grid gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Studio" value={money(m.studioCents)} sub={`${m.studioCount} sales`} />
        <Tile label="AI credits" value={money(m.creditCents)} sub={`${m.creditCount} purchases`} />
        <Tile label="Ebook fees" value={money(m.ebookFeeCents)} sub={`on ${money(m.ebookCents)} of sales`} />
        <Tile label="This month" value={money(m.thisMonthCents)} />
      </div>
      <p className="text-[13px] text-soft">Amounts before Stripe&apos;s fees. Author Site Pro renewals are in your Stripe dashboard.</p>
      <div>
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Payments">
          {(["all", "studio", "credits", "ebook"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              onClick={() => setKind(k)}
              className={cn("h-9 border px-3 text-sm", kind === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary")}
            >
              {k === "all" ? "All" : KIND[k]}
            </button>
          ))}
        </div>
        <div className="mt-3 overflow-x-auto border border-border bg-card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-[12.5px] text-soft">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Writer</th>
                <th className="px-3 py-2 font-medium">Details</th>
                <th className="px-3 py-2 text-right font-medium">Paid</th>
                <th className="px-3 py-2 text-right font-medium">You keep</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap">{date(p.at)}</td>
                  <td className="px-3 py-2">{KIND[p.kind]}</td>
                  <td className="px-3 py-2">{p.email}</td>
                  <td className="px-3 py-2 text-ink-2">{p.note}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{money(p.cents)}</td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{money(p.keepCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length && <p className="p-4 text-soft">No payments yet.</p>}
        </div>
      </div>
    </div>
  );
}
