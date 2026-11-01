"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { errorMessage, fileUrl, pb } from "@/lib/pb";
import { userId } from "@/lib/studio";
import type { Book } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toWebp } from "@/lib/webp";

export interface Asset {
  id: string;
  collectionId: string;
  owner: string;
  book: string;
  file: string;
  alt: string;
  created: string;
  expand?: { book?: Pick<Book, "id" | "title"> };
}

export function assetUrl(a: Asset): string {
  return fileUrl(a, a.file);
}

export function assetThumb(a: Asset): string {
  return fileUrl(a, a.file, "400x0");
}

async function listAssets(): Promise<Asset[]> {
  return pb().collection("assets").getFullList<Asset>({
    sort: "-created",
    expand: "book",
    fields: "id,collectionId,owner,book,file,alt,created,expand.book.id,expand.book.title",
  });
}

export async function uploadAssets(files: File[], bookId?: string): Promise<Asset[]> {
  const out: Asset[] = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    out.push(
      await pb()
        .collection("assets")
        .create<Asset>({
          owner: userId(),
          book: bookId || "",
          file: await toWebp(file),
          alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
        }),
    );
  }
  return out;
}

/**
 * Every image the author has uploaded, across all books. With `onPick` it works as a picker:
 * click an image to use it. Uploads made from inside a book are filed under that book.
 */
export function ImageLibrary({ bookId, onPick, className }: { bookId?: string; onPick?: (a: Asset) => void; className?: string }) {
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<string>(bookId ? "book" : "all");
  const [drag, setDrag] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    listAssets()
      .then(setAssets)
      .catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(load, [load]);

  async function add(files: File[]) {
    if (!files.length) return;
    setBusy(true);
    setError("");
    try {
      const created = await uploadAssets(files, bookId);
      setAssets((a) => [...created, ...(a ?? [])]);
      if (onPick && created.length === 1) onPick(created[0]);
    } catch (e) {
      setError(`Upload failed: ${errorMessage(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function remove(a: Asset) {
    if (!confirm("Delete this image? Any chapter that shows it will show nothing in its place.")) return;
    try {
      await pb().collection("assets").delete(a.id);
      setAssets((all) => (all ?? []).filter((x) => x.id !== a.id));
    } catch (e) {
      setError(`Could not delete: ${errorMessage(e)}`);
    }
  }

  async function saveAlt(a: Asset, alt: string) {
    setEditing(null);
    if (alt === a.alt) return;
    setAssets((all) => (all ?? []).map((x) => (x.id === a.id ? { ...x, alt } : x)));
    await pb()
      .collection("assets")
      .update(a.id, { alt })
      .catch((e) => setError(errorMessage(e)));
  }

  const books = [...new Map((assets ?? []).filter((a) => a.expand?.book).map((a) => [a.book, a.expand!.book!.title])).entries()];
  const shown = (assets ?? []).filter((a) => (filter === "all" ? true : filter === "book" ? a.book === bookId : filter === "none" ? !a.book : a.book === filter));

  return (
    <div
      className={cn("flex min-h-0 flex-col", className)}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        add([...e.dataTransfer.files]);
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Show images from" value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 rounded border border-input bg-card px-2 text-sm">
          <option value="all">All my images</option>
          {bookId && <option value="book">This book</option>}
          {books
            .filter(([id]) => id !== bookId)
            .map(([id, title]) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
          <option value="none">Not in a book</option>
        </select>
        <span className="text-sm text-soft">{assets ? `${shown.length} ${shown.length === 1 ? "image" : "images"}` : ""}</span>
        <Button className="ml-auto" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />}
          {busy ? "Uploading" : "Upload images"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple={!onPick}
          className="hidden"
          onChange={(e) => {
            add([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="mt-3 bg-danger-soft p-2.5 text-sm text-destructive">{error}</p>}

      <div className={cn("relative mt-4 min-h-40 flex-1 overflow-y-auto border border-dashed p-3", drag ? "border-primary bg-primary-soft" : "border-transparent")}>
        {!assets ? (
          <p className="text-sm text-soft">Loading your images…</p>
        ) : !shown.length ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="grid h-40 w-full place-items-center border border-dashed border-border text-sm text-soft hover:border-primary hover:text-primary"
          >
            <span className="grid justify-items-center gap-2">
              <ImagePlus className="size-6" />
              Drop images here or click to upload. JPG, PNG, WebP or GIF up to 20 MB.
            </span>
          </button>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
            {shown.map((a) => (
              <li key={a.id} className="group relative border border-border bg-card">
                <button
                  type="button"
                  onClick={() => onPick?.(a)}
                  disabled={!onPick}
                  className={cn("block aspect-[4/3] w-full overflow-hidden bg-paper-2", onPick && "cursor-pointer hover:outline-2 hover:outline-primary")}
                  aria-label={onPick ? `Use ${a.alt || "this image"}` : a.alt || "Image"}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={assetThumb(a)} alt={a.alt} loading="lazy" className="size-full object-cover" />
                  {onPick && (
                    <span className="absolute top-2 left-2 hidden items-center gap-1 bg-primary px-2 py-1 text-xs text-primary-foreground group-hover:inline-flex">
                      <Check className="size-3" /> Use
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-1 p-1.5">
                  {editing === a.id ? (
                    <input
                      autoFocus
                      defaultValue={a.alt}
                      aria-label="Description"
                      onBlur={(e) => saveAlt(a, e.target.value.trim())}
                      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                      className="min-w-0 flex-1 border border-input px-1 text-[13px]"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditing(a.id)}
                      title="Edit the description screen readers announce"
                      className="min-w-0 flex-1 truncate text-left text-[13px] text-ink-2 hover:text-ink"
                    >
                      {a.alt || "Add a description"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(a)}
                    aria-label="Delete image"
                    className="rounded p-1 text-soft opacity-0 group-hover:opacity-100 hover:text-destructive focus:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                {!bookId && a.expand?.book && <p className="truncate px-1.5 pb-1.5 text-xs text-soft">{a.expand.book.title}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** The image library in a dialog, for placing an image in a chapter. */
export function ImagePickerDialog({
  open,
  onOpenChange,
  bookId,
  title = "Choose an image",
  description = "Pick one of your images or upload a new one.",
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bookId?: string;
  title?: string;
  description?: string;
  onPick: (a: Asset) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(720px,90vh)] max-w-4xl flex-col">
        <div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </div>
        {open && (
          <ImageLibrary
            bookId={bookId}
            className="flex-1"
            onPick={(a) => {
              onPick(a);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
