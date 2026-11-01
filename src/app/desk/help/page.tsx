"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpenCheck, Check, ChevronDown, ClipboardCopy, FileText, Inbox, Lightbulb, LifeBuoy, Loader2, MessageSquare, Paperclip, Search, Send, X } from "lucide-react";
import { replayWelcome } from "@/components/studio/welcome";
import { StudioNav } from "@/components/studio/studio-nav";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { FAQ, faqMatches } from "@/lib/help-content";
import { pb } from "@/lib/pb";
import { SUPPORT_TOPICS, TICKET_FILES, ticketNo, topicLabel, type SupportRequest } from "@/lib/support";
import { cn } from "@/lib/utils";

const auth = () => ({ Authorization: `Bearer ${pb().authStore.token}`, "Content-Type": "application/json" });
/** for forms with files: the browser sets the multipart content type itself */
const authOnly = () => ({ Authorization: `Bearer ${pb().authStore.token}` });

const STATUS: Record<SupportRequest["status"], { label: string; cls: string }> = {
  open: { label: "Waiting for us", cls: "bg-[#fbecd0] text-[#7a4b06]" },
  answered: { label: "Answered", cls: "bg-primary-soft text-primary" },
  closed: { label: "Closed", cls: "bg-paper-2 text-soft" },
};

