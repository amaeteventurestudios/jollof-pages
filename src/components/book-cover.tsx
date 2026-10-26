import { cn } from "@/lib/utils";
import { fileUrl } from "@/lib/pb";
import type { Book } from "@/lib/types";

const FALLBACK = ["#0b6e3c", "#2b2622", "#7a2e1d", "#1f4a6b", "#5a3d6b"];

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

/** The uploaded cover, or a typographic stand-in at the 2:3 ratio of a 6 x 9 book. */
export function BookCover({ book, className, thumb = "480x0", sizes }: { book: Pick<Book, "id" | "collectionId" | "cover" | "title" | "subtitle" | "accent"> & { expand?: Book["expand"] }; className?: string; thumb?: string; sizes?: string }) {
  if (book.cover)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={fileUrl(book, book.cover, thumb)} alt={`Cover of ${book.title}`} sizes={sizes} className={cn("aspect-[2/3] w-full bg-paper-2 object-cover", className)} />
    );
  const bg = book.accent || FALLBACK[hash(book.id || book.title) % FALLBACK.length];
  return (
    <div role="img" aria-label={`Cover of ${book.title}`} className={cn("flex aspect-[2/3] w-full flex-col justify-between p-[9%] text-white", className)} style={{ background: bg, containerType: "inline-size" }}>
      <span className="text-[13cqi] leading-[0.95] tracking-[-0.02em]">{book.title}</span>
      {book.expand?.author?.name && <span className="text-[6.5cqi] opacity-90">{book.expand.author.name}</span>}
    </div>
  );
}
