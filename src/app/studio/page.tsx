"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowRight, ArrowUp, BookPlus, FileUp, GraduationCap, Library, LifeBuoy, Plus } from "lucide-react";
import { StudioNav } from "@/components/studio/studio-nav";
import { IsbnDialog } from "@/components/studio/isbn-dialog";
import { BookCover } from "@/components/book-cover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { AiSuggest } from "@/components/studio/ai-suggest";
import { Label } from "@/components/ui/label";
import { createBook, createBoxSet, createChapter, listAuthors, listBooks, listSharedBooks, loadLogs, userId } from "@/lib/studio";
import { isCollaboratorOnly } from "@/components/studio/auth-gate";
import { ROLE_INFO, roleOf } from "@/lib/collab";
import { BOOK_STATUSES, bookGoal, type Author, type Book, type Section, type WritingLog } from "@/lib/types";
import { fmt, lastDays, streak, wordsByDay } from "@/lib/progress";
import { today } from "@/lib/slug";
import { errorMessage, fileUrl, pb } from "@/lib/pb";
import { IMPORT_ACCEPT, IMPORT_EXT } from "@/lib/import/formats";
import { TUTORIALS, loadDone } from "@/lib/tutorials";
import { cn } from "@/lib/utils";

export default function StudioHome() {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [logs, setLogs] = useState<WritingLog[]>([]);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<null | "new" | "import" | "isbn" | "boxset">(null);
  const [shared, setShared] = useState<Book[]>([]);
  const guest = isCollaboratorOnly();

  const load = useCallback(() => {
    Promise.all([guest ? [] : listBooks(), guest ? [] : loadLogs(60), listSharedBooks().catch(() => [])])
      .then(([b, l, s]) => {
        setBooks(b);
        setLogs(l);
        setShared(s);
      })
      .catch((e) => setError(errorMessage(e)));
  }, [guest]);
  useEffect(load, [load]);

  const byDay = wordsByDay(logs);
  const week = lastDays(7).reduce((s, d) => s + Math.max(byDay.get(d) ?? 0, 0), 0);
  const total = (books ?? []).reduce((s, b) => s + (b.word_count || 0), 0);

  if (guest)
    return (
      <>
        <StudioNav />
        <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10">
          <h1 className="text-[clamp(1.75rem,3vw,2.5rem)] leading-tight tracking-[-0.02em]">Shared with you</h1>
          <p className="mt-1 text-soft">Books other authors invited you to work on.</p>
          {error && <p className="mt-6 rounded bg-danger-soft p-3 text-sm text-destructive">Could not load the books: {error}</p>}
          {books === null && !error ? (
            <p className="mt-10 text-soft" role="status">
              Loading books…
            </p>
          ) : shared.length ? (
            <SharedGrid books={shared} />
          ) : (
            <div className="mt-10 border border-border bg-card p-10 text-center">
              <h2 className="text-xl">Nothing shared with you yet</h2>
              <p className="mx-auto mt-2 max-w-md text-soft">When an author invites you to a book, open the link in their email and the book appears here.</p>
            </div>
          )}
        </main>
      </>
    );

  return (
    <>
      <StudioNav />
      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[clamp(1.75rem,3vw,2.5rem)] leading-tight tracking-[-0.02em]">Your books</h1>
            <p className="mt-1 text-soft">Draft, format and publish from one place.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setDialog("isbn")}>
              <BookPlus /> Add a published book
            </Button>
            <Button variant="outline" onClick={() => setDialog("import")}>
              <FileUp /> Import Word or Markdown
            </Button>
            {(books ?? []).filter((b) => !b.box_set).length >= 2 && (
              <Button variant="outline" onClick={() => setDialog("boxset")}>
                <Library /> Box set
              </Button>
            )}
            <Button onClick={() => setDialog("new")}>
              <Plus /> New book
            </Button>
          </div>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-md bg-border sm:grid-cols-4">
          {[
            ["Words today", fmt(Math.max(byDay.get(today()) ?? 0, 0))],
            ["Last 7 days", fmt(week)],
            ["Writing streak", `${streak(byDay)} ${streak(byDay) === 1 ? "day" : "days"}`],
            ["Words across books", fmt(total)],
          ].map(([k, v]) => (
            <div key={k} className="bg-card p-4 sm:p-5">
              <dt className="text-sm text-soft">{k}</dt>
              <dd className="tabular mt-1 text-2xl tracking-tight">{v}</dd>
            </div>
          ))}
        </dl>

        <LearnCard />

        {error && <p className="mt-6 rounded bg-danger-soft p-3 text-sm text-destructive">Could not load your books: {error}</p>}

        {books === null && !error ? (
          <p className="mt-10 text-soft" role="status">
            Loading books…
          </p>
        ) : books && books.length === 0 ? (
          <div className="mt-10 rounded-md bg-card p-10 text-center">
            <h2 className="text-xl">Start your first book</h2>
            <p className="mx-auto mt-2 max-w-md text-soft">Create a book with the usual front and back matter already in place, or bring in a manuscript you wrote in Word.</p>
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="outline" onClick={() => setDialog("import")}>
                <FileUp /> Import Word or Markdown
              </Button>
              <Button onClick={() => setDialog("new")}>
                <Plus /> New book
              </Button>
            </div>
          </div>
        ) : (
          <ul className="mt-10 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {(books ?? []).map((b) => {
              const goal = bookGoal(b);
              const pct = goal.targetWords ? Math.min(100, Math.round(((b.word_count || 0) / goal.targetWords) * 100)) : 0;
              return (
                <li key={b.id}>
                  <Link href={`/studio/books/${b.id}`} className="group block rounded focus-visible:outline-offset-4">
                    <div className="overflow-hidden rounded-sm bg-paper-2 transition-transform duration-200 group-hover:-translate-y-1">
                      <BookCover book={b} sizes="(min-width: 1024px) 240px, 45vw" />
                    </div>
                    <div className="mt-3 flex items-start justify-between gap-2">
                      <h2 className="leading-snug font-medium text-ink group-hover:text-primary">{b.title}</h2>
                      {b.box_set && <Badge>Box set</Badge>}
                      {b.published && <Badge variant="success">Live</Badge>}
                    </div>
                    <p className="mt-0.5 text-sm text-soft">{BOOK_STATUSES.find((s) => s.id === b.status)?.label ?? "Drafting"}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-2" aria-hidden>
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="tabular mt-1.5 text-sm text-soft">
                      {fmt(b.word_count || 0)} of {fmt(goal.targetWords)} words
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {shared.length > 0 && (
          <section className="mt-14" aria-labelledby="shared-h">
            <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
              <h2 id="shared-h" className="text-xl tracking-tight">
                Shared with you
              </h2>
              <Link href="/studio/collaboration" className="text-sm text-primary hover:underline">
                Collaboration
              </Link>
            </div>
            <SharedGrid books={shared} />
          </section>
        )}
      </main>
      <NewBookDialog open={dialog === "new"} onClose={() => setDialog(null)} />
      <ImportDialog open={dialog === "import"} onClose={() => setDialog(null)} />
      <BoxSetDialog open={dialog === "boxset"} books={(books ?? []).filter((b) => !b.box_set)} onClose={() => setDialog(null)} />
      <IsbnDialog open={dialog === "isbn"} onClose={() => setDialog(null)} />
    </>
  );
}

/** Other authors' books this person works on, with their part in each. */
function SharedGrid({ books }: { books: Book[] }) {
  const me = userId();
  return (
    <ul className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
      {books.map((b) => {
        const role = roleOf(b, me);
        return (
          <li key={b.id}>
            <Link href={`/studio/books/${b.id}`} className="group block focus-visible:outline-offset-4">
              <div className="overflow-hidden bg-paper-2 transition-transform duration-200 group-hover:-translate-y-1">
                <BookCover book={b} sizes="(min-width: 1024px) 240px, 45vw" />
              </div>
              <h3 className="mt-3 leading-snug font-medium text-ink group-hover:text-primary">{b.title}</h3>
              <p className="mt-0.5 text-sm text-soft">
                {b.expand?.author?.name ? `${b.expand.author.name} · ` : ""}
                {role && role !== "owner" ? ROLE_INFO[role].label : "Shared"}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Tutorials: where to start, and how far along the author is. Kept quiet once every guide is done. */
function LearnCard() {
  const [done] = useState(loadDone);
  const next = TUTORIALS.find((t) => !done.has(t.id));
  const pct = Math.round((done.size / TUTORIALS.length) * 100);
  if (!next)
    return (
      <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-soft">
        <span className="inline-flex items-center gap-1.5">
          <GraduationCap className="size-4 text-primary" /> You have finished every guide.
        </span>
        <Link href="/studio/learn" className="text-primary hover:underline">
          Revisit the guides
        </Link>
        <Link href="/studio/help" className="text-primary hover:underline">
          Help and support
        </Link>
      </p>
    );
  return (
    <section aria-labelledby="learn-h" className="relative mt-4 grid overflow-hidden border border-border bg-card sm:grid-cols-[1fr_auto]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-[0.07] [background-image:radial-gradient(var(--primary)_1.2px,transparent_1.6px)] [background-size:16px_16px] max-sm:hidden"
      />
      <div className="relative flex gap-4 p-5 sm:p-6">
        <span className="grid size-12 shrink-0 place-items-center bg-primary text-primary-foreground">
          <GraduationCap className="size-6" />
        </span>
        <div className="min-w-0">
          <h2 id="learn-h" className="text-lg font-medium">
            Learn how to use Jollof Pages
          </h2>
          <p className="mt-0.5 text-soft">
            {done.size
              ? `${done.size} of ${TUTORIALS.length} guides done. Next up: ${next.title}.`
              : `Ten short guides take you from first chapter to published book. Start with \u201c${next.title}\u201d.`}
          </p>
          <div className="mt-3 h-1.5 max-w-sm overflow-hidden bg-paper-2" aria-hidden>
            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
      <div className="relative flex flex-wrap items-center gap-2 px-5 pb-5 sm:p-6">
        <Link href="/studio/help" className="inline-flex h-9 items-center gap-1.5 px-3 text-sm text-ink-2 hover:bg-muted [&_svg]:size-4">
          <LifeBuoy /> Help
        </Link>
        <Button asChild>
          <Link href="/studio/learn">
            {done.size ? "Continue" : "Start learning"} <ArrowRight />
          </Link>
        </Button>
      </div>
    </section>
  );
}

const NEW_PEN = "__new";

function NewBookDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [idea, setIdea] = useState("");
  const [starter, setStarter] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [authors, setAuthors] = useState<Author[]>([]);
  const [author, setAuthor] = useState("");
  const [penName, setPenName] = useState("");
  const newName = !authors.length || author === NEW_PEN;
  const newBookContext = () => ({ "About the book": idea, "Working title": title, Subtitle: subtitle });
  useEffect(() => {
    if (open)
      listAuthors()
        .then((a) => setAuthors(a))
        .catch(() => {});
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const book = await createBook({
                title: title.trim(),
                subtitle: subtitle.trim(),
                pitch: idea.trim().slice(0, 300),
                author: newName ? undefined : author || undefined,
                newAuthorName: newName ? penName : undefined,
                withStarter: starter,
              });
              router.push(`/studio/books/${book.id}`);
            } catch (err) {
              setError(errorMessage(err));
              setBusy(false);
            }
          }}
        >
          <DialogTitle>New book</DialogTitle>
          <DialogDescription>You can change all of this later.</DialogDescription>
          <div className="grid gap-1.5">
            <Label htmlFor="nb-idea">What is it about?</Label>
            <Textarea
              id="nb-idea"
              rows={3}
              autoFocus
              value={idea}
              maxLength={1000}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="A line or two about the book, its readers and genre. Optional, but it helps the AI suggest a title."
            />
          </div>
          <div className="grid gap-1.5">
            <div className="-my-1 flex items-center justify-between gap-2">
              <Label htmlFor="nb-title">Title</Label>
              <AiSuggest kind="title" context={newBookContext} onPick={setTitle} />
            </div>
            <Input id="nb-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <div className="-my-1 flex items-center justify-between gap-2">
              <Label htmlFor="nb-sub">Subtitle</Label>
              <AiSuggest kind="subtitle" context={newBookContext} onPick={setSubtitle} />
            </div>
            <Input id="nb-sub" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <div className="-my-1 flex items-center justify-between gap-2">
              <Label htmlFor={newName ? "nb-pen" : "nb-author"}>Pen name</Label>
              <AiSuggest
                kind="penname"
                context={newBookContext}
                onPick={(v) => {
                  setAuthor(NEW_PEN);
                  setPenName(v);
                }}
              />
            </div>
            {authors.length > 0 && (
              <select id="nb-author" value={author || authors[0].id} onChange={(e) => setAuthor(e.target.value)} className="h-9 rounded-md border border-input bg-card px-3 text-sm">
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
                <option value={NEW_PEN}>New pen name…</option>
              </select>
            )}
            {newName && <Input id="nb-pen" value={penName} maxLength={120} onChange={(e) => setPenName(e.target.value)} placeholder="The name on the cover" />}
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={starter} onChange={(e) => setStarter(e.target.checked)} />
            <span>Add title page, copyright, dedication, contents, introduction, a first chapter, acknowledgments and about the author.</span>
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !title.trim()}>
              {busy ? "Creating…" : "Create book"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Pick two or more books, put them in order, and get one book holding them all. */
function BoxSetDialog({ open, books, onClose }: { open: boolean; books: Book[]; onClose: () => void }) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [busy, setBusy] = useState<[number, number] | null>(null);
  const [error, setError] = useState("");
  const byId = new Map(books.map((b) => [b.id, b]));
  const chosen = picked.map((id) => byId.get(id)).filter((b): b is Book => !!b);

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }
  function move(i: number, d: -1 | 1) {
    setPicked((p) => {
      const next = [...p];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <form
          className="grid gap-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setBusy([0, 1]);
            try {
              const book = await createBoxSet({
                title: title.trim() || `${chosen[0]?.title} and more`,
                subtitle: subtitle.trim() || `${chosen.length} books in one`,
                author: chosen[0]?.author,
                bookIds: picked,
                onProgress: (d, t) => setBusy([d, t]),
              });
              router.push(`/studio/books/${book.id}`);
            } catch (err) {
              setError(errorMessage(err));
              setBusy(null);
            }
          }}
        >
          <div>
            <DialogTitle>Make a box set</DialogTitle>
            <DialogDescription className="mt-1">
              One book holding several of yours, each opening with its own &ldquo;Book One&rdquo;, &ldquo;Book Two&rdquo; page and its chapters numbered from one again. The box set gets its own title
              page, contents and cover; the original books are not changed.
            </DialogDescription>
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">1. Choose the books</legend>
            <ul className="grid max-h-56 gap-1 overflow-y-auto border border-border p-1">
              {books.map((b) => (
                <li key={b.id}>
                  <label className={cn("flex cursor-pointer items-center gap-3 px-2 py-1.5 hover:bg-paper", picked.includes(b.id) && "bg-primary-soft")}>
                    <input type="checkbox" checked={picked.includes(b.id)} onChange={() => toggle(b.id)} className="size-4 accent-[var(--primary)]" />
                    <span className="min-w-0 flex-1 truncate">{b.title}</span>
                    <span className="tabular text-sm text-soft">{fmt(b.word_count || 0)} words</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          {chosen.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">2. Put them in order</p>
              <ol className="grid gap-1">
                {chosen.map((b, i) => (
                  <li key={b.id} className="flex items-center gap-3 border border-border bg-card px-3 py-2">
                    <span className="text-[13px] font-medium tracking-[0.08em] text-primary uppercase">Book {i + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{b.title}</span>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${b.title} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${b.title} down`} disabled={i === chosen.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDown />
                    </Button>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className="grid gap-3">
            <p className="text-sm font-medium">3. Name the box set</p>
            <div className="grid gap-1.5">
              <Label htmlFor="bs-title">Title</Label>
              <Input id="bs-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={chosen[0] ? `${chosen[0].title} and more` : "e.g. The Complete Kitchen Series"} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bs-sub">Subtitle</Label>
              <Input id="bs-sub" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder={chosen.length ? `${chosen.length} books in one` : "e.g. Books 1 to 3"} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {busy && (
            <div role="status" aria-live="polite">
              <p className="text-sm text-soft">
                Copying chapters… {busy[0]} of {busy[1]}
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden bg-paper-2">
                <div className="h-full bg-primary transition-[width]" style={{ width: `${Math.round((busy[0] / busy[1]) * 100)}%` }} />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={!!busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={!!busy || chosen.length < 2}>
              {busy ? "Building…" : chosen.length < 2 ? "Choose at least two books" : `Make a box set of ${chosen.length}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!file) return;
            setBusy(true);
            try {
              setStatus("Creating the book…");
              const book = await createBook({ title: title.trim() || file.name.replace(IMPORT_EXT, ""), withStarter: false });
              setStatus("Reading the manuscript…");
              const elements = await (
                await import("@/lib/import/formats")
              ).fileToElements(file, async (blob, type) => {
                const rec = await pb()
                  .collection("assets")
                  .create({ owner: userId(), book: book.id, file: new File([blob], `image.${type.split("/")[1]?.replace("+xml", "") || "png"}`, { type }) });
                return fileUrl(rec, rec.file);
              });
              const counters: Record<Section, number> = { front: 0, body: 0, back: 0 };
              await createChapter(book, { kind: "title_page", title: "Title page", order: counters.front++ });
              await createChapter(book, { kind: "copyright", title: "Copyright", order: counters.front++ });
              if (!elements.some((el) => el.kind === "contents")) await createChapter(book, { kind: "contents", title: "Contents", order: counters.front++ });
              for (const [i, el] of elements.entries()) {
                setStatus(`Saving section ${i + 1} of ${elements.length}…`);
                await createChapter(book, { kind: el.kind, title: el.title, order: counters[el.section]++, content: el.content });
              }
              router.push(`/studio/books/${book.id}`);
            } catch (err) {
              setStatus(`Import failed: ${errorMessage(err)}`);
              setBusy(false);
            }
          }}
        >
          <DialogTitle>Import a manuscript</DialogTitle>
          <DialogDescription>
            A Word, Markdown (such as one written with ChatGPT), EPUB, RTF, OpenDocument, web page or plain text file, including public-domain books from Project Gutenberg and Standard Ebooks. Each
            top heading (Heading 1, or # in Markdown) becomes its own chapter. Headings below it, bold and italic text, lists, quotes, images and footnotes come across. Sections named Introduction,
            Acknowledgments and so on are placed in the front or back matter.
          </DialogDescription>
          <div className="grid gap-1.5">
            <Label htmlFor="imp-file">Manuscript (.docx, .md, .epub, .rtf, .odt, .html or .txt)</Label>
            <Input
              id="imp-file"
              type="file"
              required
              accept={IMPORT_ACCEPT}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !title) setTitle(f.name.replace(IMPORT_EXT, ""));
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="imp-title">Book title</Label>
            <Input id="imp-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          {status && (
            <p className="text-sm text-soft" role="status">
              {status}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !file}>
              {busy ? "Importing…" : "Import"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
