"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, FileDiff, LogOut, Mail, MessageSquare, PenLine, Send, Trash2, UserPlus, Users } from "lucide-react";
import { StudioNav } from "@/components/studio/studio-nav";
import { isCollaboratorOnly } from "@/components/studio/auth-gate";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_INFO } from "@/lib/collab";
import { listBooks, userId } from "@/lib/studio";
import { errorMessage, pb } from "@/lib/pb";
import type { Book } from "@/lib/types";
import { cn } from "@/lib/utils";

type Role = "cowriter" | "editor" | "commenter";

interface Invite {
  id: string;
  book: string;
  owner: string;
  email: string;
  name: string;
  role: Role;
  status: "pending" | "accepted" | "revoked";
  user: string;
  created: string;
  expand?: { book?: Book & { expand?: { author?: { name: string } } } };
}

const ROLES: Role[] = ["cowriter", "editor", "commenter"];
const ICONS: Record<Role, React.ComponentType<{ className?: string }>> = { cowriter: PenLine, editor: FileDiff, commenter: MessageSquare };
const HOW: Record<Role, string[]> = {
  cowriter: [
    "Writes in the same chapters as you, at the same time.",
    "Each person's cursor shows in their own colour, with their name.",
    "Can add, rename and reorder chapters. Cannot publish, export or change the design.",
  ],
  editor: [
    "Everything they type or delete is kept as a suggestion: added words underlined in green, removed words struck through in red.",
    "You accept or reject each change, or all at once, from the Track changes panel in the Write tab.",
    "Changes still waiting are left out of your exports, so a book never ships half-edited.",
  ],
  commenter: [
    "Reads every chapter and leaves comments on the words they select.",
    "You reply to a comment or resolve it. Everyone on the book sees new comments as they arrive.",
    "Cannot change a word of the text.",
  ],
};

async function manage(inviteId: string, action: string, role?: Role): Promise<{ link?: string; emailed?: boolean }> {
  const res = await fetch("/api/collab/manage", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: pb().authStore.token },
    body: JSON.stringify({ inviteId, action, role }),
  });
  const body = (await res.json()) as { error?: string; link?: string; emailed?: boolean };
  if (!res.ok) throw new Error(body.error || "That did not work.");
  return body;
}

