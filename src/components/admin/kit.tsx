"use client";

import Link from "next/link";
import { createContext, useContext } from "react";
import { ArrowUpRight, Download, Loader2 } from "lucide-react";
import { pb } from "@/lib/pb";
import { RANGES, toCsv, type Bucket, type NeedItem, type Overview, type RangeDays } from "@/lib/admin";
import type { Role, Section } from "@/lib/admin-roles";
import { cn } from "@/lib/utils";

const auth = () => ({ Authorization: `Bearer ${pb().authStore.token}`, "Content-Type": "application/json" });

/** GET (no body) or POST (with a body) to an admin API; throws its sentence on failure. */
export async function call<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, body === undefined ? { headers: auth() } : { method: "POST", headers: auth(), body: JSON.stringify(body) });
  const j = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(j.error || `Request failed (${res.status}).`);
  return j;
}

export const date = (iso: string) => (iso ? new Date(iso.replace(" ", "T")).toLocaleDateString(undefined, { dateStyle: "medium" }) : "");
export function ago(iso: string) {
  if (!iso) return "Never";
  const days = Math.floor((Date.now() - new Date(iso.replace(" ", "T")).getTime()) / 86400_000);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : days < 30 ? `${days} days ago` : date(iso);
}
export const num = (n: number) => n.toLocaleString();
/** 2.4M, 18.2k, 950: for big headline numbers. */
export function short(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e4) return `${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1)}k`;
  return n.toLocaleString();
}

export interface AdminMe {
  email: string;
  role: Role;
  sections: Section[];
}
export interface AdminHome {
  me: AdminMe;
  overview: Omit<Overview, "money"> & { money: Overview["money"] | null };
  needs: NeedItem[];
  sites: { live: number; ownDomain: number; visitors30: number } | null;
}

export const AdminContext = createContext<{ home: AdminHome; range: RangeDays; setRange: (r: RangeDays) => void; reload: () => void } | null>(null);
export function useAdmin() {
  const c = useContext(AdminContext);
  if (!c) throw new Error("useAdmin outside the admin");
  return c;
}

