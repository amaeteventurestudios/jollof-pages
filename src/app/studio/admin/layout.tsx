"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BarChart3, BookCopy, FlaskConical, Globe, LayoutDashboard, LifeBuoy, Menu, ScrollText, ShieldCheck, Users, UsersRound, Wallet, X } from "lucide-react";
import { AdminContext, call, Loading, Problem, type AdminHome } from "@/components/admin/kit";
import { toRange, type RangeDays } from "@/lib/admin";
import { roleLabel, type Section } from "@/lib/admin-roles";
import { cn } from "@/lib/utils";

const NAV: { id: Section; href: string; label: string; icon: typeof Users; group: "Run" | "Grow" | "Team" }[] = [
  { id: "overview", href: "/studio/admin", label: "Overview", icon: LayoutDashboard, group: "Run" },
  { id: "insights", href: "/studio/admin/insights", label: "Insights", icon: BarChart3, group: "Run" },
  { id: "writers", href: "/studio/admin/writers", label: "Writers", icon: Users, group: "Run" },
  { id: "websites", href: "/studio/admin/websites", label: "Websites", icon: Globe, group: "Run" },
  { id: "books", href: "/studio/admin/books", label: "Books", icon: BookCopy, group: "Run" },
  { id: "money", href: "/studio/admin/money", label: "Money", icon: Wallet, group: "Grow" },
  { id: "testers", href: "/studio/admin/testers", label: "Testers", icon: FlaskConical, group: "Grow" },
  { id: "support", href: "/studio/admin/support", label: "Support", icon: LifeBuoy, group: "Grow" },
  { id: "team", href: "/studio/admin/team", label: "Team and roles", icon: UsersRound, group: "Team" },
  { id: "audit", href: "/studio/admin/audit", label: "Audit log", icon: ScrollText, group: "Team" },
];

const RANGE_KEY = "jp-admin-range";

/**
 * The admin console: a dark left panel with every section, and full-width pages beside it. The
 * server decides what each person may see; the panel only shows those sections.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [home, setHome] = useState<AdminHome | null>(null);
  const [error, setError] = useState("");
  // the menu on phones remembers the page it was opened on, so it closes by itself on the next one
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === path;
  const setOpen = (o: boolean) => setOpenOn(o ? path : null);
  // the studio renders client-only behind the sign-in gate, so localStorage is safe here
  const [range, setRangeState] = useState<RangeDays>(() => toRange(localStorage.getItem(RANGE_KEY) ?? 30));
  const setRange = (r: RangeDays) => {
    localStorage.setItem(RANGE_KEY, String(r));
    setRangeState(r);
  };
  const reload = useCallback(() => {
    call<AdminHome>("/api/admin")
      .then(setHome)
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(reload, [reload]);

  const nav = NAV.filter((n) => !home || home.me.sections.includes(n.id));
  const current = NAV.filter((n) => (n.href === "/studio/admin" ? path === n.href : path.startsWith(n.href))).pop();
  const allowed = !home || !current || home.me.sections.includes(current.id);

  const panel = (
    <nav aria-label="Admin" className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
        <ShieldCheck className="size-5 text-[#f08a5d]" />
        <span className="font-semibold tracking-tight">Jollof Pages</span>
        <span className="text-[13px] text-white/50">Admin</span>
        <button type="button" className="ml-auto lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
          <X className="size-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {(["Run", "Grow", "Team"] as const).map((g) => {
          const items = nav.filter((n) => n.group === g);
          if (!items.length) return null;
          return (
            <div key={g} className="mb-4">
              <p className="px-3 pb-1 text-[11px] font-medium tracking-[0.14em] text-white/40 uppercase">{g}</p>
              {items.map((n) => {
                const active = current?.id === n.id;
                const badge = n.id === "overview" ? home?.needs.reduce((s, i) => s + i.count, 0) : n.id === "support" ? home?.overview.tickets.open : 0;
                return (
                  <Link
                    key={n.id}
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-9 items-center gap-2.5 px-3 text-[14px] text-white/75 hover:bg-white/5 hover:text-white",
                      active && "bg-white/10 font-medium text-white shadow-[inset_3px_0_0_#f08a5d]",
                    )}
                  >
                    <n.icon className="size-4 shrink-0" aria-hidden />
                    {n.label}
                    {!!badge && <span className="ml-auto min-w-5 bg-[#f08a5d] px-1.5 text-center text-[11px] leading-5 font-semibold text-[#1a1512] tabular-nums">{badge}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="border-t border-white/10 p-3 text-[13px]">
        {home && (
          <p className="truncate px-1 text-white/60" title={home.me.email}>
            {home.me.email} · <span className="text-white/90">{roleLabel(home.me.role)}</span>
          </p>
        )}
        <Link href="/studio" className="mt-2 flex h-9 items-center gap-2 px-1 text-white/75 hover:text-white">
          <ArrowLeft className="size-4" /> Back to the studio
        </Link>
      </div>
    </nav>
  );

  return (
    <div className="min-h-dvh bg-paper lg:pl-60">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 bg-[#1a1512] text-white lg:block">{panel}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-[#1a1512] text-white">{panel}</aside>
        </div>
      )}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-4 lg:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label="Open admin menu" className="-ml-1 p-1">
          <Menu className="size-5" />
        </button>
        <span className="font-semibold">{current?.label ?? "Admin"}</span>
      </header>
      <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {error ? (
          <Problem text={error} />
        ) : !home ? (
          <Loading />
        ) : !allowed ? (
          <Problem text="Your role on the team doesn't include this page. Ask the owner if you need it." />
        ) : (
          <AdminContext.Provider value={{ home, range, setRange, reload }}>{children}</AdminContext.Provider>
        )}
      </main>
    </div>
  );
}
