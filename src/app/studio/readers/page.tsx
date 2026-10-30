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

  const load = useCallback(() => {
    pb()
      .collection("subscribers")
      .getFullList<Reader>({ filter: pb().filter("owner = {:u}", { u: userId() }), sort: "-created" })
      .then(setReaders)
      .catch(() => undefined);
    pb()
      .collection("newsletters")
      .getFullList<Letter>({ sort: "-updated" })
      .then(setLetters)
      .catch(() => undefined);
  }, []);
  useEffect(load, [load]);

  const active = readers.filter((r) => !r.unsubscribed);
  const canSend = !!status?.pro && !!status?.mail;

  return (
    <>
      <StudioNav />
      <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-8">
        <h1 className="pt-10 text-[clamp(1.75rem,3vw,2.5rem)] tracking-[-0.02em]">Readers</h1>

        <Panel title="Newsletters" description="Write to everyone on your list. Each email carries an unsubscribe link, and replies come to you.">
          {!status?.pro ? (
            <p className="rounded-md bg-muted p-3 text-sm">Newsletters come with Author Site Pro (Website page). You can write drafts now.</p>
          ) : !status.mail ? (
            <p className="rounded-md bg-muted p-3 text-sm">Sending is being set up on the server. You can write drafts now.</p>
          ) : null}
          {open ? (
            <Composer letter={open} readers={active.length} canSend={canSend} onClose={() => (setOpen(null), load())} />
          ) : (
            <>
              <div>
                <Button
                  onClick={async () => {
                    const l = await pb().collection("newsletters").create<Letter>({ owner: userId(), subject: "", body: "", status: "draft" });
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
                        {l.status === "sent" ? `Sent to ${l.sent_count} on ${l.sent_at.slice(0, 10)}` : l.status === "failed" ? `Stopped after ${l.sent_count}: ${l.error}` : l.status === "sending" ? "Sending…" : "Draft"}
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
      const res = await fetch("/api/newsletters/send", { method: "POST", headers: { Authorization: pb().authStore.token, "Content-Type": "application/json" }, body: JSON.stringify({ id: letter.id, test }) });
      const out = (await res.json()) as { sent?: number; to?: string; error?: string };
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
