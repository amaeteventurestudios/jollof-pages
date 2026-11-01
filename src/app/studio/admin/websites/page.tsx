"use client";

import { useEffect, useState } from "react";
import { Ban, ExternalLink, Loader2, Radar, RotateCcw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ago, call, CsvButton, Loading, num, PageHead, Pill, Problem, RangePicker, Table, Td, Tile, TONES, useAdmin } from "@/components/admin/kit";
import { siteUrl } from "@/lib/sites";
import { RANGES, type DomainState, type Website } from "@/lib/admin";
import { can } from "@/lib/admin-roles";
import { cn } from "@/lib/utils";

const asSite = (s: Website) => ({ subdomain: s.subdomain, home: s.home, custom_domain: s.customDomain });

const DOMAIN: Record<DomainState, { label: string; cls: string }> = {
  none: { label: "Subdomain only", cls: TONES.quiet },
  connected: { label: "Own domain", cls: TONES.good },
  waiting: { label: "Waiting for DNS", cls: TONES.warn },
  failed: { label: "Domain failed", cls: TONES.bad },
};

type Show = "all" | "live" | "domains" | "pro" | "empty" | "offline" | "spam";
const SHOW_LABEL: Record<Show, string> = { all: "All", live: "Live", domains: "Domain problems", pro: "Pro", empty: "No books yet", offline: "Offline", spam: "Looks like spam" };
const matches = (s: Website, f: Show) =>
  f === "all"
    ? true
    : f === "live"
      ? !s.offline
      : f === "domains"
        ? s.domain === "waiting" || s.domain === "failed"
        : f === "pro"
          ? s.pro && !s.home
          : f === "empty"
            ? !s.books && !s.home && !s.offline
            : f === "offline"
              ? s.offline
              : s.spam;

