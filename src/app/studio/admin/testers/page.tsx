"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Ban, Check, Copy, FlaskConical, Link2, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ago, call, date, PageHead, useAdmin } from "@/components/admin/kit";
import type { Writer } from "@/lib/admin";
import { can } from "@/lib/admin-roles";
import type { InviteState, TesterInvite } from "@/lib/invites";
import { cn } from "@/lib/utils";

type InviteRow = TesterInvite & { url: string; state: InviteState };

const STATE: Record<InviteState, { label: string; cls: string }> = {
  active: { label: "Working", cls: "bg-[#e3f4e8] text-[#1c6b3a]" },
  revoked: { label: "Switched off", cls: "bg-paper-2 text-soft" },
  expired: { label: "Expired", cls: "bg-paper-2 text-soft" },
  full: { label: "Full", cls: "bg-[#fbecd0] text-[#7a4b06]" },
};

/** Tester invite links: make one, send it, see who joined and what they told you. */
export default function TestersPage() {
  const { home } = useAdmin();
  const manage = can(home.me.role, "testers.manage");
  const [data, setData] = useState<{ invites: InviteRow[]; testers: Writer[] } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("");
  const [max, setMax] = useState("");
  const [days, setDays] = useState("30");
  const [credits, setCredits] = useState("20");
  const [copied, setCopied] = useState("");
  const [fresh, setFresh] = useState("");

  useEffect(() => {
    call<{ invites: InviteRow[]; testers: Writer[] }>("/api/admin/invites")
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    try {
      const next = await call<{ invites: InviteRow[]; testers: Writer[] }>("/api/admin/invites", body);
      if (body.action === "create" && next.invites[0]) setFresh(next.invites[0].id);
      setData(next);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const copy = async (i: InviteRow) => {
    await navigator.clipboard.writeText(i.url).catch(() => undefined);
    setCopied(i.id);
    setTimeout(() => setCopied((c) => (c === i.id ? "" : c)), 2000);
  };

  return (
    <div className="grid gap-6">
      <PageHead title="Testers" sub="Invite links for people who want to try the studio for free, and what they told you." />
      {manage && (
        <section className="border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-lg font-medium text-ink">
            <FlaskConical className="size-5 text-primary" /> Make a tester link
          </h2>
          <p className="mt-1 text-sm text-soft">
            Anyone who opens the link signs up with their email and a password of their own, skips the payment and gets the full studio. Their feedback comes in as tickets and feature requests.
          </p>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await act({ action: "create", label, max_uses: Number(max) || 0, days: Number(days) || 0, credits: Number(credits) || 0 })) setLabel("");
            }}
          >
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Name it (only you see this)</span>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} placeholder="Writers' WhatsApp group" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">How many people</span>
              <Input type="number" min={0} value={max} onChange={(e) => setMax(e.target.value)} placeholder="No limit" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Link works for</span>
              <select value={days} onChange={(e) => setDays(e.target.value)} className="h-10 border border-input bg-card px-2 text-sm">
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="0">No end date</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">AI cover credits each</span>
              <Input type="number" min={0} max={10000} value={credits} onChange={(e) => setCredits(e.target.value)} />
            </label>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Link2 />} Make link
            </Button>
          </form>
          <p className="mt-3 text-[13px] text-soft">
            Testers keep their access when a link expires or you switch it off. To close one person&apos;s studio, use &ldquo;Take back free access&rdquo; on the Writers page.
          </p>
        </section>
      )}

      {error && <p className="bg-danger-soft p-3 text-sm text-destructive">{error}</p>}
      {!data ? (
        !error && <p className="text-soft">Loading tester links…</p>
      ) : (
        <>
          <section>
            <h2 className="text-sm font-medium tracking-wide text-soft uppercase">Your links</h2>
            {!data.invites.length ? (
              <p className="mt-3 border border-border bg-card p-4 text-soft">No tester links yet. Make one above, then copy it and send it to the people who asked.</p>
            ) : (
              <ul className="mt-3 grid gap-3">
                {data.invites.map((i) => {
                  const joined = data.testers.filter((t) => t.tester === i.id);
                  return (
                    <li key={i.id} className={cn("border bg-card p-4", fresh === i.id ? "border-primary" : "border-border")}>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-ink">{i.label || "Tester link"}</p>
                        <span className={cn("px-2 py-0.5 text-xs font-medium", STATE[i.state].cls)}>{STATE[i.state].label}</span>
                        <span className="ml-auto text-[13px] text-soft tabular-nums">
                          {i.uses ?? 0} {i.max_uses ? `of ${i.max_uses}` : ""} joined · {i.expires ? `ends ${date(i.expires)}` : "no end date"}
                          {i.credits ? ` · ${i.credits} AI credits each` : ""}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Input readOnly value={i.url} onFocus={(e) => e.currentTarget.select()} aria-label="Invite link" className="min-w-60 flex-1 font-mono text-[13px]" />
                        <Button size="sm" variant={fresh === i.id ? "default" : "outline"} onClick={() => copy(i)}>
                          {copied === i.id ? <Check /> : <Copy />} {copied === i.id ? "Copied" : "Copy link"}
                        </Button>
                        {!manage ? null : i.revoked ? (
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => act({ action: "restore", id: i.id })}>
                            <RotateCcw /> Switch back on
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => act({ action: "revoke", id: i.id })}>
                            <Ban /> Switch off
                          </Button>
                        )}
                      </div>
                      {joined.length > 0 && <p className="mt-2 text-[13px] text-ink-2">Joined: {joined.map((t) => t.email).join(", ")}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-sm font-medium tracking-wide text-soft uppercase">Testers ({data.testers.length})</h2>
            {!data.testers.length ? (
              <p className="mt-3 border border-border bg-card p-4 text-soft">Nobody has joined through a tester link yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto border border-border bg-card">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-border text-[12.5px] text-soft">
                    <tr>
                      <th className="px-3 py-2 font-medium">Tester</th>
                      <th className="px-3 py-2 font-medium">Link</th>
                      <th className="px-3 py-2 text-right font-medium">Books</th>
                      <th className="px-3 py-2 font-medium">Last active</th>
                      <th className="px-3 py-2 text-right font-medium">Tickets</th>
                      <th className="px-3 py-2 text-right font-medium">Ideas</th>
                      <th className="px-3 py-2 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.testers.map((t) => (
                      <tr key={t.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-ink">{t.name || t.email.split("@")[0]}</p>
                          <a href={`mailto:${t.email}`} className="text-[12.5px] text-soft hover:text-primary">
                            {t.email}
                          </a>
                          {t.access === "pending" && <span className="ml-2 bg-paper-2 px-2 py-0.5 text-xs text-soft">Access taken back</span>}
                        </td>
                        <td className="px-3 py-2.5 text-ink-2">{data.invites.find((i) => i.id === t.tester)?.label || "Tester link"}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{t.books}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{ago(t.lastActive)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {t.tickets ? (
                            <Link href="/studio/admin/support" className="text-primary hover:underline">
                              {t.tickets}
                            </Link>
                          ) : (
                            0
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {t.ideas ? (
                            <Link href="/studio/admin/support" className="text-primary hover:underline">
                              {t.ideas}
                            </Link>
                          ) : (
                            0
                          )}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{date(t.created)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
