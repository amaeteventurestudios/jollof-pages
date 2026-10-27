"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBook, listAuthors, uniqueSlug, userId } from "@/lib/studio";
import { errorMessage, pb } from "@/lib/pb";
import { slugify } from "@/lib/slug";
import type { IsbnBook } from "@/lib/isbn";
import type { Author } from "@/lib/types";

/**
 * Adds a book the author already published somewhere else: look it up by ISBN, check what
 * Open Library knows, and it goes on their website with its cover, blurb and a store link.
 */
export function IsbnDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [isbn, setIsbn] = useState("");
  const [found, setFound] = useState<IsbnBook | null>(null);
  const [store, setStore] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setIsbn("");
    setFound(null);
    setStore("");
    setError("");
    setBusy(false);
  }

  async function lookUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setFound(null);
    try {
      const res = await fetch(`/api/books/isbn?isbn=${encodeURIComponent(isbn)}`, { headers: { Authorization: pb().authStore.token } });
      const body = (await res.json()) as IsbnBook & { error?: string };
      if (!res.ok) throw new Error(body.error || "Lookup failed.");
      setFound(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

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
      fd.append("isbn_paperback", found.isbn);
      if (found.pages) fd.append("page_count", String(found.pages));
      if (found.publishDate) fd.append("publication_date", `${found.publishDate} 00:00:00.000Z`);
      if (found.publisher) fd.append("imprint", found.publisher);
      fd.append("status", "published");
      fd.append("published", "true");
      const link = store.trim() || `https://www.amazon.com/s?k=${found.isbn}`;
      fd.append("buy_links", JSON.stringify([{ label: /amazon\./i.test(link) ? "Amazon" : "Buy the book", url: link }]));
      if (found.cover) {
        const blob = await (await fetch(found.cover)).blob();
        fd.append("cover", new File([blob], `${slugify(found.title)}-cover.${blob.type.split("/")[1] || "jpg"}`, { type: blob.type }));
      }
      await pb().collection("books").update(book.id, fd);
      router.push(`/studio/books/${book.id}?tab=publish`);
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
        <DialogTitle>Add a published book</DialogTitle>
        <DialogDescription>For books you already published elsewhere. Enter the ISBN from the back cover or the copyright page and we fill in the rest.</DialogDescription>
        <form className="grid gap-3" onSubmit={lookUp}>
          <Label htmlFor="isbn">ISBN</Label>
          <div className="flex gap-2">
            <Input id="isbn" required autoFocus inputMode="numeric" placeholder="978-…" value={isbn} onChange={(e) => setIsbn(e.target.value)} />
            <Button type="submit" variant="outline" disabled={busy || !isbn.trim()}>
              {busy && !found ? "Looking…" : "Look up"}
            </Button>
          </div>
        </form>
        {found && (
          <div className="grid gap-4">
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
              <p className="text-[13px] text-soft">Paste the Amazon page (the one with your ASIN) or any store. Left empty, it links to an Amazon search for the ISBN.</p>
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
            {busy && found ? "Adding…" : "Add to my website"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