function when(iso: string) {
  return new Date(iso.replace(" ", "T")).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Help: answers to common questions, a contact form, and the conversations that follow. */
export default function HelpPage() {
  const [query, setQuery] = useState("");
  const [requests, setRequests] = useState<SupportRequest[] | null>(null);
  const [team, setTeam] = useState(false);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(() => {
    fetch("/api/support", { headers: auth() })
      .then(async (res) => {
        const j = (await res.json()) as { team?: boolean; requests?: SupportRequest[]; error?: string };
        if (!res.ok) throw new Error(j.error || "Could not load your messages.");
        setTeam(!!j.team);
        setRequests(j.requests ?? []);
      })
      .catch((e: Error) => setLoadError(e.message));
  }, []);
  useEffect(load, [load]);

  const groups = useMemo(() => FAQ.map((g) => ({ ...g, items: query ? g.items.filter((f) => faqMatches(f, query)) : g.items })).filter((g) => g.items.length), [query]);
  const hits = groups.reduce((n, g) => n + g.items.length, 0);
  const me = pb().authStore.record?.id;
  const mine = (requests ?? []).filter((r) => r.owner === me);
  const inbox = team ? (requests ?? []) : [];

  return (
    <>
      <StudioNav />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
        <section className="relative overflow-hidden bg-primary px-6 py-10 text-primary-foreground sm:px-10">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(currentColor_1px,transparent_1.5px)] [background-size:14px_14px]" />
          <div className="relative">
            <p className="flex items-center gap-2 text-sm font-medium tracking-[0.12em] uppercase opacity-85">
              <LifeBuoy className="size-4" /> Help and support
            </p>
            <h1 className="mt-3 text-[clamp(1.9rem,3.4vw,2.8rem)] leading-tight tracking-[-0.02em]">How can we help?</h1>
            <label className="relative mt-6 block max-w-xl">
              <span className="sr-only">Search help</span>
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-soft" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search: gutter, ISBN, smart quotes, domain…"
                className="h-12 w-full bg-card pr-4 pl-11 text-base text-ink shadow-sm outline-none placeholder:text-soft focus-visible:ring-2 focus-visible:ring-white/70"
              />
            </label>
          </div>
        </section>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink href="/desk/learn" icon={BookOpenCheck} title="Learn the Desk" text="Short guides from first chapter to published book." />
          <QuickLink href="#contact" icon={MessageSquare} title="Open a ticket" text="Ask anything. We answer within one working day." />
          <QuickLink href="#messages" icon={Inbox} title="Your tickets" text={requests ? `${mine.length} ${mine.length === 1 ? "ticket" : "tickets"}, ${mine.filter((r) => r.status === "answered").length} answered` : "Your tickets and our answers."} />
          <QuickLink href="/desk/ideas" icon={Lightbulb} title="Request a feature" text="Suggest what to build next and vote on ideas." />
        </div>
        <p className="mt-3 text-sm text-soft">
          New here?{" "}
          <Link
            href="/desk"
            onClick={replayWelcome}
            className="font-medium text-primary hover:underline"
          >
            Show the welcome tour again
          </Link>
        </p>

        <section aria-labelledby="faq" className="mt-12">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="faq" className="text-2xl tracking-tight">
              {query ? `${hits} ${hits === 1 ? "answer" : "answers"} for “${query}”` : "Common questions"}
            </h2>
            {query && (
              <button type="button" onClick={() => setQuery("")} className="text-sm text-primary hover:underline">
                Clear search
              </button>
            )}
          </div>
          {!groups.length && (
            <p className="mt-4 border border-border bg-card p-5 text-ink-2">
              Nothing matches that yet.{" "}
              <a href="#contact" className="text-primary underline">
                Ask us directly
              </a>{" "}
              and we will answer.
            </p>
          )}
          <div className="mt-4 grid gap-8">
            {groups.map((g) => (
              <div key={g.id}>
                <h3 className="text-[13px] font-semibold tracking-[0.1em] text-soft uppercase">{g.title}</h3>
                <ul className="mt-2 divide-y divide-border border border-border bg-card">
                  {g.items.map((f) => (
                    <li key={f.q}>
                      <details className="group" open={!!query}>
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium hover:bg-paper [&::-webkit-details-marker]:hidden">
                          {f.q}
                          <ChevronDown className="size-4 shrink-0 text-soft transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="grid gap-3 px-5 pb-5 text-ink-2">
                          {f.a.split(/\n{2,}/).map((p, i) => (
                            <p key={i} className="max-w-[70ch]">
                              {p}
                            </p>
                          ))}
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <ContactForm onSent={load} />

        <section id="messages" aria-labelledby="messages-h" className="mt-12 scroll-mt-20">
          <h2 id="messages-h" className="text-2xl tracking-tight">
            Your tickets
          </h2>
          {loadError ? (
            <p className="mt-4 bg-danger-soft p-3 text-sm text-destructive">{loadError}</p>
          ) : !requests ? (
            <p className="mt-4 text-soft">Loading…</p>
          ) : !mine.length ? (
            <p className="mt-4 text-soft">No tickets yet. Anything you send appears here with our answers.</p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {mine.map((r) => (
                <Conversation key={r.id} r={r} viewer="writer" onChange={load} />
              ))}
            </ul>
          )}
        </section>

        {team && (
          <section id="inbox" aria-labelledby="inbox-h" className="mt-12 scroll-mt-20 border-t-4 border-primary pt-6">
            <h2 id="inbox-h" className="flex items-center gap-2 text-2xl tracking-tight">
              <Inbox className="size-6 text-primary" /> Support inbox
            </h2>
            <p className="mt-1 text-soft">Every writer&apos;s requests. Only the support team sees this. Answers show on the writer&apos;s Help page, with a copy by email when email is set up. Use Copy for Claude to hand a problem to Claude in one paste.</p>
            <SupportInbox requests={inbox} onChange={load} />
          </section>
        )}
      </main>
    </>
  );
}

function QuickLink({ href, icon: Icon, title, text }: { href: string; icon: React.ComponentType<{ className?: string }>; title: string; text: string }) {
  const cls = "group flex gap-3 border border-border bg-card p-4 transition-colors hover:border-primary";
  const body = (
    <>
      <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
      <span>
        <span className="block font-medium group-hover:text-primary">{title}</span>
        <span className="block text-sm text-soft">{text}</span>
      </span>
    </>
  );
  return href.startsWith("#") ? (
    <a href={href} className={cls}>
      {body}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {body}
    </Link>
  );
}

// ?topic=bug (the editor's Report a bug) opens the form on that topic
function linkedTopic() {
  if (typeof window === "undefined") return null;
  const t = new URLSearchParams(window.location.search).get("topic");
  return SUPPORT_TOPICS.some((x) => x.id === t) ? t : null;
}

function ContactForm({ onSent }: { onSent: () => void }) {
  const [topic, setTopic] = useState<string>(() => linkedTopic() ?? "question");
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    if (linkedTopic()) section.current?.scrollIntoView({ block: "start" });
  }, []);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const email = String(pb().authStore.record?.email ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("topic", topic);
      form.set("subject", subject);
      form.set("message", message);
      form.set("page", document.referrer);
      files.forEach((f) => form.append("files", f));
      const res = await fetch("/api/support", { method: "POST", headers: authOnly(), body: form });
      const j = (await res.json()) as { error?: string; request?: SupportRequest };
      if (!res.ok) throw new Error(j.error || "Could not send.");
      setSent(`${j.request ? `${ticketNo(j.request)} ` : ""}${subject}`);
      setSubject("");
      setMessage("");
      setFiles([]);
      onSent();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section ref={section} id="contact" aria-labelledby="contact-h" className="mt-12 scroll-mt-20 border border-border bg-card p-6 sm:p-8">
      <h2 id="contact-h" className="text-2xl tracking-tight">
        Open a support ticket
      </h2>
      <p className="mt-1 text-soft">
        Tell us what you were doing and what you expected, and add a screenshot if you can. We answer on your ticket within one working day, usually sooner
        {email ? `, and send a copy to ${email}` : ""}.
      </p>
      {sent ? (
        <div className="mt-6 border-l-4 border-primary bg-primary-soft p-5">
          <p className="font-medium">Ticket opened: “{sent}”</p>
          <p className="mt-1 text-ink-2">Our answer will appear under Your tickets below{email ? `, with a copy to ${email}` : ""}.</p>
          <Button variant="outline" className="mt-4" onClick={() => setSent(null)}>
            Open another ticket
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">What is it about?</span>
            <select value={topic} onChange={(e) => setTopic(e.target.value)} className="h-10 border border-input bg-card px-3">
              {SUPPORT_TOPICS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">Subject</span>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} required placeholder="e.g. My PDF has a blank page after chapter 3" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">Message</span>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} required minLength={10} maxLength={10000} rows={7} placeholder="Which book, which tab, and what happened." />
          </label>
          <FilePicker files={files} onChange={setFiles} />
          {error && <p className="bg-danger-soft p-3 text-sm text-destructive">{error}</p>}
          <div>
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Send />}
              {busy ? "Sending" : "Open ticket"}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

function Conversation({ r, viewer, onChange }: { r: SupportRequest; viewer: "writer" | "support"; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [copied, setCopied] = useState(false);
  const replies = r.replies ?? [];
  // the first message's files are the ones no reply claims
  const later = new Set(replies.flatMap((m) => m.files ?? []));
  const firstFiles = (r.attachments ?? []).filter((n) => !later.has(n));

  async function send(status?: "closed" | "open") {
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("id", r.id);
      form.set("text", text);
      if (status) form.set("status", status);
      files.forEach((f) => form.append("files", f));
      const res = await fetch("/api/support/reply", { method: "POST", headers: authOnly(), body: form });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error || "Could not send.");
      setText("");
      setFiles([]);
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="border border-border bg-card">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-paper">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">
            {r.number ? <span className="mr-2 font-normal text-soft tabular-nums">{ticketNo(r)}</span> : null}
            {r.subject}
          </span>
          <span className="block text-sm text-soft">
            {viewer === "support" ? `${r.email} · ` : ""}
            {topicLabel(r.topic)} · {when(r.updated)}
            {replies.length ? ` · ${replies.length} ${replies.length === 1 ? "reply" : "replies"}` : ""}
          </span>
        </span>
        <span className={cn("shrink-0 px-2 py-0.5 text-xs font-medium", STATUS[r.status].cls)}>{viewer === "support" && r.status === "open" ? "Needs an answer" : STATUS[r.status].label}</span>
        <ChevronDown className={cn("mt-1 size-4 shrink-0 text-soft transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-border px-5 py-4">
          <ol className="grid gap-3">
            <Bubble from="writer" viewer={viewer} text={r.message} at={r.created} files={firstFiles} ticketId={r.id} />
            {replies.map((m, i) => (
              <Bubble key={i} from={m.from} viewer={viewer} text={m.text} at={m.at} files={m.files} ticketId={r.id} />
            ))}
          </ol>
          <div className="mt-4 grid gap-2">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder={viewer === "support" ? "Write your answer…" : "Add a follow-up…"} aria-label="Reply" />
            <FilePicker files={files} onChange={setFiles} compact />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={busy || (!text.trim() && !files.length)} onClick={() => send()}>
                <Send /> {viewer === "support" ? "Send answer" : "Send follow-up"}
              </Button>
              {viewer === "support" && (
                <Button
                  size="sm"
                  variant="outline"
                  title="Copies the whole ticket as text, ready to paste to Claude"
                  onClick={async () => {
                    await navigator.clipboard.writeText(ticketAsText(r));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? <Check /> : <ClipboardCopy />} {copied ? "Copied" : "Copy for Claude"}
                </Button>
              )}
              {r.status !== "closed" ? (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => send("closed")}>
                  {viewer === "support" ? "Close" : "Mark as solved"}
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => send("open")}>
                  Reopen
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

function Bubble({ from, viewer, text, at, files, ticketId }: { from: "writer" | "support"; viewer: "writer" | "support"; text: string; at: string; files?: string[]; ticketId: string }) {
  const mine = from === viewer;
  return (
    <li className={cn("max-w-[85%] p-3.5", mine ? "ml-auto bg-primary-soft" : "bg-paper-2")}>
      <p className="text-xs font-medium text-soft">
        {from === "support" ? "Jollof Pages support" : viewer === "writer" ? "You" : "Writer"} · {when(at)}
      </p>
      {text && <p className="mt-1 whitespace-pre-wrap text-ink">{text}</p>}
      {!!files?.length && (
        <div className="mt-2 flex flex-wrap gap-2">
          {files.map((n) => (
            <TicketFile key={n} ticketId={ticketId} name={n} />
          ))}
        </div>
      )}
    </li>
  );
}

function SupportInbox({ requests, onChange }: { requests: SupportRequest[]; onChange: () => void }) {
  const [filter, setFilter] = useState<"open" | "answered" | "closed" | "all">("open");
  const shown = requests.filter((r) => filter === "all" || r.status === filter);
  const counts = { open: 0, answered: 0, closed: 0, all: requests.length };
  for (const r of requests) counts[r.status]++;
  return (
    <>
      <div role="tablist" aria-label="Filter requests" className="mt-4 flex flex-wrap gap-1">
        {(["open", "answered", "closed", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={cn("h-9 border px-3 text-sm", filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary")}
          >
            {f === "open" ? "Needs an answer" : f[0].toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>
      {!shown.length ? (
        <p className="mt-4 text-soft">Nothing here.</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {shown.map((r) => (
            <Conversation key={r.id} r={r} viewer="support" onChange={onChange} />
          ))}
        </ul>
      )}
    </>
  );
}

/** The ticket as plain text, so a problem can be handed to Claude (or anyone) in one paste. */
function ticketAsText(r: SupportRequest): string {
  const lines = [
    `Jollof Pages support ticket ${ticketNo(r)}: ${r.subject}`,
    `From: ${r.email}`,
    `Topic: ${topicLabel(r.topic)}`,
    `Status: ${r.status}`,
    `Opened: ${when(r.created)}`,
    r.page ? `They came from: ${r.page}` : "",
    "",
    `--- Writer, ${when(r.created)} ---`,
    r.message,
    ...(r.replies ?? []).flatMap((m) => ["", `--- ${m.from === "support" ? "Support" : "Writer"}, ${when(m.at)} ---`, m.text, ...(m.files?.length ? [`(${m.files.length} attachment${m.files.length === 1 ? "" : "s"})`] : [])]),
    (r.attachments ?? []).length ? `\nThe ticket has ${(r.attachments ?? []).length} screenshot or file attachment(s); open it in the support inbox to see them.` : "",
  ];
  return lines.filter((l, i) => l !== "" || i > 5).join("\n");
}

/** Pick screenshots or PDFs to send with a ticket or a reply. */
function FilePicker({ files, onChange, compact }: { files: File[]; onChange: (f: File[]) => void; compact?: boolean }) {
  const [error, setError] = useState("");
  return (
    <div className="grid gap-2">
      <label className={cn("inline-flex w-fit cursor-pointer items-center gap-2 border border-dashed border-input text-sm text-ink-2 hover:border-primary hover:text-primary", compact ? "h-8 px-2.5" : "h-10 px-3")}>
        <Paperclip className="size-4" />
        {compact ? "Attach" : "Add screenshots or a PDF"}
        <input
          type="file"
          multiple
          accept={TICKET_FILES.accept}
          className="sr-only"
          onChange={(e) => {
            const picked = [...(e.target.files ?? [])];
            e.target.value = "";
            const big = picked.find((f) => f.size > TICKET_FILES.maxBytes);
            if (big) return setError(`${big.name} is larger than 10 MB.`);
            const all = [...files, ...picked].slice(0, TICKET_FILES.max);
            setError(files.length + picked.length > TICKET_FILES.max ? `Up to ${TICKET_FILES.max} files at a time.` : "");
            onChange(all);
          }}
        />
      </label>
      {!!files.length && (
        <ul className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-1.5 bg-paper-2 py-1 pr-1 pl-2.5 text-[13px]">
              <span className="max-w-48 truncate">{f.name}</span>
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onChange(files.filter((_, j) => j !== i))} className="grid size-5 place-items-center text-soft hover:text-destructive">
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

/** A ticket's screenshot, fetched with the sign-in token (files are private), opening full size on click. */
function TicketFile({ ticketId, name }: { ticketId: string; name: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const pdf = name.toLowerCase().endsWith(".pdf");
  useEffect(() => {
    let live = true;
    let made = "";
    fetch(`/api/support/file?id=${encodeURIComponent(ticketId)}&name=${encodeURIComponent(name)}`, { headers: authOnly() })
      .then((res) => (res.ok ? res.blob() : null))
      .then((b) => {
        if (!b || !live) return;
        made = URL.createObjectURL(b);
        setUrl(made);
      })
      .catch(() => undefined);
    return () => {
      live = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [ticketId, name]);
  if (pdf)
    return (
      <a href={url ?? undefined} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 border border-border bg-card px-3 text-sm hover:border-primary">
        <FileText className="size-4 text-primary" /> {name.replace(/_[a-z0-9]{10}(\.pdf)$/i, "$1")}
      </a>
    );
  return (
    <a href={url ?? undefined} target="_blank" rel="noreferrer" className="block size-24 overflow-hidden border border-border bg-card hover:border-primary">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt="Screenshot" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-xs text-soft">Loading…</span>}
    </a>
  );
}
