"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { StudioNav } from "@/components/studio/studio-nav";
import { Button } from "@/components/ui/button";
import { useProStatus } from "@/components/studio/pro-panel";
import { errorMessage, pb } from "@/lib/pb";
import { fmt } from "@/lib/progress";
import { userId } from "@/lib/studio";

interface Stat {
  date: string;
  kind: "view" | "visitor" | "ref" | "signup" | "buy_click" | "sale" | "revenue";
  key: string;
  count: number;
}
interface Order {
  id: string;
  amount_cents: number;
  fee_cents: number;
  created: string;
  expand?: { book?: { title: string } };
}

const PERIODS = [7, 30, 90] as const;

/** Days in UTC, the way the server counts them, oldest first. */
function utcDays(n: number): string[] {
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => new Date(now - (n - 1 - i) * 86400000).toISOString().slice(0, 10));
}

function totals(rows: Stat[], kind: Stat["kind"]): [string, number][] {
  const m = new Map<string, number>();
  for (const r of rows) if (r.kind === kind) m.set(r.key, (m.get(r.key) ?? 0) + r.count);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

const money = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Who visits the author's site, where they come from, and what they do there. */
export default function StatsPage() {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [rows, setRows] = useState<Stat[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const { status } = useProStatus();
  const pro = !!status?.pro;

  useEffect(() => {
    const from = utcDays(90)[0];
    Promise.all([
      pb()
        .collection("site_stats")
        .getFullList<Stat>({ filter: pb().filter("owner = {:u} && date >= {:d}", { u: userId(), d: from }), fields: "date,kind,key,count" }),
      pb()
        .collection("orders")
        .getFullList<Order>({ filter: pb().filter("owner = {:u} && created >= {:d}", { u: userId(), d: `${from} 00:00:00` }), sort: "-created", expand: "book" }),
    ])
      .then(([s, o]) => {
        setRows(s);
        setOrders(o);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);

  const dates = useMemo(() => utcDays(days), [days]);
  const inRange = useMemo(() => rows.filter((r) => r.date >= dates[0]), [rows, dates]);
  const sum = (kind: Stat["kind"]) => inRange.reduce((s, r) => s + (r.kind === kind ? r.count : 0), 0);
  const visitors = sum("visitor");
  const views = sum("view");
  const signups = sum("signup");
  const clicks = sum("buy_click");
  const sales = orders.filter((o) => o.created.slice(0, 10) >= dates[0]);
  const revenue = sales.reduce((s, o) => s + o.amount_cents - (o.fee_cents || 0), 0);
  const pct = (n: number) => (visitors ? `${((n / visitors) * 100).toFixed(1)}%` : "–");

  const tiles: [string, string, string?][] = [
    ["Visitors", fmt(visitors)],
    ["Page views", fmt(views)],
    ["Reader sign-ups", fmt(signups), `${pct(signups)} of visitors`],
    ["Store clicks", fmt(clicks), `${pct(clicks)} of visitors`],
    ["Ebooks sold", fmt(sales.length)],
    ["Your earnings", money(revenue), "after the Jollof Pages fee, before card processing"],
  ];
  const sold = new Map<string, number>();
  for (const o of sales) {
    const t = o.expand?.book?.title ?? "A deleted book";
    sold.set(t, (sold.get(t) ?? 0) + 1);
  }

  return (
    <>
      <StudioNav />
      <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-end gap-3">
          <h1 className="mr-auto text-[clamp(1.75rem,3vw,2.5rem)] tracking-[-0.02em]">Analytics</h1>
          <div className="flex gap-1" role="group" aria-label="Period">
            {PERIODS.map((p) => (
              <Button key={p} size="sm" variant={days === p ? "secondary" : "ghost"} aria-pressed={days === p} onClick={() => setDays(p)}>
                {p} days
              </Button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-sm text-soft">Your website&apos;s visits, counted without cookies and without storing anything about your readers. Days run midnight to midnight UTC.</p>
        {error && <p className="mt-4 text-destructive">{error}</p>}

        <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-md bg-border sm:grid-cols-3">
          {tiles.map(([k, v, note], i) => {
            const locked = !pro && i >= 2;
            return (
              <div key={k} className="bg-card p-5">
                <dt className="text-sm text-soft">{k}</dt>
                <dd className="tabular mt-1 text-2xl">{locked ? <Lock className="mt-1 size-5 text-soft" aria-label="Part of Pro" /> : v}</dd>
                {note && !locked && <dd className="mt-0.5 text-[13px] text-soft">{note}</dd>}
              </div>
            );
          })}
        </dl>

        <section className="mt-10">
          <h2 className="text-lg font-medium">Visitors and page views</h2>
          <VisitChart dates={dates} rows={inRange} />
        </section>

        {pro ? (
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <TopList title="Most-read pages" rows={totals(inRange, "view")} empty="No visits yet." />
            <TopList title="Where visitors come from" rows={totals(inRange, "ref")} empty="Nobody has followed a link here yet. Visits typed in or from apps don't say where they came from." />
            <TopList title="Store clicks" rows={totals(inRange, "buy_click")} empty="No clicks on your buy buttons yet." />
            <TopList title="Sign-ups by page" rows={totals(inRange, "signup")} empty="No new readers yet." />
            <TopList title="Ebooks sold here" rows={[...sold.entries()].sort((a, b) => b[1] - a[1])} empty="No direct sales yet." />
          </div>
        ) : (
          status && (
            <div className="mt-10 rounded-md bg-muted p-5">
              <p className="font-medium">See where your readers come from</p>
              <p className="mt-1 text-sm text-soft">Author Site Pro adds the pages people read, the sites that send them, which stores they click, sign-ups and sales.</p>
              <Link href="/studio/site" className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline">
                {status.available ? "See Pro" : "Coming soon"}
              </Link>
            </div>
          )
        )}
      </main>
    </>
  );
}

function VisitChart({ dates, rows }: { dates: string[]; rows: Stat[] }) {
  const by = (kind: Stat["kind"]) => {
    const m = new Map<string, number>();
    for (const r of rows) if (r.kind === kind) m.set(r.date, (m.get(r.date) ?? 0) + r.count);
    return dates.map((d) => m.get(d) ?? 0);
  };
  const visitors = by("visitor");
  const views = by("view");
  const max = Math.max(10, ...views, ...visitors);
  const W = 720;
  const H = 180;
  const bw = W / dates.length;
  const y = (v: number) => H - (v / max) * (H - 8);
  const every = dates.length > 31 ? 14 : 7;
  const line = views.map((v, i) => `${i ? "L" : "M"}${i * bw + bw / 2},${y(v)}`).join(" ");
  return (
    <figure className="mt-4 rounded-md bg-card p-4">
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full" role="img" aria-label={`Visitors and page views per day over the last ${dates.length} days`}>
        {visitors.map((v, i) => (
          <g key={dates[i]}>
            <rect x={i * bw + 1} y={y(v)} width={Math.max(bw - 2, 1)} height={H - y(v)} rx={2} fill="var(--primary)">
              <title>{`${dates[i]}: ${fmt(v)} visitors, ${fmt(views[i])} page views`}</title>
            </rect>
            {(i % every === 0 || (i === dates.length - 1 && i % every > every / 2)) && (
              <text x={i * bw + bw / 2} y={H + 16} textAnchor={i === 0 ? "start" : i === dates.length - 1 ? "end" : "middle"} fontSize="11" fill="var(--soft)">
                {dates[i].slice(5).replace("-", "/")}
              </text>
            )}
          </g>
        ))}
        <path d={line} fill="none" stroke="var(--ink)" strokeWidth={1.5} strokeLinejoin="round" />
      </svg>
      <figcaption className="mt-2 flex gap-4 text-[13px] text-soft">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-[2px] bg-primary" /> Visitors
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-ink" /> Page views
        </span>
      </figcaption>
    </figure>
  );
}

function TopList({ title, rows, empty }: { title: string; rows: [string, number][]; empty: string }) {
  const max = rows[0]?.[1] ?? 1;
  return (
    <section>
      <h2 className="text-lg font-medium">{title}</h2>
      {rows.length ? (
        <ol className="mt-3 grid gap-1">
          {rows.slice(0, 10).map(([k, n]) => (
            <li key={k} className="relative flex justify-between gap-3 overflow-hidden rounded bg-card px-3 py-2 text-sm">
              <span className="absolute inset-y-0 left-0 bg-primary-soft" style={{ width: `${(n / max) * 100}%` }} aria-hidden />
              <span className="relative truncate">{k || "(none)"}</span>
              <span className="tabular relative">{fmt(n)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-soft">{empty}</p>
      )}
    </section>
  );
}
