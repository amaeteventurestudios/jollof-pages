import type { StageBook } from "@/lib/site-data";
import { spineOf } from "@/lib/site-data";
import { cn } from "@/lib/utils";

/** A book drawn at its real proportions: the spine depth is pages x paper thickness. */
export function BookObject({ book, scale, pages, className }: { book: StageBook; scale: number; pages?: number; className?: string }) {
  const w = book.width * scale;
  const h = book.height * scale;
  const spine = Math.max(2, spineOf({ pages: pages ?? book.pages, paper: book.paper }) * scale);
  return (
    <div className={cn("book3d", className)} style={{ width: w, height: h }}>
      <div className="book3d-inner" style={{ width: w, height: h }}>
        <div className="book3d-spine" style={{ width: spine, left: -spine, background: book.accent }}>
          {spine > 18 && (
            <span style={{ fontSize: Math.min(spine * 0.42, scale * 0.17), color: "#fff" }}>
              {book.title}
              {book.author ? `  ·  ${book.author}` : ""}
            </span>
          )}
        </div>
        <div className="book3d-face" style={{ background: book.accent }}>
          {book.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.cover} alt={`Cover of ${book.title}`} width={Math.round(w)} height={Math.round(h)} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col justify-between p-[9%] text-white" style={{ containerType: "inline-size" }}>
              <span className="text-[12cqi] leading-[0.95] tracking-[-0.02em]">{book.title}</span>
              <span className="text-[6cqi]">{book.author}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
