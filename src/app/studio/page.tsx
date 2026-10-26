"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileUp, Plus } from "lucide-react";
import { StudioNav } from "@/components/studio/studio-nav";
import { BookCover } from "@/components/book-cover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBook, createChapter, listAuthors, listBooks, loadLogs, userId } from "@/lib/studio";
import { BOOK_STATUSES, bookGoal, type Author, type Book, type Section, type WritingLog } from "@/lib/types";
import { fmt, lastDays, streak, wordsByDay } from "@/lib/progress";
import { today } from "@/lib/slug";
import { errorMessage, fileUrl, pb } from "@/lib/pb";

export default function StudioHome() {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [logs, setLogs] = useState<WritingLog[]>([]);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<null | "new" | "import">(null);

  const load = useCallback(() => {
    Promise.all([listBooks(), loadLogs(60)])
      .then(([b, l]) => {
        setBooks(b);
        setLogs(l);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(load, [load]);

  const byDay = wordsByDay(logs);
  const week = lastDays(7).reduce((s, d) => s + Math.max(byDay.get(d) ?? 0, 0), 0);
  const total = (books ?? []).reduce((s, b) => s + (b.word_count || 0), 0);

  return (
    <>
      <StudioNav />
      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[clamp(1.75rem,3vw,2.5rem)] leading-tight tracking-[-0.02em]">Your books</h1>
            <p className="mt-1 text-soft">Draft, format and publish from one place.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDialog("import")}>
              <FileUp /> Import Word file
            </Button>
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

        {error && <p className="mt-6 rounded bg-[#fdecea] p-3 text-sm text-destructive">Could not load your books: {error}</p>}

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
                <FileUp /> Import Word file
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
      </main>
      <NewBookDialog open={dialog === "new"} onClose={() => setDialog(null)} />
      <ImportDialog open={dialog === "import"} onClose={() => setDialog(null)} />
    </>
  );
}

function NewBookDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [starter, setStarter] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [authors, setAuthors] = useState<Author[]>([]);
  const [author, setAuthor] = useState("");
  useEffect(() => {
    if (open) listAuthors().then((a) => setAuthors(a)).catch(() => {});
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
              const book = await createBook({ title: title.trim(), subtitle: subtitle.trim(), author: author || undefined, withStarter: starter });
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
            <Label htmlFor="nb-title">Title</Label>
            <Input id="nb-title" required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nb-sub">Subtitle</Label>
            <Input id="nb-sub" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </div>
          {authors.length > 0 && (
            <div className="grid gap-1.5">
              <Label htmlFor="nb-author">Pen name</Label>
              <select id="nb-author" value={author || authors[0].id} onChange={(e) => setAuthor(e.target.value)} className="h-9 rounded-md border border-input bg-card px-3 text-sm">
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}
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
              const book = await createBook({ title: title.trim() || file.name.replace(/\.docx$/i, ""), withStarter: false });
              setStatus("Reading the manuscript…");
              const { docxToElements } = await import("@/lib/import/docx");
              const elements = await docxToElements(await file.arrayBuffer(), async (blob, type) => {
                const rec = await pb().collection("assets").create({ owner: userId(), book: book.id, file: new File([blob], `image.${type.split("/")[1] || "png"}`, { type }) });
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
          <DialogTitle>Import a Word file</DialogTitle>
          <DialogDescription>
            Each Heading 1 becomes its own chapter. Headings below it, bold and italic text, lists, quotes, images and footnotes come across. Sections named Introduction, Acknowledgments and so on are placed in the front or back matter.
          </DialogDescription>
          <div className="grid gap-1.5">
            <Label htmlFor="imp-file">Manuscript (.docx)</Label>
            <Input
              id="imp-file"
              type="file"
              required
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !title) setTitle(f.name.replace(/\.docx$/i, ""));
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
