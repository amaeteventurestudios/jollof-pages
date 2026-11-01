"use client";

import { useEffect, useState } from "react";
import { call, CsvButton, date, Loading, PageHead, Problem, Tile } from "@/components/admin/kit";
import { money, type MoneyKind, type Overview, type Payment } from "@/lib/admin";
import { cn } from "@/lib/utils";

const KIND: Record<MoneyKind, string> = { studio: "Studio", credits: "AI credits", ebook: "Ebook" };

export default function MoneyPage() {
  const [data, setData] = useState<{ payments: Payment[]; overview: Overview } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    call<{ payments: Payment[]; overview: Overview }>("/api/admin/money")
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);
  if (error) return <Problem text={error} />;
  if (!data) return <Loading />;
  return <MoneyView payments={data.payments} o={data.overview} />;
}

function MoneyView({ payments, o }: { payments: Payment[]; o: Overview }) {
  const [kind, setKind] = useState<"all" | MoneyKind>("all");
  const shown = payments.filter((p) => kind === "all" || p.kind === kind);
  const m = o.money;
  return (
    <div className="grid gap-6">
      <PageHead title="Money" sub="Every dollar that came in, before Stripe's fees.">
        <CsvButton
          name="jollof-payments"
          rows={() => shown.map((p) => ({ date: p.at, type: KIND[p.kind], writer: p.email, details: p.note, paid: (p.cents / 100).toFixed(2), you_keep: (p.keepCents / 100).toFixed(2) }))}
        />
      </PageHead>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile label="Total earned" value={money(m.studioCents + m.creditCents + m.ebookFeeCents)} tone="primary" />
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
