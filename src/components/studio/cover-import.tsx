"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, OctagonX, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudioNav } from "@/components/studio/studio-nav";
import { checkCover, readHandoff, STUDIO_ORIGINS, STUDIO_URL, MAX_EBOOK_COVER, type ReceivedCover } from "@/lib/cover-import";
import { estimatePages, inches } from "@/lib/kdp";
import { bookFormat, printEdition, type Book } from "@/lib/types";
import { errorMessage, pb } from "@/lib/pb";
import { listBooks } from "@/lib/studio";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";

type Phase = { kind: "waiting" } | { kind: "orphan" } | { kind: "error"; text: string } | { kind: "received"; cover: ReceivedCover; sheet: { width: number; height: number } } | { kind: "saved"; book: Book; ebook: boolean; edition: string };

/**
 * Where "Send to Jollof Pages" in Jollof Studio lands. Studio opened this tab; this page tells it
 * it is ready (only once the author is signed in, since the studio layout gates it), receives the
 * cover, checks it against the chosen book and saves it with the author's own sign-in.
 */
export function CoverImport({ bookParam }: { bookParam?: string }) {
  // only mounted in the browser, after sign-in (the studio layout gates it)
  const [phase, setPhase] = useState<Phase>(() => (window.opener ? { kind: "waiting" } : { kind: "orphan" }));
  const [books, setBooks] = useState<Book[] | null>(null);
  const [bookId, setBookId] = useState(bookParam ?? "");
  const [estimate, setEstimate] = useState<{ id: string; binding: string; pages: number } | null>(null);
  const [useAsEbook, setUseAsEbook] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // ask Studio for the cover until it answers; Studio may still be drawing the files
  useEffect(() => {
    const opener = window.opener as Window | null;
    if (!opener) return;
    let got = false;
    const onMessage = async (e: MessageEvent) => {
      if (!STUDIO_ORIGINS.includes(e.origin) || e.source !== opener) return;
      const data = e.data as { type?: unknown } | null;
      if (!data || data.type !== "jp-cover") return;
      got = true;
      const cover = readHandoff(data);
      if ("error" in cover) return setPhase({ kind: "error", text: cover.error });
      try {
        const { PDFDocument } = await import("pdf-lib");
        const doc = await PDFDocument.load(await cover.pdf.arrayBuffer(), { updateMetadata: false });
        if (doc.getPageCount() !== 1) throw new Error(`the PDF has ${doc.getPageCount()} pages; a KDP cover is one page`);
        const size = doc.getPage(0).getSize();
        setPhase({ kind: "received", cover, sheet: { width: size.width / 72, height: size.height / 72 } });
        if (cover.book) setBookId((b) => b || cover.book!);
      } catch (err) {
        setPhase({ kind: "error", text: `The cover PDF couldn't be read (${errorMessage(err)}). Send it again from Jollof Studio.` });
      }
    };
    window.addEventListener("message", onMessage);
    const ask = () => !got && STUDIO_ORIGINS.forEach((o) => opener.postMessage({ type: "jp-cover-ready" }, o));
    ask();
    const timer = setInterval(ask, 1000);
    const slow = setTimeout(() => !got && setPhase((p) => (p.kind === "waiting" ? { kind: "error", text: "Jollof Studio hasn't sent the cover. Keep the Studio tab open and press Send to Jollof Pages again." } : p)), 120_000);
    return () => {
      window.removeEventListener("message", onMessage);
      clearInterval(timer);
      clearTimeout(slow);
    };
  }, []);

  useEffect(() => {
    listBooks()
      .then(setBooks)
      .catch(() => setBooks([]));
  }, []);

  const book = books?.find((b) => b.id === bookId) ?? null;
  const received = phase.kind === "received" ? phase : null;
  const binding = received?.cover.binding ?? "paperback";

  // the book's page count for this edition: the built print PDF's, or an estimate from its words
  const built = book ? (binding === "hardcover" ? book.hardcover_page_count : book.page_count) : 0;
  useEffect(() => {
    if (!book || built) return;
    const f = bookFormat(book);
    let live = true;
    pb()
      .collection("chapters")
      .getList(1, 1, { filter: pb().filter("book = {:b}", { b: book.id }), fields: "id" })
      .then((r) => r.totalItems)
      .catch(() => 0)
      .then((sections) => live && setEstimate({ id: book.id, binding, pages: estimatePages(book.word_count || 0, printEdition(f, binding).trim, sections, f.largePrint ? 16 : f.fontSize) }));
    return () => {
      live = false;
    };
  }, [book, binding, built]);
  const pages = !book
    ? null
    : built
      ? { pages: built, estimated: false }
      : estimate && estimate.id === book.id && estimate.binding === binding
        ? { pages: estimate.pages, estimated: true }
        : null;
  const ed = book && received ? printEdition(bookFormat(book), received.cover.binding) : null;
  const check = received && ed && pages ? checkCover(received.cover, received.sheet, { trim: ed.trim, paper: ed.paper, pages: pages.pages, pagesEstimated: pages.estimated }) : null;

  const frontUrl = useMemo(() => (received ? URL.createObjectURL(received.cover.front) : ""), [received]);
  useEffect(() => () => (frontUrl ? URL.revokeObjectURL(frontUrl) : undefined), [frontUrl]);

  const ebook = useAsEbook ?? !book?.cover;
  const field = binding === "hardcover" ? "cover_hardcover" : "cover_full";
  const edition = binding === "hardcover" ? "hardcover" : "paperback";

  async function save() {
    if (!received || !book) return;
    setSaving(true);
    setSaveError("");
    try {
      const name = slugify(book.title) || "book";
      const fd = new FormData();
      fd.append(field, new File([received.cover.pdf], `${name}-${edition}-cover.pdf`, { type: "application/pdf" }));
      if (ebook && received.cover.front.size <= MAX_EBOOK_COVER) fd.append("cover", new File([received.cover.front], `${name}-cover.jpg`, { type: "image/jpeg" }));
      const updated = await pb().collection("books").update<Book>(book.id, fd);
      setPhase({ kind: "saved", book: updated, ebook, edition });
      const text = `Saved to "${book.title}" in Jollof Pages as the ${edition} cover${ebook ? ", and the front as the ebook cover" : ""}.`;
      STUDIO_ORIGINS.forEach((o) => (window.opener as Window | null)?.postMessage({ type: "jp-cover-saved", text }, o));
    } catch (e) {
      setSaveError(`Could not save: ${errorMessage(e)}. Nothing was changed; try again.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <StudioNav />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
        <h1 className="text-[clamp(1.6rem,3vw,2.25rem)] leading-tight tracking-[-0.02em]">Cover from Jollof Studio</h1>
        <p className="mt-1 max-w-2xl text-soft">Check your cover against your book, then save it. Nothing changes on your book until you press Save.</p>

        {phase.kind === "waiting" && (
          <p role="status" className="mt-8 flex items-center gap-2 rounded-lg bg-card p-4">
            <Loader2 className="size-5 animate-spin text-primary" /> Waiting for your cover from Jollof Studio. Keep the Studio tab open.
          </p>
        )}

        {phase.kind === "orphan" && (
          <div className="mt-8 rounded-lg bg-card p-5">
            <p className="font-medium">This page receives covers sent from Jollof Studio.</p>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-[15px] text-ink-2">
              <li>Open your full cover in Jollof Studio.</li>
              <li>
                In the top bar, open <b>Book cover</b>.
              </li>
              <li>
                Press <b>Send to Jollof Pages</b>. This page opens again with your cover.
              </li>
            </ol>
            <p className="mt-3 text-[15px] text-soft">
              No cover yet? Open your book&apos;s <b>Cover</b> tab and choose <b>Design this full cover in Jollof Studio</b>; it opens already sized for your book.
            </p>
            <Button asChild className="mt-4">
              <a href={`${STUDIO_URL}/designs`}>Open Jollof Studio</a>
            </Button>
          </div>
        )}

        {phase.kind === "error" && (
          <p role="alert" className="mt-8 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
            <OctagonX className="mt-0.5 size-5 shrink-0" /> {phase.text}
          </p>
        )}

        {received && (
          <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
            <figure className="m-0 mx-auto w-full max-w-[9rem] md:max-w-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={frontUrl} alt="The front of your cover" className="w-full rounded shadow-lg" />
              <figcaption className="mt-2 text-center text-[13px] text-soft md:text-left">
                Full cover PDF: {inches(received.sheet.width)} x {inches(received.sheet.height)}, made for {received.cover.pages} pages on {received.cover.paper} paper ({edition}).
              </figcaption>
            </figure>
            <div className="grid content-start gap-5">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium">Which book is this cover for?</span>
                <select
                  className="h-11 rounded-md border border-border bg-card px-3"
                  value={bookId}
                  onChange={(e) => {
                    setBookId(e.target.value);
                    setUseAsEbook(null);
                  }}
                  disabled={!books}
                >
                  <option value="">{books ? (books.length ? "Choose a book" : "You have no books yet") : "Loading your books…"}</option>
                  {books?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title || "Untitled book"}
                    </option>
                  ))}
                </select>
              </label>
              {bookId && books && !book && <p className="text-[14px] text-red-700 dark:text-red-300">That book isn&apos;t one of yours on this account. Pick one of your books, or sign in with the account that owns it.</p>}

              {book && !check && (
                <p className="flex items-center gap-2 text-soft">
                  <Loader2 className="size-4 animate-spin" /> Checking the size against {book.title}…
                </p>
              )}

              {check && (
                <div
                  role="status"
                  aria-label="Cover check"
                  className={cn(
                    "rounded-lg border p-4",
                    check.level === "ok" && "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-50",
                    check.level === "warn" && "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50",
                    check.level === "stop" && "border-red-300 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950 dark:text-red-50",
                  )}
                >
                  <p className="flex items-center gap-2 font-semibold">
                    {check.level === "ok" ? <CheckCircle2 className="size-5" /> : check.level === "warn" ? <AlertTriangle className="size-5" /> : <OctagonX className="size-5" />}
                    {check.level === "ok" ? `Fits ${book!.title}` : check.level === "warn" ? "Fix this before you upload to KDP" : "This cover won't fit this book"}
                  </p>
                  <p className="mt-1 text-[14px]">
                    Your {edition} needs {inches(check.expected.width)} x {inches(check.expected.height)} with a {inches(check.expected.spine, 3)} spine ({pages!.pages} pages{pages!.estimated ? ", estimated" : ""}).
                  </p>
                  {check.notes.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px]">
                      {check.notes.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {book && check && check.level !== "stop" && (
                <>
                  <label className="flex cursor-pointer items-start gap-3 rounded-md bg-card p-3">
                    <input type="checkbox" className="mt-1 size-4 accent-[var(--primary)]" checked={ebook} onChange={(e) => setUseAsEbook(e.target.checked)} />
                    <span>
                      <span className="block text-sm font-medium">{book.cover ? "Also replace the ebook cover with this front" : "Also use the front as the ebook cover"}</span>
                      <span className="block text-[13px] text-soft">The ebook cover shows on Kindle, on your website and in stores.</span>
                    </span>
                  </label>
                  <p className="text-[14px] text-soft">
                    Saves the full cover PDF as this book&apos;s {edition} cover{book[field] ? ", replacing the one there now" : ""}.
                  </p>
                  <div>
                    <Button onClick={save} disabled={saving} size="lg" variant={check.level === "warn" ? "outline" : "default"}>
                      {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                      {check.level === "warn" ? "Save anyway" : `Save to ${book.title}`}
                    </Button>
                  </div>
                  {saveError && (
                    <p role="alert" className="text-[14px] text-red-700 dark:text-red-300">
                      {saveError}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {phase.kind === "saved" && (
          <div role="status" className="mt-8 rounded-lg border border-emerald-300 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-50">
            <p className="flex items-center gap-2 text-lg font-semibold">
              <CheckCircle2 className="size-6" /> Saved to {phase.book.title}
            </p>
            <p className="mt-1">
              Your {phase.edition} cover PDF is on the book{phase.ebook ? ", and the front is now the ebook cover" : ""}. Upload the same PDF to KDP when you publish; it is ready to download from the Cover tab.
            </p>
            <Button asChild className="mt-4">
              <Link href={`/studio/books/${phase.book.id}?tab=cover`}>Open the Cover tab</Link>
            </Button>
          </div>
        )}
      </main>
    </>
  );
}
