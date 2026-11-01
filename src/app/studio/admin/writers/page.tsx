"use client";

import { useEffect, useState } from "react";
import { Ban, Coins, Gift, KeyRound, Loader2, Mail, RotateCcw, Search, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ago, call, CsvButton, date, Loading, num, PageHead, Pill, Problem, Table, Td, TONES, useAdmin } from "@/components/admin/kit";
import { siteLabel, siteUrl } from "@/lib/sites";
import { money, type Writer } from "@/lib/admin";
import { can, SUPPORT_CREDIT_LIMIT } from "@/lib/admin-roles";
import { cn } from "@/lib/utils";

const ACCESS: Record<Writer["access"], { label: string; cls: string }> = {
  paid: { label: "Paid", cls: TONES.brand },
  comp: { label: "Free access", cls: TONES.info },
  pending: { label: "Not paid", cls: TONES.quiet },
  collaborator: { label: "Collaborator", cls: TONES.warn },
};

type Show = "writers" | "all" | "testers" | "spam" | "suspended" | Writer["access"];
const SHOWS: Show[] = ["writers", "paid", "comp", "pending", "testers", "spam", "suspended", "collaborator", "all"];
const SHOW_LABEL: Record<Show, string> = {
  writers: "Writers",
  paid: "Paid",
  comp: "Free access",
  pending: "Not paid",
  testers: "Testers",
  spam: "Looks like spam",
  suspended: "Suspended",
  collaborator: "Collaborators",
  all: "Everyone",
};
const matches = (w: Writer, s: Show) =>
  s === "all"
    ? true
    : s === "writers"
      ? w.access !== "collaborator"
      : s === "testers"
        ? Boolean(w.tester)
        : s === "spam"
          ? w.spam.length > 0 && !w.suspended
          : s === "suspended"
            ? w.suspended
            : w.access === s;