export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[1.6rem] leading-tight font-semibold tracking-[-0.02em] text-ink">{title}</h1>
        {sub && <p className="mt-1 text-sm text-soft">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/** The date range for every number on the page. */
export function RangePicker() {
  const { range, setRange } = useAdmin();
  return (
    <div className="inline-flex border border-border bg-card" role="radiogroup" aria-label="Date range">
      {RANGES.map((r) => (
        <button
          key={r.days}
          type="button"
          role="radio"
          aria-checked={range === r.days}
          onClick={() => setRange(r.days)}
          className={cn("h-9 border-r border-border px-3 text-[13px] whitespace-nowrap last:border-r-0", range === r.days ? "bg-ink text-card" : "text-ink-2 hover:bg-muted")}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

export function Tile({ label, value, sub, href, tone }: { label: string; value: string | number; sub?: string; href?: string; tone?: "primary" }) {
  const body = (
    <>
      <p className="text-[12.5px] font-medium tracking-wide text-soft uppercase">{label}</p>
      <p className={cn("mt-2 text-[2rem] leading-none font-semibold tracking-tight tabular-nums", tone === "primary" ? "text-primary" : "text-ink")}>{value}</p>
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

export function Panel({ title, sub, children, className, action }: { title: string; sub?: string; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <section className={cn("border border-border bg-card", className)}>
      <header className="flex items-baseline justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {sub && <p className="text-[12.5px] text-soft">{sub}</p>}
        </div>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export const Loading = ({ what = "Adding things up" }: { what?: string }) => (
  <p className="flex items-center gap-2 py-6 text-soft">
    <Loader2 className="size-4 animate-spin" /> {what}…
  </p>
);
export const Problem = ({ text }: { text: string }) => <p className="bg-danger-soft p-3 text-sm text-destructive">{text}</p>;

const dayLabel = (d: string) => new Date(d + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });

/**
 * One series over time as columns. One series, so no legend: the panel title names it. Each
 * column names its day (or week) and value on hover and to screen readers.
 */
export function Columns({ data, unit, weekly }: { data: Bucket[]; unit: string; weekly?: boolean }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <p className="text-soft">Nothing yet.</p>;
  return (
    <figure>
      <div className="relative h-40">
        <div aria-hidden className="absolute inset-x-0 top-0 border-t border-dashed border-border" />
        <span aria-hidden className="absolute -top-2 right-0 bg-card pl-1 text-[11px] text-soft tabular-nums">
          {short(max)}
        </span>
        <div aria-hidden className="absolute inset-x-0 bottom-0 border-t border-border" />
        <div className="absolute inset-0 flex items-end gap-[2px]" role="list" aria-label={`${unit} per ${weekly ? "week" : "day"}`}>
          {data.map((d) => (
            <div key={d.date} role="listitem" className="group relative flex h-full flex-1 items-end" aria-label={`${weekly ? "Week of " : ""}${dayLabel(d.date)}: ${num(d.value)} ${unit}`}>
              <div className={cn("w-full rounded-t-[4px]", d.value ? "bg-primary group-hover:opacity-80" : "")} style={{ height: d.value ? `max(2px, ${(d.value / max) * 100}%)` : 0 }} />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 border border-border bg-popover px-2 py-1 text-xs whitespace-nowrap text-ink shadow group-hover:block">
                {weekly ? "Week of " : ""}
                {dayLabel(d.date)}: <strong className="tabular-nums">{num(d.value)}</strong> {unit}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1.5 flex justify-between text-[12px] text-soft">
        <span>{dayLabel(data[0].date)}</span>
        <span>{weekly ? "This week" : "Today"}</span>
      </div>
    </figure>
  );
}

/** A ranked list as thin horizontal bars, with the value written out (so no axis is needed). */
export function Ranked({ rows, label = (k) => k, empty = "Nothing yet." }: { rows: [string, number][]; label?: (k: string) => string; empty?: string }) {
  if (!rows.length) return <p className="text-sm text-soft">{empty}</p>;
  const max = Math.max(...rows.map((r) => r[1]));
  return (
    <ul className="grid gap-2.5">
      {rows.map(([k, v]) => (
        <li key={k} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-ink-2" title={label(k)}>
            {label(k)}
          </span>
          <span className="h-2.5 bg-paper-2">
            <span className="block h-full rounded-r-[4px] bg-primary" style={{ width: `${(v / max) * 100}%` }} />
          </span>
          <span className="text-right text-ink tabular-nums">{num(v)}</span>
        </li>
      ))}
    </ul>
  );
}

export function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function CsvButton({ name, rows }: { name: string; rows: () => Record<string, unknown>[] }) {
  return (
    <button
      type="button"
      onClick={() => downloadCsv(name, rows())}
      className="inline-flex h-9 items-center gap-1.5 border border-border bg-card px-3 text-[13px] text-ink-2 hover:border-primary hover:text-primary"
    >
      <Download className="size-4" /> Download CSV
    </button>
  );
}

export function Pill({ children, cls }: { children: React.ReactNode; cls: string }) {
  return <span className={cn("inline-block px-2 py-0.5 text-xs font-medium whitespace-nowrap", cls)}>{children}</span>;
}

export const TONES = {
  good: "bg-[#e3f4e8] text-[#1c6b3a]",
  warn: "bg-[#fbecd0] text-[#7a4b06]",
  bad: "bg-danger-soft text-destructive",
  quiet: "bg-paper-2 text-soft",
  info: "bg-[#e3ecfa] text-[#1d4f91]",
  tester: "bg-[#efe3fb] text-[#5b2a86]",
  brand: "bg-primary-soft text-primary",
  dark: "bg-ink text-card",
};

/** A plain table: scrolls sideways on small screens instead of squashing. */
export function Table({ head, children, min = 760, empty }: { head: (string | { label: string; right?: boolean })[]; children: React.ReactNode; min?: number; empty?: string | false }) {
  return (
    <div className="overflow-x-auto border border-border bg-card">
      <table className="w-full text-left text-sm" style={{ minWidth: min }}>
        <thead className="border-b border-border bg-paper/40 text-[12.5px] text-soft">
          <tr>
            {head.map((h) => {
              const c = typeof h === "string" ? { label: h } : h;
              return (
                <th key={c.label} className={cn("px-3 py-2 font-medium whitespace-nowrap", c.right && "text-right")}>
                  {c.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty && <p className="p-4 text-soft">{empty}</p>}
    </div>
  );
}
export const Td = ({ children, right, className }: { children?: React.ReactNode; right?: boolean; className?: string }) => (
  <td className={cn("px-3 py-2.5 align-top", right && "text-right tabular-nums", className)}>{children}</td>
);

/** An on/off switch: square, like the rest of the admin. */
export function Toggle({ on, busy, disabled, label, onChange }: { on: boolean; busy: boolean; disabled: boolean; label: string; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled || busy}
      onClick={() => onChange(!on)}
      className={cn("relative inline-flex h-6 w-11 shrink-0 items-center border transition-colors disabled:opacity-50", on ? "border-primary bg-primary" : "border-border bg-paper-3")}
    >
      <span className={cn("absolute size-4 bg-card shadow-sm transition-transform", on ? "translate-x-[22px]" : "translate-x-[3px]")} />
    </button>
  );
}