/** Every author website: where it lives, whether its domain works, and who visits. */
export default function WebsitesPage() {
  const { home, range } = useAdmin();
  const [sites, setSites] = useState<Website[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [show, setShow] = useState<Show>(() => {
    const s = new URLSearchParams(window.location.search).get("show") as Show;
    return s in SHOW_LABEL ? s : "all";
  });
  const load = () =>
    call<{ sites: Website[] }>(`/api/admin/sites?days=${range}`)
      .then((j) => {
        setSites(j.sites);
        setError("");
      })
      .catch((e: Error) => setError(e.message));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void load(), [range]);
  const rl = RANGES.find((r) => r.days === range)?.label.toLowerCase() ?? "";
  const needle = q.trim().toLowerCase();
  const shown = (sites ?? []).filter((s) => matches(s, show) && (!needle || `${s.subdomain} ${s.customDomain} ${s.email} ${s.name}`.toLowerCase().includes(needle)));
  const authors = (sites ?? []).filter((s) => !s.home);
  const top = [...authors].sort((a, b) => b.visitors - a.visitors).slice(0, 5);

  return (
    <div className="grid gap-5">
      <PageHead title="Websites" sub="Every author site, counted by Jollof Pages itself: no cookies, no outside analytics.">
        <RangePicker />
        {sites && (
          <CsvButton
            name="jollof-websites"
            rows={() =>
              shown.map((s) => ({
                site: s.customDomain || s.subdomain,
                owner: s.email,
                domain: DOMAIN[s.domain].label,
                pro: s.pro ? "yes" : "",
                offline: s.offline ? "yes" : "",
                visitors: s.visitors,
                views: s.views,
                signups: s.signups,
                store_clicks: s.storeClicks,
                books: s.books,
                subscribers: s.subscribers,
                orders: s.orders,
                updated: s.updated,
              }))
            }
          />
        )}
      </PageHead>
      {error && <Problem text={error} />}
      {!sites ? (
        !error && <Loading what="Loading websites" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Tile label="Author websites" value={num(authors.length)} sub={`${num(authors.filter((s) => !s.offline).length)} live`} />
            <Tile
              label="On their own domain"
              value={num(authors.filter((s) => s.domain === "connected").length)}
              sub={`${num(authors.filter((s) => s.domain === "waiting" || s.domain === "failed").length)} not connected yet`}
            />
            <Tile label="Author Site Pro" value={num(authors.filter((s) => s.pro).length)} />
            <Tile label={`Visitors, ${rl}`} value={num(sites.reduce((n, s) => n + s.visitors, 0))} sub={`${num(sites.reduce((n, s) => n + s.views, 0))} page views`} tone="primary" />
            <Tile label={`Store clicks, ${rl}`} value={num(sites.reduce((n, s) => n + s.storeClicks, 0))} sub="to Amazon and other shops" />
            <Tile label="Newsletter subscribers" value={num(sites.reduce((n, s) => n + s.subscribers, 0))} sub={`${num(sites.reduce((n, s) => n + s.signups, 0))} signed up, ${rl}`} />
          </div>

          {top.some((s) => s.visitors) && (
            <section className="border border-border bg-card p-4">
              <h2 className="text-sm font-semibold text-ink">Most visited, {rl}</h2>
              <ol className="mt-3 grid gap-2 sm:grid-cols-5">
                {top
                  .filter((s) => s.visitors)
                  .map((s, i) => (
                    <li key={s.id} className="border border-border p-3">
                      <p className="text-[12px] text-soft">#{i + 1}</p>
                      <a href={siteUrl(asSite(s))} target="_blank" rel="noopener" className="block truncate font-medium text-primary hover:underline">
                        {s.customDomain || s.subdomain}
                      </a>
                      <p className="text-sm text-ink tabular-nums">{num(s.visitors)} visitors</p>
                    </li>
                  ))}
              </ol>
            </section>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-60 flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-soft" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by address, domain or writer" aria-label="Search websites" className="pl-9" />
            </div>
            <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Show">
              {(Object.keys(SHOW_LABEL) as Show[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={show === f}
                  onClick={() => setShow(f)}
                  className={cn("h-9 border px-3 text-[13px] whitespace-nowrap", show === f ? "border-ink bg-ink text-card" : "border-border bg-card text-ink-2 hover:border-primary")}
                >
                  {SHOW_LABEL[f]} <span className="tabular-nums opacity-70">{sites.filter((s) => matches(s, f)).length}</span>
                </button>
              ))}
            </div>
          </div>

          <Table
            head={[
              "Website",
              "Owner",
              "Domain",
              { label: "Visitors", right: true },
              { label: "Views", right: true },
              { label: "Store clicks", right: true },
              { label: "Books", right: true },
              { label: "Subscribers", right: true },
              "Updated",
              "",
            ]}
            min={1100}
            empty={!shown.length && "No websites match."}
          >
            {shown.map((s) => (
              <SiteRow key={s.id} s={s} canOffline={can(home.me.role, "site.offline")} onDone={load} />
            ))}
          </Table>
          <p className="text-[13px] text-soft">
            Visitors are counted once a day per browser from a scrambled fingerprint that is never stored. Uptime and SSL alerts for each site come from Vencore (hq.jollofpages.com).
          </p>
        </>
      )}
    </div>
  );
}

function SiteRow({ s, canOffline, onDone }: { s: Website; canOffline: boolean; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const act = async (action: "offline" | "online" | "check") => {
    if (action === "offline" && !window.confirm(`Take ${s.customDomain || s.subdomain} offline? Visitors will see a not-found page until you put it back.`)) return;
    setBusy(true);
    setNote(null);
    try {
      const j = await call<{ check?: { ok: boolean; note: string } }>("/api/admin/sites", { id: s.id, action });
      if (j.check) setNote({ ok: j.check.ok, text: j.check.note });
      else onDone();
    } catch (e) {
      setNote({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <tr className={cn("border-b border-border last:border-0", s.offline && "bg-paper/60")}>
      <Td>
        <a href={siteUrl(asSite(s))} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          {s.home ? "jollofpages.com" : s.customDomain || `${s.subdomain}.jollofpages.com`} <ExternalLink className="size-3.5" />
        </a>
        <span className="mt-1 flex flex-wrap gap-1">
          {s.home && <Pill cls={TONES.dark}>Your site</Pill>}
          {s.pro && !s.home && <Pill cls={TONES.dark}>Pro</Pill>}
          {s.offline && <Pill cls={TONES.bad}>{s.suspended ? "Offline: account suspended" : "Offline"}</Pill>}
          {s.spam && <Pill cls={TONES.bad}>Spam?</Pill>}
        </span>
        {note && <p className={cn("mt-1 max-w-sm text-[12.5px]", note.ok ? "text-[#1c6b3a]" : "text-destructive")}>{note.text}</p>}
      </Td>
      <Td>
        <p className="text-ink">{s.name || s.email.split("@")[0]}</p>
        <p className="text-[12.5px] text-soft">{s.email}</p>
      </Td>
      <Td>
        <Pill cls={DOMAIN[s.domain].cls}>{DOMAIN[s.domain].label}</Pill>
        {s.domainNote && s.domain !== "connected" && <p className="mt-1 max-w-48 text-[12px] text-soft">{s.domainNote}</p>}
      </Td>
      <Td right>{num(s.visitors)}</Td>
      <Td right>{num(s.views)}</Td>
      <Td right>{num(s.storeClicks)}</Td>
      <Td right>{s.books}</Td>
      <Td right>{s.subscribers}</Td>
      <Td className="whitespace-nowrap">{ago(s.updated)}</Td>
      <Td>
        <span className="flex justify-end gap-1">
          {s.domain !== "none" && (
            <button type="button" title="Check where the domain points" onClick={() => act("check")} disabled={busy} className="p-1.5 text-ink-2 hover:text-primary">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Radar className="size-4" />}
            </button>
          )}
          {canOffline &&
            !s.home &&
            (s.offline ? (
              !s.suspended && (
                <button type="button" title="Put the site back online" onClick={() => act("online")} disabled={busy} className="p-1.5 text-ink-2 hover:text-primary">
                  <RotateCcw className="size-4" />
                </button>
              )
            ) : (
              <button type="button" title="Take the site offline" onClick={() => act("offline")} disabled={busy} className="p-1.5 text-ink-2 hover:text-destructive">
                <Ban className="size-4" />
              </button>
            ))}
        </span>
      </Td>
    </tr>
  );
}
