"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Send } from "lucide-react";
import { StudioNav } from "@/components/studio/studio-nav";
import { Panel } from "@/components/studio/book/details-tab";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProStatus } from "@/components/studio/pro-panel";
import { errorMessage, pb } from "@/lib/pb";
import { userId } from "@/lib/studio";
import { EMAIL_PACKS, allowanceLeft, type EmailQuota } from "@/lib/email-quota";
import type { MailAccount } from "@/lib/mail-account";

interface Reader {
  id: string;
  email: string;
  source: string;
  unsubscribed: boolean;
  created: string;
}

interface Letter {
  id: string;
  subject: string;
  body: string;
  status: "draft" | "sending" | "sent" | "failed";
  sent_at: string;
  recipients: number;
  sent_count: number;
  error: string;
  updated: string;
}

/** The author's reader list and the newsletters they send it. */
export default function ReadersPage() {
  const [readers, setReaders] = useState<Reader[]>([]);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [open, setOpen] = useState<Letter | null>(null);
  const { status } = useProStatus();
  const [quota, setQuota] = useState<EmailQuota | null>(null);
  const [account, setAccount] = useState<MailAccount | null>(null);

  const load = useCallback(() => {
    pb()
      .collection("subscribers")
      .getFullList<Reader>({
        filter: pb().filter("owner = {:u}", { u: userId() }),
        sort: "-created",
      })
      .then(setReaders)
      .catch(() => undefined);
    pb()
      .collection("newsletters")
      .getFullList<Letter>({ sort: "-updated" })
      .then(setLetters)
      .catch(() => undefined);
    fetch("/api/newsletters/quota", {
      headers: { Authorization: pb().authStore.token },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((q: EmailQuota | null) => q && setQuota(q))
      .catch(() => undefined);
    fetch("/api/newsletters/account", {
      headers: { Authorization: pb().authStore.token },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((a: MailAccount | null) => a && setAccount(a))
      .catch(() => undefined);
  }, []);
  useEffect(load, [load]);

  const active = readers.filter((r) => !r.unsubscribed);
  const ownReady = !!account?.verified;
  const canSend = !!status?.pro && (!!status?.mail || ownReady);

  return (
    <>
      <StudioNav />
      <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-8">
        <h1 className="pt-10 text-[clamp(1.75rem,3vw,2.5rem)] tracking-[-0.02em]">Readers</h1>

        <Panel title="Newsletters" description="Write to everyone on your list. Each email carries an unsubscribe link, and replies come to you.">
          {!status?.pro ? (
            <p className="rounded-md bg-muted p-3 text-sm">Newsletters come with Author Site Pro (Website page). You can write drafts now.</p>
          ) : !status.mail && !ownReady ? (
            <p className="rounded-md bg-muted p-3 text-sm">Connect your free Resend account below to start sending. You can write drafts now.</p>
          ) : null}
          {status?.pro && quota && !ownReady && <EmailAllowance quota={quota} onChange={setQuota} />}
          {status?.pro && account && <OwnSending account={account} onChange={setAccount} />}
          {open ? (
            <Composer letter={open} readers={active.length} canSend={canSend} onClose={() => (setOpen(null), load())} />
          ) : (
            <>
              <div>
                <Button
                  onClick={async () => {
                    const l = await pb().collection("newsletters").create<Letter>({
                      owner: userId(),
                      subject: "",
                      body: "",
                      status: "draft",
                    });
                    setOpen(l);
                  }}
                >
                  <Plus /> New newsletter
                </Button>
              </div>
              <ul className="grid gap-2">
                {letters.map((l) => (
                  <li key={l.id}>
                    <button type="button" onClick={() => setOpen(l)} className="flex w-full items-center justify-between gap-3 rounded-md bg-card p-3 text-left hover:bg-muted">
                      <span className="font-medium">{l.subject || "Untitled draft"}</span>
                      <span className="text-sm text-soft">
                        {l.status === "sent"
                          ? `Sent to ${l.sent_count} on ${l.sent_at.slice(0, 10)}`
                          : l.status === "failed"
                            ? `Stopped after ${l.sent_count}: ${l.error}`
                            : l.status === "sending"
                              ? "Sending…"
                              : "Draft"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>

        <Panel title="Your list" description="People who joined from your website. Only you can see them.">
          <p className="text-sm">
            {active.length} {active.length === 1 ? "reader" : "readers"}
            {readers.length > active.length ? `, ${readers.length - active.length} unsubscribed` : ""}
          </p>
          {readers.length > 0 && (
            <>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const csv = "email,joined,from,status\n" + readers.map((r) => `${r.email},${r.created.slice(0, 10)},${r.source},${r.unsubscribed ? "unsubscribed" : "subscribed"}`).join("\n");
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                    a.download = "readers.csv";
                    a.click();
                  }}
                >
                  Download CSV
                </Button>
              </div>
              <ul className="max-h-80 overflow-auto rounded-md bg-card text-sm">
                {readers.slice(0, 200).map((r) => (
                  <li key={r.id} className="flex justify-between gap-3 border-b border-border px-3 py-2 last:border-0">
                    <span className={r.unsubscribed ? "text-soft line-through" : undefined}>{r.email}</span>
                    <span className="text-soft">{r.created.slice(0, 10)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      </main>
    </>
  );
}

const n = (x: number) => x.toLocaleString("en-US");

/** This month's newsletter emails, bought emails left, and buying more. */
function EmailAllowance({ quota, onChange }: { quota: EmailQuota; onChange: (q: EmailQuota) => void }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");

  // back from Stripe: credit the payment now rather than waiting for the webhook
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const session = q.get("session_id");
    if (!q.get("emails")) return;
    window.history.replaceState(null, "", window.location.pathname);
    if (q.get("emails") !== "paid" || !session) {
      queueMicrotask(() => setMsg("Payment cancelled. Nothing was charged."));
      return;
    }
    fetch("/api/newsletters/quota", {
      method: "POST",
      headers: {
        Authorization: pb().authStore.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId: session }),
    })
      .then((r) => r.json())
      .then((out: { paid?: boolean; quota?: EmailQuota; error?: string }) => {
        if (out.quota) onChange(out.quota);
        setMsg(out.error ?? (out.paid ? "Thanks! Your extra emails are ready." : "Your payment is still going through. The emails appear once it clears."));
      })
      .catch(() => undefined);
  }, [onChange]);

  async function buy(pack: string) {
    setBusy(pack);
    setMsg("");
    try {
      const res = await fetch("/api/newsletters/topup", {
        method: "POST",
        headers: {
          Authorization: pb().authStore.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pack }),
      });
      const out = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !out.url) throw new Error(out.error);
      window.location.assign(out.url);
    } catch (e) {
      setMsg(errorMessage(e));
      setBusy("");
    }
  }

  if (quota.unlimited) return <p className="text-sm text-soft">Your account sends newsletters without a monthly limit.</p>;
  const pct = quota.allowance ? Math.min(100, Math.round((quota.used / quota.allowance) * 100)) : 100;
  return (
    <div className="grid gap-3 rounded-md bg-card p-4" aria-label="Newsletter emails">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span>
          <strong>{n(allowanceLeft(quota))}</strong> of {n(quota.allowance)} emails left this month
          {quota.extra > 0 && <>, plus {n(quota.extra)} extra</>}
        </span>
        <span className="text-soft">Refills on {quota.resets}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Allowance used">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[13px] text-soft">
        Each reader counts as one email per newsletter.{" "}
        {quota.packs ? "Extra emails are used after your monthly allowance, and they never expire." : "For more, connect your own free Resend account below: it has its own 3,000 emails a month."}
      </p>
      {quota.packs && (
        <div className="flex flex-wrap gap-2">
          {EMAIL_PACKS.map((p) => (
            <Button key={p.id} variant="outline" size="sm" disabled={!!busy} onClick={() => buy(p.id)}>
              {busy === p.id ? "Opening checkout…" : `Buy ${n(p.emails)} emails, ${p.label}`}
            </Button>
          ))}
        </div>
      )}
      {msg && (
        <p className="text-sm" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}

/** The author's own free Resend account: key, sending domain, the DNS records to add, and a check. */
function OwnSending({ account, onChange }: { account: MailAccount; onChange: (a: MailAccount) => void }) {
  const [key, setKey] = useState("");
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function call(method: "POST" | "DELETE", body?: unknown) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/newsletters/account", {
        method,
        headers: {
          Authorization: pb().authStore.token,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const out = (await res.json()) as MailAccount & { error?: string };
      if (!res.ok) throw new Error(out.error);
      onChange(out);
      setKey("");
      return out;
    } catch (e) {
      setMsg(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (!account.connected)
    return (
      <form
        className="grid gap-3 rounded-md bg-card p-4"
        aria-label="Your own free sending"
        onSubmit={(e) => {
          e.preventDefault();
          void call("POST", { key, domain });
        }}
      >
        <div>
          <p className="font-medium">Send on your own free Resend account</p>
          <p className="text-[13px] text-soft">
            Every Resend account comes with 3,000 free emails a month. Sign up at{" "}
            <a className="underline" href="https://resend.com/signup" target="_blank" rel="noreferrer">
              resend.com
            </a>
            , create an API key with <b>Full access</b>, and paste it here with a domain you own. Watch “Send newsletters from your own free account” on the Learn page for every click.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="rs-key">Resend API key</Label>
            <Input id="rs-key" type="password" autoComplete="off" placeholder="re_…" value={key} onChange={(e) => setKey(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rs-domain">Send from this domain</Label>
            <Input id="rs-domain" placeholder="mail.yourname.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
          </div>
        </div>
        <div>
          <Button type="submit" disabled={busy || !key.trim() || !domain.trim()}>
            {busy ? "Connecting…" : "Connect"}
          </Button>
        </div>
        {msg && (
          <p className="text-sm text-destructive" role="alert">
            {msg}
          </p>
        )}
      </form>
    );

  return (
    <div className="grid gap-3 rounded-md bg-card p-4" aria-label="Your own free sending">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">{account.verified ? "Sending on your own Resend account" : "Almost there: add these records where your domain’s DNS lives"}</p>
        <span className="text-sm text-soft">
          {account.domain} · {account.keyHint}
        </span>
      </div>
      {account.verified ? (
        <p className="text-[13px] text-soft">
          Newsletters go out from {account.fromLocal}@{account.domain} on your free 3,000 a month. Replies still come to you.
        </p>
      ) : (
        <>
          <p className="text-[13px] text-soft">Copy each record into your domain’s DNS settings (in Cloudflare, turn the proxy off). Then click Check. It can take a few minutes, sometimes an hour.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="text-soft">
                <tr>
                  <th className="py-1 pr-4 font-normal">Type</th>
                  <th className="py-1 pr-3 font-normal">Name</th>
                  <th className="py-1 pr-3 font-normal">Value</th>
                  <th className="py-1 pr-3 font-normal">Priority</th>
                  <th className="py-1 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {(account.records ?? []).map((r, i) => (
                  <tr key={i} className="border-t border-border align-top">
                    <td className="py-1.5 pr-4">{r.type}</td>
                    <td className="py-1.5 pr-3 font-mono">{r.name}</td>
                    <td className="max-w-[22rem] break-all py-1.5 pr-3 font-mono">
                      <button type="button" className="text-left hover:underline" title="Copy" onClick={() => void navigator.clipboard?.writeText(r.value)}>
                        {r.value}
                      </button>
                    </td>
                    <td className="py-1.5 pr-3">{r.priority ?? ""}</td>
                    <td className="py-1.5">{r.status ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div className="flex flex-wrap gap-2">
        {!account.verified && (
          <Button size="sm" disabled={busy} onClick={() => void call("POST", { check: true }).then((a) => a && !a.verified && setMsg("Not verified yet. Give it a few minutes and check again."))}>
            {busy ? "Checking…" : "Check"}
          </Button>
        )}
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => void call("DELETE")}>
          Disconnect
        </Button>
      </div>
      {msg && (
        <p className="text-sm" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}

function Composer({ letter, readers, canSend, onClose }: { letter: Letter; readers: number; canSend: boolean; onClose: () => void }) {
  const [subject, setSubject] = useState(letter.subject);
  const [body, setBody] = useState(letter.body);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const locked = letter.status !== "draft";

  async function save() {
    if (locked) return;
    await pb().collection("newsletters").update(letter.id, { subject, body });
  }

  async function send(test: boolean) {
    setBusy(true);
    setMsg("");
    try {
      await save();
      const res = await fetch("/api/newsletters/send", {
        method: "POST",
        headers: {
          Authorization: pb().authStore.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: letter.id, test }),
      });
      const out = (await res.json()) as {
        sent?: number;
        to?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(out.error);
      if (test) setMsg(`Test sent to ${out.to}.`);
      else onClose();
    } catch (e) {
      setMsg(errorMessage(e));
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="nl-subject">Subject</Label>
        <Input id="nl-subject" value={subject} disabled={locked} maxLength={200} onChange={(e) => setSubject(e.target.value)} onBlur={save} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="nl-body">Letter</Label>
        <Textarea id="nl-body" rows={14} value={body} disabled={locked} onChange={(e) => setBody(e.target.value)} onBlur={save} />
        <p className="text-[13px] text-soft">Leave a blank line between paragraphs. **bold**, *italic*, # for a heading, and links like [my new book](https://…) work.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={async () => (await save(), onClose())}>
          Back
        </Button>
        {!locked && (
          <>
            <Button variant="outline" disabled={busy || !canSend} onClick={() => send(true)}>
              Send me a test
            </Button>
            {confirm ? (
              <Button disabled={busy} onClick={() => send(false)}>
                <Send /> Yes, send to {readers} {readers === 1 ? "reader" : "readers"}
              </Button>
            ) : (
              <Button disabled={busy || !canSend || !readers || !subject.trim() || !body.trim()} onClick={() => setConfirm(true)}>
                <Send /> Send to {readers} {readers === 1 ? "reader" : "readers"}
              </Button>
            )}
            <Button
              variant="ghost"
              className="ml-auto text-destructive"
              onClick={async () => {
                await pb().collection("newsletters").delete(letter.id);
                onClose();
              }}
            >
              Delete draft
            </Button>
          </>
        )}
      </div>
      {msg && (
        <p className="text-sm" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}