export default function CollaborationPage() {
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [tab, setTab] = useState<"all" | Role>("all");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const guest = isCollaboratorOnly();
  const me = userId();

  const load = useCallback(() => {
    Promise.all([pb().collection("collab_invites").getFullList<Invite>({ filter: "status != 'revoked'", sort: "-created", expand: "book,book.author" }), guest ? [] : listBooks()])
      .then(([i, b]) => {
        setInvites(i);
        setBooks(b);
      })
      .catch((e) => setError(errorMessage(e)));
  }, [guest]);
  useEffect(load, [load]);

  const mine = (invites ?? []).filter((i) => i.owner === me);
  const withMe = (invites ?? []).filter((i) => i.user === me && i.owner !== me);
  const shown = tab === "all" ? mine : mine.filter((i) => i.role === tab);

  async function act(i: Invite, action: string, role?: Role) {
    setError("");
    setNote("");
    try {
      if (action === "remove" && !confirm(`Remove ${i.name || i.email} from “${i.expand?.book?.title ?? "this book"}”? They lose access straight away.`)) return;
      if (action === "leave" && !confirm(`Leave “${i.expand?.book?.title ?? "this book"}”? You will need a new invitation to come back.`)) return;
      const r = await manage(i.id, action, role);
      if (action === "link" && r.link) {
        await navigator.clipboard.writeText(r.link).catch(() => undefined);
        setNote(`Invitation link for ${i.email} copied.`);
      } else if (action === "resend") setNote(r.emailed ? `Sent the invitation to ${i.email} again.` : "Email is not set up, so copy the link and send it yourself.");
      load();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <>
      <StudioNav />
      <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[clamp(1.75rem,3vw,2.5rem)] leading-tight tracking-[-0.02em]">Collaboration</h1>
            <p className="mt-1 text-soft">{guest ? "The books you work on with other authors." : "Write with a co-author, hand chapters to an editor, and gather comments from early readers."}</p>
          </div>
          {!guest && (
            <Button onClick={() => setInviting(true)} disabled={!books.length}>
              <UserPlus /> Invite someone
            </Button>
          )}
        </div>

        {error && <p className="mt-6 bg-danger-soft p-3 text-sm text-destructive">{error}</p>}
        {note && (
          <p role="status" className="mt-6 bg-primary-soft p-3 text-sm text-ink">
            {note}
          </p>
        )}

        {!guest && (
          <>
            <div role="tablist" aria-label="Kind of collaboration" className="mt-8 flex gap-1 overflow-x-auto border-b border-border">
              {(["all", ...ROLES] as const).map((t) => {
                const count = t === "all" ? mine.length : mine.filter((i) => i.role === t).length;
                return (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "-mb-px flex h-11 items-center gap-2 border-b-2 px-4 text-sm whitespace-nowrap",
                      tab === t ? "border-primary font-medium text-primary" : "border-transparent text-ink-2 hover:text-ink",
                    )}
                  >
                    {t === "all" ? "All" : ROLE_INFO[t].tab}
                    <span className={cn("tabular px-1.5 text-xs", tab === t ? "bg-primary-soft" : "bg-paper-2")}>{count}</span>
                  </button>
                );
              })}
            </div>

            {tab === "all" ? (
              <div className="mt-6 grid gap-px bg-border sm:grid-cols-3">
                {ROLES.map((r) => {
                  const Icon = ICONS[r];
                  return (
                    <button key={r} type="button" onClick={() => setTab(r)} className="group bg-card p-5 text-left hover:bg-paper">
                      <span className="grid size-10 place-items-center bg-primary-soft text-primary">
                        <Icon className="size-5" />
                      </span>
                      <span className="mt-3 block font-medium group-hover:text-primary">{ROLE_INFO[r].tab}</span>
                      <span className="mt-1 block text-sm text-soft">{ROLE_INFO[r].text}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 grid gap-4 border border-border bg-card p-5 sm:grid-cols-[auto_1fr] sm:gap-6">
                {(() => {
                  const Icon = ICONS[tab];
                  return (
                    <span className="grid size-12 place-items-center bg-primary-soft text-primary">
                      <Icon className="size-6" />
                    </span>
                  );
                })()}
                <div>
                  <h2 className="font-medium">How {ROLE_INFO[tab].tab.toLowerCase()} works</h2>
                  <ul className="mt-2 grid list-disc gap-1.5 pl-5 text-sm text-ink-2">
                    {HOW[tab].map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <section className="mt-8" aria-label="People on your books">
              {invites === null ? (
                <p className="text-soft" role="status">
                  Loading…
                </p>
              ) : !shown.length ? (
                <div className="border border-dashed border-border p-10 text-center">
                  <Users className="mx-auto size-8 text-soft" />
                  <p className="mt-3 font-medium">{tab === "all" ? "Nobody else is on your books yet" : `No ${ROLE_INFO[tab].label.toLowerCase()}s yet`}</p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-soft">Invite someone by email. They get a link, make a free account and see only the book you share.</p>
                  {books.length > 0 && (
                    <Button className="mt-5" variant="outline" onClick={() => setInviting(true)}>
                      <UserPlus /> Invite someone
                    </Button>
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-border border border-border bg-card">
                  {shown.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                      <span className="grid size-9 shrink-0 place-items-center bg-paper-2 text-sm font-medium text-ink-2 uppercase">{(i.name || i.email).slice(0, 1)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {i.name || i.email}
                          {i.status === "pending" && <span className="ml-2 bg-[#fbf0d9] px-1.5 py-0.5 text-xs font-normal text-[#7a5410]">Invited</span>}
                        </p>
                        <p className="truncate text-sm text-soft">
                          {i.name ? `${i.email} · ` : ""}
                          <Link href={`/desk/books/${i.book}`} className="hover:text-primary hover:underline">
                            {i.expand?.book?.title ?? "Book"}
                          </Link>
                        </p>
                      </div>
                      <select aria-label={`Role for ${i.email}`} value={i.role} onChange={(e) => act(i, "role", e.target.value as Role)} className="h-8 border border-input bg-card px-2 text-sm">
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_INFO[r].label}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-1">
                        {i.status === "pending" && (
                          <>
                            <Button size="icon-sm" variant="ghost" aria-label="Copy invitation link" title="Copy invitation link" onClick={() => act(i, "link")}>
                              <Copy />
                            </Button>
                            <Button size="icon-sm" variant="ghost" aria-label="Send the invitation again" title="Send the invitation again" onClick={() => act(i, "resend")}>
                              <Send />
                            </Button>
                          </>
                        )}
                        <Button size="icon-sm" variant="ghost" className="text-destructive" aria-label={`Remove ${i.email}`} title="Remove" onClick={() => act(i, "remove")}>
                          <Trash2 />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        {(guest || withMe.length > 0) && (
          <section className="mt-12" aria-labelledby="with-me-h">
            <h2 id="with-me-h" className="border-b border-border pb-2 text-xl tracking-tight">
              Shared with you
            </h2>
            {!withMe.length ? (
              <p className="mt-4 text-soft">{invites === null ? "Loading…" : "No books are shared with you right now."}</p>
            ) : (
              <ul className="mt-4 divide-y divide-border border border-border bg-card">
                {withMe.map((i) => {
                  const Icon = ICONS[i.role];
                  return (
                    <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                      <span className="grid size-9 shrink-0 place-items-center bg-primary-soft text-primary">
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link href={`/desk/books/${i.book}`} className="block truncate font-medium hover:text-primary">
                          {i.expand?.book?.title ?? "Book"}
                        </Link>
                        <p className="truncate text-sm text-soft">
                          {i.expand?.book?.expand?.author?.name ? `${i.expand.book.expand.author.name} · ` : ""}
                          {ROLE_INFO[i.role].label}
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/desk/books/${i.book}`}>Open</Link>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => act(i, "leave")}>
                        <LogOut /> Leave
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </main>
      {!guest && <InviteDialog open={inviting} books={books} initialRole={tab === "all" ? "cowriter" : tab} onClose={() => setInviting(false)} onDone={load} />}
    </>
  );
}

function InviteDialog({ open, books, initialRole, onClose, onDone }: { open: boolean; books: Book[]; initialRole: Role; onClose: () => void; onDone: () => void }) {
  const [bookId, setBookId] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>(initialRole);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<{ link: string; emailed: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    // a fresh form each time the dialog opens, on the tab's role
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRole(initialRole);
    setSent(null);
    setEmail("");
    setName("");
    setMessage("");
    setError("");
    setCopied(false);
  }, [open, initialRole]);

  const book = bookId || books[0]?.id || "";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {sent ? (
          <div className="grid gap-4">
            <DialogTitle>{sent.emailed ? "Invitation sent" : "Invitation ready"}</DialogTitle>
            <DialogDescription>
              {sent.emailed ? `We emailed ${email} a link to join.` : "Email is not set up on this server, so send this link yourself."} The link works once, for this book only.
            </DialogDescription>
            <div className="flex gap-2">
              <Input readOnly value={sent.link} aria-label="Invitation link" onFocus={(e) => e.target.select()} />
              <Button
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(sent.link).catch(() => undefined);
                  setCopied(true);
                }}
              >
                {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <div className="flex justify-end">
              <Button onClick={onClose}>Done</Button>
            </div>
          </div>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const res = await fetch("/api/collab/invite", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: pb().authStore.token },
                  body: JSON.stringify({ bookId: book, email, name, role, message }),
                });
                const body = (await res.json()) as { error?: string; link?: string; emailed?: boolean };
                if (!res.ok || !body.link) throw new Error(body.error || "Could not send the invitation.");
                setSent({ link: body.link, emailed: !!body.emailed });
                onDone();
              } catch (err) {
                setError(errorMessage(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            <DialogTitle>Invite someone</DialogTitle>
            <DialogDescription>They make a free account from the link and see only this book.</DialogDescription>
            <div className="grid gap-1.5">
              <Label htmlFor="inv-book">Book</Label>
              <select id="inv-book" value={book} onChange={(e) => setBookId(e.target.value)} className="h-9 border border-input bg-card px-3 text-sm">
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="inv-email">Email</Label>
                <Input id="inv-email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="inv-name">Name (optional)</Label>
                <Input id="inv-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>
            <fieldset className="grid gap-2">
              <legend className="mb-1.5 text-sm font-medium">They can</legend>
              {ROLES.map((r) => {
                const Icon = ICONS[r];
                return (
                  <label key={r} className={cn("flex cursor-pointer items-start gap-3 border p-3", role === r ? "border-primary bg-primary-soft/50" : "border-border hover:bg-paper")}>
                    <input type="radio" name="inv-role" className="sr-only" checked={role === r} onChange={() => setRole(r)} />
                    <Icon className={cn("mt-0.5 size-5 shrink-0", role === r ? "text-primary" : "text-soft")} />
                    <span>
                      <span className="block text-sm font-medium">{ROLE_INFO[r].label}</span>
                      <span className="block text-[13px] text-soft">{ROLE_INFO[r].text}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
            <div className="grid gap-1.5">
              <Label htmlFor="inv-msg">Personal note (optional)</Label>
              <Textarea id="inv-msg" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Would love your eyes on the middle chapters." />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !email.trim() || !book}>
                <Mail /> {busy ? "Sending…" : "Send invitation"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