/** Every account, with what the owner and team can do to it. */
export default function WritersPage() {
  const [list, setList] = useState<Writer[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [show, setShow] = useState<Show>(() => {
    const s = new URLSearchParams(window.location.search).get("show") as Show;
    return SHOWS.includes(s) ? s : "writers";
  });
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    call<{ writers: Writer[] }>("/api/admin/writers")
      .then((j) => setList(j.writers))
      .catch((e: Error) => setError(e.message));
  }, []);

  const needle = q.trim().toLowerCase();
  const shown = (list ?? []).filter((w) => matches(w, show) && (!needle || `${w.email} ${w.name} ${w.site?.subdomain ?? ""} ${w.site?.custom_domain ?? ""}`.toLowerCase().includes(needle)));
  const replace = (w: Writer) => setList((all) => (all ?? []).map((x) => (x.id === w.id ? w : x)));
  const remove = (id: string) => setList((all) => (all ?? []).filter((x) => x.id !== id));

  return (
    <div className="grid gap-5">
      <PageHead title="Writers" sub="Every account on the platform. Click a row for what you can do.">
        {list && (
          <CsvButton
            name="jollof-writers"
            rows={() =>
              shown.map((w) => ({
                email: w.email,
                name: w.name,
                plan: ACCESS[w.access].label,
                tester: w.tester ? "yes" : "",
                books: w.books,
                words: w.words,
                last_active: w.lastActive,
                site: w.site ? siteLabel(w.site) : "",
                pro: w.pro ? "yes" : "",
                credits: w.credits,
                spent: (w.spentCents / 100).toFixed(2),
                joined: w.created,
                suspended: w.suspended ? "yes" : "",
              }))
            }
          />
        )}
      </PageHead>
      {error && <Problem text={error} />}
      {!list ? (
        !error && <Loading what="Loading writers" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-60 flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-soft" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email, name or site" aria-label="Search writers" className="pl-9" />
            </div>
            <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Show">
              {SHOWS.map((s) => {
                const n = list.filter((w) => matches(w, s)).length;
                if (!n && s !== "writers" && s !== show) return null;
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={show === s}
                    onClick={() => setShow(s)}
                    className={cn(
                      "h-9 border px-3 text-[13px] whitespace-nowrap",
                      show === s ? "border-ink bg-ink text-card" : "border-border bg-card text-ink-2 hover:border-primary",
                      s === "spam" && show !== s && "text-destructive",
                    )}
                  >
                    {SHOW_LABEL[s]} <span className="tabular-nums opacity-70">{n}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Table
            head={[
              "Writer",
              "Plan",
              { label: "Books", right: true },
              { label: "Words", right: true },
              "Last active",
              "Website",
              { label: "Credits", right: true },
              { label: "Spent", right: true },
              "Joined",
            ]}
            min={980}
            empty={!shown.length && "No writers match."}
          >
            {shown.map((w) => (
              <WriterRow key={w.id} w={w} open={open === w.id} onToggle={() => setOpen(open === w.id ? null : w.id)} onChange={replace} onDelete={remove} />
            ))}
          </Table>
        </>
      )}
    </div>
  );
}

function WriterRow({ w, open, onToggle, onChange, onDelete }: { w: Writer; open: boolean; onToggle: () => void; onChange: (w: Writer) => void; onDelete: (id: string) => void }) {
  const { home } = useAdmin();
  const role = home.me.role;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [credits, setCredits] = useState("20");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");
  const [danger, setDanger] = useState<"" | "suspend" | "delete">("");
  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    setErr("");
    try {
      const j = await call<{ writer?: Writer; password?: string; deleted?: string }>("/api/admin/writers", { id: w.id, ...body });
      if (j.deleted) return onDelete(j.deleted);
      if (j.writer) onChange(j.writer);
      if (j.password) setPassword(j.password);
      setDanger("");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <tr className={cn("cursor-pointer border-b border-border last:border-0 hover:bg-muted/50", open && "bg-muted/50", w.suspended && "opacity-60")} onClick={onToggle} aria-expanded={open}>
        <Td>
          <p className="font-medium text-ink">{w.name || w.email.split("@")[0]}</p>
          <p className="text-[12.5px] text-soft">{w.email}</p>
        </Td>
        <Td>
          <span className="flex flex-wrap gap-1">
            <Pill cls={ACCESS[w.access].cls}>{ACCESS[w.access].label}</Pill>
            {w.pro && <Pill cls={TONES.dark}>Pro</Pill>}
            {w.tester && <Pill cls={TONES.tester}>Tester</Pill>}
            {w.suspended && <Pill cls={TONES.bad}>Suspended</Pill>}
            {!w.suspended && w.spam.length > 0 && (
              <Pill cls={TONES.bad}>
                <ShieldAlert className="mr-1 inline size-3" />
                Spam?
              </Pill>
            )}
          </span>
        </Td>
        <Td right>{w.books}</Td>
        <Td right>{num(w.words)}</Td>
        <Td className="whitespace-nowrap">{ago(w.lastActive)}</Td>
        <Td>
          {w.site?.home || w.site?.subdomain || w.site?.custom_domain ? (
            <a href={siteUrl(w.site)} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="text-primary hover:underline">
              {siteLabel(w.site)}
            </a>
          ) : (
            <span className="text-soft">None yet</span>
          )}
        </Td>
        <Td right>{w.credits}</Td>
        <Td right>{money(w.spentCents)}</Td>
        <Td className="whitespace-nowrap">{date(w.created)}</Td>
      </tr>
      {open && (
        <tr className="border-b border-border bg-muted/30">
          <td colSpan={9} className="px-3 py-3">
            {w.spam.length > 0 && <p className="mb-3 text-sm text-destructive">Looks like a spam sign-up: {w.spam.join(", ").toLowerCase()}.</p>}
            <div className="flex flex-wrap items-center gap-2">
              {can(role, "writer.access") && (w.access === "comp" || w.access === "pending") && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => act({ action: w.access === "comp" ? "pending" : "comp" })}>
                  <Gift /> {w.access === "comp" ? "Take back free access" : "Give free access"}
                </Button>
              )}
              {can(role, "writer.credits") && (
                <span className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    value={credits}
                    onChange={(e) => setCredits(e.target.value)}
                    className="h-8 w-20"
                    aria-label="Credits to give"
                    max={can(role, "writer.access") ? 10000 : SUPPORT_CREDIT_LIMIT}
                  />
                  <Button size="sm" variant="outline" disabled={busy || !Number(credits)} onClick={() => act({ action: "grant", credits: Number(credits) })}>
                    <Coins /> Give AI credits
                  </Button>
                </span>
              )}
              {can(role, "writer.password") && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => act({ action: "password" })}>
                  <KeyRound /> Set a temporary password
                </Button>
              )}
              <a href={`mailto:${w.email}`} className="inline-flex h-8 items-center gap-1.5 px-2 text-sm text-primary hover:underline">
                <Mail className="size-4" /> Email them
              </a>
              <span className="ml-auto flex gap-2">
                {can(role, "writer.suspend") &&
                  (w.suspended ? (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => act({ action: "unsuspend" })}>
                      <RotateCcw /> Lift the suspension
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => setDanger(danger === "suspend" ? "" : "suspend")}>
                      <Ban /> Suspend
                    </Button>
                  ))}
                {can(role, "writer.delete") && (
                  <Button size="sm" variant="outline" className="text-destructive" disabled={busy} onClick={() => setDanger(danger === "delete" ? "" : "delete")}>
                    <Trash2 /> Delete account
                  </Button>
                )}
              </span>
              {busy && <Loader2 className="size-4 animate-spin text-soft" />}
            </div>
            {password && (
              <p className="mt-3 border border-primary/40 bg-primary-soft p-3 text-sm" role="status">
                Temporary password: <code className="bg-card px-1.5 py-0.5 font-mono text-[15px] select-all">{password}</code>. Send it to {w.email} and ask them to change it under their account once
                they sign in. It is shown only this once.
              </p>
            )}
            {danger === "suspend" && (
              <form
                className="mt-3 flex flex-wrap items-center gap-2 border border-border bg-card p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void act({ action: "suspend", reason });
                }}
              >
                <span className="text-sm text-ink-2">They won&apos;t be able to sign in and their website goes offline. Nothing is deleted.</span>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why (only the team sees this)" className="h-8 min-w-60 flex-1" maxLength={300} />
                <Button size="sm" type="submit" disabled={busy}>
                  <Ban /> Suspend {w.email}
                </Button>
              </form>
            )}
            {danger === "delete" && (
              <form
                className="mt-3 grid gap-2 border border-destructive/40 bg-danger-soft p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void act({ action: "delete", confirm });
                }}
              >
                <p className="text-sm text-destructive">
                  This deletes the account and everything in it: {w.books} {w.books === 1 ? "book" : "books"}, their website and their credits. It can&apos;t be undone.
                  {w.access === "paid" && " They paid for the studio; refund them in Stripe first if that's fair."}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={`Type ${w.email} to confirm`} className="h-8 min-w-72 flex-1 bg-card" />
                  <Button size="sm" type="submit" variant="destructive" disabled={busy || confirm.trim().toLowerCase() !== w.email.toLowerCase()}>
                    <Trash2 /> Delete for good
                  </Button>
                </div>
              </form>
            )}
            {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
          </td>
        </tr>
      )}
    </>
  );
}
