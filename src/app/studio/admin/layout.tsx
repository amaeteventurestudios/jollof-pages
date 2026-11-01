"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  BookCopy,
  ChevronRight,
  FlaskConical,
  Globe,
  Inbox,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Palette,
  ScrollText,
  ToggleRight,
  ShieldCheck,
  Users,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import {
  AdminContext,
  call,
  Loading,
  Problem,
  type AdminHome,
} from "@/components/admin/kit";
import { toRange, type RangeDays } from "@/lib/admin";
import { roleLabel, type Section } from "@/lib/admin-roles";
import { cn } from "@/lib/utils";

type Item = {
  label: string;
  href: string;
  count?: (h: AdminHome) => number | undefined;
  red?: boolean;
};
type Node = Item & {
  id: Section;
  icon: typeof Users;
  badge?: "needs" | "tickets" | "ideas";
  children?: Item[];
};

/** The left panel as a tree: each heading, its pages, and the views inside a page. */
const TREE: { heading: string; nodes: Node[] }[] = [
  {
    heading: "Business",
    nodes: [
      {
        id: "overview",
        href: "/studio/admin",
        label: "Overview",
        icon: LayoutDashboard,
        badge: "needs",
      },
      {
        id: "money",
        href: "/studio/admin/money",
        label: "Money",
        icon: Wallet,
        children: [
          { label: "All payments", href: "/studio/admin/money" },
          { label: "Studio sales", href: "/studio/admin/money?kind=studio" },
          { label: "AI credits", href: "/studio/admin/money?kind=credits" },
          { label: "Ebook sales", href: "/studio/admin/money?kind=ebook" },
        ],
      },
      {
        id: "insights",
        href: "/studio/admin/insights",
        label: "Insights",
        icon: BarChart3,
      },
    ],
  },
  {
    heading: "People",
    nodes: [
      {
        id: "writers",
        href: "/studio/admin/writers",
        label: "Writers",
        icon: Users,
        children: [
          {
            label: "All writers",
            href: "/studio/admin/writers",
            count: (h) =>
              h.overview.writers.total - h.overview.writers.collaborator,
          },
          {
            label: "Paying",
            href: "/studio/admin/writers?show=paid",
            count: (h) => h.overview.writers.paid,
          },
          {
            label: "Free access",
            href: "/studio/admin/writers?show=comp",
            count: (h) => h.overview.writers.comp,
          },
          {
            label: "Not paid yet",
            href: "/studio/admin/writers?show=pending",
            count: (h) => h.overview.writers.pending,
          },
          {
            label: "Testers",
            href: "/studio/admin/writers?show=testers",
            count: (h) => h.overview.writers.testers,
          },
          {
            label: "Looks like spam",
            href: "/studio/admin/writers?show=spam",
            count: (h) => h.needs.find((n) => n.kind === "spam")?.count ?? 0,
            red: true,
          },
          { label: "Suspended", href: "/studio/admin/writers?show=suspended" },
          {
            label: "Everyone",
            href: "/studio/admin/writers?show=all",
            count: (h) => h.overview.writers.total,
          },
          { label: "Access", href: "/studio/admin/writers/access" },
        ],
      },
      {
        id: "testers",
        href: "/studio/admin/testers",
        label: "Testers",
        icon: FlaskConical,
      },
    ],
  },
  {
    heading: "Help desk",
    nodes: [
      {
        id: "support",
        href: "/studio/admin/tickets",
        label: "Tickets",
        icon: Inbox,
        badge: "tickets",
      },
      {
        id: "support",
        href: "/studio/admin/ideas",
        label: "Feature requests",
        icon: Lightbulb,
        badge: "ideas",
      },
    ],
  },
  {
    heading: "Platform",
    nodes: [
      {
        id: "websites",
        href: "/studio/admin/websites",
        label: "Websites",
        icon: Globe,
        children: [
          { label: "All websites", href: "/studio/admin/websites" },
          {
            label: "Domain problems",
            href: "/studio/admin/websites?show=domains",
          },
          { label: "No books yet", href: "/studio/admin/websites?show=empty" },
          {
            label: "Taken offline",
            href: "/studio/admin/websites?show=offline",
          },
        ],
      },
      {
        id: "books",
        href: "/studio/admin/books",
        label: "Books",
        icon: BookCopy,
      },
    ],
  },
  {
    heading: "Settings",
    nodes: [
      {
        id: "team",
        href: "/studio/admin/team",
        label: "Team and roles",
        icon: UsersRound,
      },
      {
        id: "brands",
        href: "/studio/admin/brands",
        label: "Brands",
        icon: Palette,
      },
      {
        id: "switches",
        href: "/studio/admin/switches",
        label: "Switches",
        icon: ToggleRight,
      },
      {
        id: "audit",
        href: "/studio/admin/audit",
        label: "Audit log",
        icon: ScrollText,
      },
    ],
  },
];
const NODES = TREE.flatMap((g) => g.nodes);
const TREE_KEY = "jp-admin-tree";

