"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBook, listAuthors, uniqueSlug, userId } from "@/lib/studio";
import { errorMessage, pb } from "@/lib/pb";
import { slugify } from "@/lib/slug";
import { amazonLink, tidyStoreLink, type IsbnBook } from "@/lib/isbn";
import { useMySite } from "@/components/studio/use-my-site";
import { LinkGuide } from "@/components/site/link-guide";
import { PENDING_BOOK, type PendingBook } from "@/components/site/site-tryout";
import type { Author } from "@/lib/types";

/**
 * Adds a book the author already published somewhere else: look it up by ISBN, ASIN or Amazon
 * link, check what Open Library knows, and it goes on their website with its cover, blurb and a
 * store link. Amazon doesn't share Kindle details, so a B0… ASIN asks for the title and author.
 */
export function IsbnDialog({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: PendingBook | null }) {
  const router = useRouter();
  const [isbn, setIsbn] = useState(initial?.code ?? "");
  const [found, setFound] = useState<(IsbnBook & { matched?: boolean }) | null>(null);
  // a Kindle ASIN: Amazon doesn't share its details, so the writer types the title and author
  const [asin, setAsin] = useState("");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [store, setStore] = useState("");
  // the Amazon store of a pasted link (amazon.co.uk…), for the buy button
  const [host, setHost] = useState("");
  // the title came from the Amazon link, which shortens long titles
  const [guessed, setGuessed] = useState(false);
  const { site } = useMySite();
  const hasSite = Boolean(site && (site.subdomain || site.custom_domain || site.home));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setIsbn("");
    setFound(null);
    setAsin("");
    setTitle("");
    setAuthor("");
    setStore("");
    setHost("");
    setGuessed(false);
    setError("");
    setBusy(false);
  }

  async function lookUpCode(code: string, then?: { title?: string; author?: string }) {
    setBusy(true);
    setError("");
    setFound(null);
    setAsin("");
    try {
      const res = await fetch(`/api/books/isbn?isbn=${encodeURIComponent(code)}`, { headers: { Authorization: pb().authStore.token } });
      const body = (await res.json()) as IsbnBook & { error?: string; needsTitle?: boolean; guess?: string; host?: string };
      if (!res.ok) throw new Error(body.error || "Lookup failed.");
      setHost(body.host || "");
      if (body.needsTitle && body.asin) {
        setAsin(body.asin);
        // the homepage already asked for the title and author
        if (then?.title) return await lookUpTitle(body.asin, then.title, then.author ?? "");
        // the author can't come from Amazon: start from their own pen name, or their name
        const me = author.trim() || (await listAuthors().catch(() => []))[0]?.name || String(pb().authStore.record?.name ?? "");
        setAuthor(me);
        // a pasted Amazon link carries most of the title: look it up straight away
        if (body.guess) {
          setTitle(body.guess);
          setGuessed(true);
          return await lookUpTitle(body.asin, body.guess, me);
        }
      } else setFound(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function lookUpTitle(forAsin: string, t: string, a: string) {
    setBusy(true);
    setError("");
    setFound(null);
    try {
      const q = new URLSearchParams({ title: t.trim(), author: a.trim(), asin: forAsin });
      const res = await fetch(`/api/books/isbn?${q}`, { headers: { Authorization: pb().authStore.token } });
      const body = (await res.json()) as IsbnBook & { error?: string; matched?: boolean };
      if (!res.ok) throw new Error(body.error || "Lookup failed.");
      setFound(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function lookUp(e: React.FormEvent) {
    e.preventDefault();
    void lookUpCode(isbn);
  }

  function findByTitle(e: React.FormEvent) {
    e.preventDefault();
    void lookUpTitle(asin, title, author);
  }

  // a book typed on the homepage before sign-up: look it up as soon as the dialog opens
  const started = useRef(false);
  useEffect(() => {
    if (!open || !initial || started.current) return;
    started.current = true;
    const t = setTimeout(() => void lookUpCode(initial.code, initial), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  async function add() {
    if (!found) return;
    setBusy(true);
    setError("");
    try {
      // use the pen name with the same name, or add it
      const authorName = found.authors[0] || "";
      let author: Author | undefined = authorName ? (await listAuthors()).find((a) => a.name.toLowerCase() === authorName.toLowerCase()) : undefined;
      if (!author && authorName) author = await pb().collection("authors").create<Author>({ owner: userId(), name: authorName, slug: await uniqueSlug("authors", slugify(authorName)) });

      const book = await createBook({ title: found.title, subtitle: found.subtitle, author: author?.id, withStarter: false });
      const fd = new FormData();
      fd.append("description", found.description);
      if (found.isbn) fd.append("isbn_paperback", found.isbn);
      if (found.asin) fd.append("asin", found.asin);
      if (found.pages) fd.append("page_count", String(found.pages));
      if (found.publishDate) fd.append("publication_date", `${found.publishDate} 00:00:00.000Z`);
      if (found.publisher) fd.append("imprint", found.publisher);
      fd.append("status", "published");
      fd.append("published", "true");
      const link = tidyStoreLink(store) || (found.asin ? amazonLink(found.asin, host || undefined) : `https://www.amazon.com/s?k=${found.isbn || encodeURIComponent(found.title)}`);
      fd.append("buy_links", JSON.stringify([{ label: /amazon\./i.test(link) ? "Amazon" : "Buy the book", url: link }]));
      if (found.cover) {
        const blob = await (await fetch(found.cover)).blob();
        fd.append("cover", new File([blob], `${slugify(found.title)}-cover.${blob.type.split("/")[1] || "jpg"}`, { type: blob.type }));
      }
      await pb().collection("books").update(book.id, fd);
      localStorage.removeItem(PENDING_BOOK);
      // no website yet: the book is on it, now pick its address and look
      router.push(hasSite ? `/studio/books/${book.id}?tab=publish` : "/studio/site?new=1");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !busy) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogTitle>Add a book you already published</DialogTitle>
        <DialogDescription>
          Show a book you published elsewhere on your author website. Enter its ISBN or ASIN, or paste its Amazon link, and we&apos;ll add the cover, title, description and details for you, with a button to
          buy it.
        </DialogDescription>
        <form className="grid gap-3" onSubmit={lookUp}>
          <Label htmlFor="isbn">ISBN, ASIN or Amazon link</Label>
          <div className="flex gap-2">
            <Input id="isbn" required autoFocus placeholder="978-… or B0… or https://www.amazon.com/dp/…" value={isbn} onChange={(e) => setIsbn(e.target.value)} />
            <Button type="submit" variant="outline" disabled={busy || !isbn.trim()}>
              {busy && !found ? "Looking…" : "Look up"}
            </Button>
          </div>
          {!found && !asin && <LinkGuide />}
        </form>
        {asin && (
          <form className="grid gap-3 border-t border-border pt-4" onSubmit={findByTitle}>
            <p className="text-sm text-ink-2">
              <span className="font-medium text-ink">Kindle book {asin}.</span>{" "}
              {guessed
                ? "Amazon doesn't share Kindle book details, so we took the title from your link and put your pen name as the author. Check both: Amazon shortens long titles in its links."
                : "Amazon doesn't share Kindle book details, so type the title and author. We'll look for its cover and description, and the buy button will go straight to your Amazon page."}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="asin-title">Title</Label>
                <Input id="asin-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="asin-author">Author</Label>
                <Input id="asin-author" value={author} onChange={(e) => setAuthor(e.target.value)} />
              </div>
            </div>
            <div>
              <Button type="submit" variant="outline" disabled={busy || !title.trim()}>
                {busy && !found ? "Looking…" : "Find the details"}
              </Button>
            </div>
          </form>
        )}
        {found && (
          <div className="grid gap-4">
            {found.asin && (
              <p className="text-[13px] text-soft">
                {found.matched ? "Found on Open Library. Not your book? " : "No match on Open Library, so it goes on with what you typed. Add the cover and description after on the book's page. "}
                {found.matched && (
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={() => setFound({ ...found, title: title.trim(), subtitle: "", authors: author.trim() ? [author.trim()] : [], description: "", pages: 0, publisher: "", cover: "", matched: false })}
                  >
                    Use only what I typed
                  </button>
                )}
              </p>
            )}
            <div className="flex gap-4 rounded-md bg-muted p-3">
              {found.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={found.cover} alt="" className="h-28 w-auto shrink-0 object-contain" />
              ) : (
                <div className="grid h-28 w-20 shrink-0 place-items-center bg-card text-xs text-soft">No cover</div>
              )}
              <div className="min-w-0 text-sm">
                <p className="text-base font-semibold">{found.title}</p>
                {found.subtitle && <p>{found.subtitle}</p>}
                {found.authors.length > 0 && <p className="mt-1">{found.authors.join(", ")}</p>}
                <p className="mt-1 text-soft">{[found.publisher, found.publishDate.slice(0, 4), found.pages ? `${found.pages} pages` : ""].filter(Boolean).join(" · ")}</p>
                {!found.description && <p className="mt-1 text-soft">No description on record; add one after.</p>}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="isbn-store">Where readers buy it</Label>
              <Input id="isbn-store" type="url" placeholder="https://www.amazon.com/dp/…" value={store} onChange={(e) => setStore(e.target.value)} />
              <p className="text-[13px] text-soft">
                {found.asin ? `Left empty, it links to your Amazon page (amazon.com/dp/${found.asin}).` : "Paste the Amazon page (the one with your ASIN) or any store. Left empty, it links to an Amazon search for the ISBN."}
              </p>
            </div>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button type="button" disabled={busy || !found} onClick={add}>
            {busy && found ? "Adding…" : hasSite ? "Add to my website" : "Create my website"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
