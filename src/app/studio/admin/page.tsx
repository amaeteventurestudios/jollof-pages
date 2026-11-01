"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Globe, Inbox, Lightbulb, ShieldAlert } from "lucide-react";
import { call, Columns, num, PageHead, Panel, RangePicker, short, Tile, useAdmin } from "@/components/admin/kit";
import { money, RANGES, type Insights, type NeedItem } from "@/lib/admin";

const NEED_ICON: Record<NeedItem["kind"], typeof Inbox> = { ticket: Inbox, idea: Lightbulb, spam: ShieldAlert, domain: Globe, nosite: Globe, notstarted: AlertTriangle };

/** The admin's front page: today's headline numbers and anything waiting on you. */
export default function AdminOverview() {
  const { home, range } = useAdmin();
  const o = home.overview;
  const seesInsights = home.me.sections.includes("insights");
  const [ins, setIns] = useState<Insights | null>(null);
  useEffect(() => {
    if (seesInsights)
      call<{ insights: Insights }>(`/api/admin/insights?days=${range}`)
        .then((j) => setIns(j.insights))
        .catch(() => undefined);
  }, [range, seesInsights]);
  const rangeLabel = RANGES.find((r) => r.days === range)?.label.toLowerCase() ?? "";
  const m = o.money;

  return (
    <div className="grid gap-6">
      <PageHead title="Your business at a glance" sub="Every number here is a count. Nobody's writing is ever opened.">
        {seesInsights && <RangePicker />}
      </PageHead>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Tile label="Writers" value={num(o.writers.total - o.writers.collaborator)} sub={`${o.writers.new7} new this week`} href="/studio/admin/writers" />
        <Tile label="Paying writers" value={num(o.writers.paid)} sub={`${o.writers.comp} free, ${o.writers.pending} not paid yet`} href="/studio/admin/writers?show=paid" />
        {m ? (
          <Tile label="Earned, all time" value={money(m.studioCents + m.creditCents + m.ebookFeeCents)} sub={`${money(m.thisMonthCents)} this month`} href="/studio/admin/money" tone="primary" />
        ) : (
          <Tile label="Testers" value={num(o.writers.testers)} sub="Joined with an invite link" />
        )}
        <Tile label={`Words written, ${rangeLabel}`} value={ins ? short(ins.totals.wordsWritten) : "…"} sub={ins ? `${num(ins.totals.activeWriters7)} writers active this week` : undefined} href={seesInsights ? "/studio/admin/insights" : undefined} />
        <Tile label="Live websites" value={home.sites ? num(home.sites.live) : "…"} sub={home.sites ? `${num(home.sites.visitors30)} visitors in 30 days` : undefined} href="/studio/admin/websites" />
        <Tile label="Open tickets" value={num(o.tickets.open)} sub={`${o.ideas.new} new ideas`} href="/studio/admin/support" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid gap-4">
          {ins && (
            <Panel title="Words written on Jollof Pages" sub={`${num(ins.totals.wordsWritten)} words, ${rangeLabel}`}>
              <Columns data={ins.words} unit="words" weekly={range === 0 || range > 90} />
            </Panel>
          )}
          <Panel title="Sign-ups, last 30 days" sub={`${o.signups.reduce((s, d) => s + d.count, 0)} new accounts`}>
            <Columns data={o.signups.map((s) => ({ date: s.date, value: s.count }))} unit="sign-ups" />
          </Panel>
        </div>

        <div className="grid content-start gap-4">
          <Panel title="Needs you" sub="Anything waiting on you, most urgent first">
            {home.needs.length ? (
              <ul className="grid gap-1">
                {home.needs.map((n) => {
                  const Icon = NEED_ICON[n.kind];
                  return (
                    <li key={n.kind}>
                      <Link href={n.href} className="group flex items-center gap-3 border border-transparent px-2 py-2 hover:border-border hover:bg-muted/50">
                        <Icon className="size-4 shrink-0 text-primary" />
                        <span className="flex-1 text-sm text-ink">{n.label}</span>
                        <span className="text-sm font-semibold text-ink tabular-nums">{n.count}</span>
                        <ArrowRight className="size-4 text-soft group-hover:text-primary" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="flex items-center gap-2 text-sm text-ink-2">
                <CheckCircle2 className="size-4 text-[#1c6b3a]" /> Nothing is waiting on you.
              </p>
            )}
          </Panel>
          {ins && (
            <Panel title="On the platform now">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {[
                  ["Words in manuscripts", short(ins.totals.wordsOnPlatform)],
                  ["Books", num(ins.totals.books)],
                  ["Published books", num(ins.totals.booksPublished)],
                  ["Chapters", num(ins.totals.chapters)],
                  [`Exports, ${rangeLabel}`, num(ins.totals.exports)],
                  [`AI covers, ${rangeLabel}`, num(ins.totals.covers)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[12.5px] text-soft">{k}</dt>
                    <dd className="text-lg font-semibold text-ink tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