const RANGE_KEY = "jp-admin-range";

/**
 * The admin console: a dark left panel laid out as a tree, and full-width pages beside it. The
 * server decides what each person may see; the panel only shows those sections.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // the filters live in the address, so the panel can show which view is open
  return (
    <Suspense fallback={<Loading />}>
      <Console>{children}</Console>
    </Suspense>
  );
}

function Console({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const search = useSearchParams().toString();
  const here = search ? `${path}?${search}` : path;
  const [home, setHome] = useState<AdminHome | null>(null);
  const [error, setError] = useState("");
  // the menu on phones remembers the page it was opened on, so it closes by itself on the next one
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === here;
  const setOpen = (o: boolean) => setOpenOn(o ? here : null);
  // branches the person opened or closed by hand, kept between visits; the rest open with their page
  const [folded, setFoldedState] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(TREE_KEY) ?? "{}") as Record<
        string,
        boolean
      >;
    } catch {
      return {};
    }
  });
  const fold = (href: string, on: boolean) =>
    setFoldedState((f) => {
      const next = { ...f, [href]: on };
      localStorage.setItem(TREE_KEY, JSON.stringify(next));
      return next;
    });
  // the studio renders client-only behind the sign-in gate, so localStorage is safe here
  const [range, setRangeState] = useState<RangeDays>(() =>
    toRange(localStorage.getItem(RANGE_KEY) ?? 30),
  );
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

  const sees = (id: Section) => !home || home.me.sections.includes(id);
  // the page that is open: the longest matching path, so /studio/admin doesn't claim every page
  const current = NODES.filter((n) =>
    n.href === "/studio/admin" ? path === n.href : path.startsWith(n.href),
  )
    .sort((a, b) => b.href.length - a.href.length)
    .at(0);
  const allowed = !home || !current || sees(current.id);
  // the branch that owns this address, and the view inside it: the exact address, or the page's own first view
  const owner =
    NODES.find((n) => n.children?.some((c) => c.href === here)) ?? current;
  const view =
    owner?.children?.find((c) => c.href === here) ??
    (search ? undefined : owner?.children?.find((c) => c.href === path));
  const badge = (n: Node) =>
    !home
      ? 0
      : n.badge === "needs"
        ? home.needs.reduce((s, i) => s + i.count, 0)
        : n.badge === "tickets"
          ? home.overview.tickets.open
          : n.badge === "ideas"
            ? home.overview.ideas.new
            : 0;

  const panel = (
    <nav aria-label="Admin" className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
        <ShieldCheck className="size-5 text-[#f08a5d]" />
        <span className="font-semibold tracking-tight">Jollof Pages</span>
        <span className="text-[13px] text-white/50">Admin</span>
        <button
          type="button"
          className="ml-auto lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {TREE.map((g) => {
          const nodes = g.nodes.filter((n) => sees(n.id));
          if (!nodes.length) return null;
          return (
            <div key={g.heading} className="mb-4">
              <p className="px-3 pb-1 text-[11px] font-medium tracking-[0.14em] text-white/40 uppercase">
                {g.heading}
              </p>
              <ul>
                {nodes.map((n) => {
                  const mine = owner === n;
                  const expanded = n.children
                    ? (folded[n.href] ?? mine)
                    : false;
                  const count = badge(n);
                  return (
                    <li key={n.href}>
                      <div
                        className={cn(
                          "flex h-9 items-center text-[14px] text-white/75",
                          mine &&
                            (view
                              ? "font-medium text-white"
                              : "bg-white/10 font-medium text-white shadow-[inset_3px_0_0_#f08a5d]"),
                        )}
                      >
                        <Link
                          href={n.href}
                          aria-current={mine && !view ? "page" : undefined}
                          className="flex h-full min-w-0 flex-1 items-center gap-2.5 pl-3 hover:text-white"
                        >
                          <n.icon className="size-4 shrink-0" aria-hidden />
                          <span className="truncate">{n.label}</span>
                          {!!count && (
                            <span className="ml-auto min-w-5 bg-[#f08a5d] px-1.5 text-center text-[11px] leading-5 font-semibold text-[#1a1512] tabular-nums">
                              {count}
                            </span>
                          )}
                        </Link>
                        {n.children ? (
                          <button
                            type="button"
                            onClick={() => fold(n.href, !expanded)}
                            aria-expanded={expanded}
                            aria-label={`${expanded ? "Fold" : "Unfold"} ${n.label}`}
                            className="grid h-full w-8 shrink-0 place-items-center text-white/50 hover:text-white"
                          >
                            <ChevronRight
                              className={cn(
                                "size-4 transition-transform",
                                expanded && "rotate-90",
                              )}
                            />
                          </button>
                        ) : (
                          <span className="w-3 shrink-0" />
                        )}
                      </div>
                      {expanded && n.children && (
                        <ul className="mt-0.5 mb-1 ml-[21px] border-l border-white/15">
                          {n.children.map((c) => {
                            const on = mine && view?.href === c.href;
                            return (
                              <li key={c.href}>
                                <Link
                                  href={c.href}
                                  aria-current={on ? "page" : undefined}
                                  className={cn(
                                    "relative flex h-8 items-center pr-3 pl-4 text-[13.5px] text-white/60 before:absolute before:top-1/2 before:left-0 before:h-px before:w-2.5 before:bg-white/15 hover:text-white",
                                    on &&
                                      "font-medium text-white before:bg-[#f08a5d]",
                                    c.red &&
                                      home &&
                                      (c.count?.(home) ?? 0) > 0 &&
                                      "text-[#ff8a7a]",
                                  )}
                                >
                                  {on && (
                                    <span
                                      className="absolute top-1/2 left-[-3px] size-[5px] -translate-y-1/2 bg-[#f08a5d]"
                                      aria-hidden
                                    />
                                  )}
                                  {c.label}
                                  {home && c.count && (
                                    <span
                                      className={cn(
                                        "ml-auto pl-2 text-[12px] tabular-nums",
                                        c.red && (c.count(home) ?? 0) > 0
                                          ? "font-semibold text-[#ff8a7a]"
                                          : "text-white/40",
                                      )}
                                    >
                                      {c.count(home)}
                                    </span>
                                  )}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="border-t border-white/10 p-3 text-[13px]">
        {home && (
          <p className="truncate px-1 text-white/60" title={home.me.email}>
            {home.me.email} ·{" "}
            <span className="text-white/90">{roleLabel(home.me.role)}</span>
          </p>
        )}
        <Link
          href="/studio"
          className="mt-2 flex h-9 items-center gap-2 px-1 text-white/75 hover:text-white"
        >
          <ArrowLeft className="size-4" /> Back to the studio
        </Link>
      </div>
    </nav>
  );

  const title =
    view && view !== owner?.children?.[0]
      ? `${owner?.label}: ${view.label}`
      : (owner?.label ?? "Admin");
  return (
    <div className="min-h-dvh bg-paper lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-[#1a1512] text-white lg:block">
        {panel}
      </aside>
      {open && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Admin menu"
        >
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-[#1a1512] text-white">
            {panel}
          </aside>
        </div>
      )}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open admin menu"
          className="-ml-1 p-1"
        >
          <Menu className="size-5" />
        </button>
        <span className="font-semibold">{title}</span>
      </header>
      <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {error ? (
          <Problem text={error} />
        ) : !home ? (
          <Loading />
        ) : !allowed ? (
          <Problem text="Your role on the team doesn't include this page. Ask the owner if you need it." />
        ) : (
          // keyed by the full address, so picking a view in the panel opens the page on that view
          <AdminContext.Provider
            key={here}
            value={{ home, range, setRange, reload }}
          >
            {children}
          </AdminContext.Provider>
        )}
      </main>
    </div>
  );
}
