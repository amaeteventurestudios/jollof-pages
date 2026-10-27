import Link from "next/link";
import type { StageBook } from "@/lib/site-data";
import { spineOf } from "@/lib/site-data";

/**
 * The books standing on a shelf, spine out. Each spine is drawn at the book's real height and
 * (exaggerated) real thickness; on hover the book slides out and turns to show its cover.
 */
export function Shelf({ books, unit = 52 }: { books: StageBook[]; unit?: number }) {
  return (
    <ul className="shelf flex items-end gap-1.5 pt-6" aria-label="The books on the shelf">
      {books.map((b, i) => {
        const h = b.height * unit;
        const w = b.width * unit;
        // real spines are a few millimetres; draw them three times wider so a title fits
        const spine = Math.max(30, Math.min(84, spineOf(b) * unit * 3));
        return (
          <li key={b.id} className="shelf-slot shrink-0" style={{ ["--w" as string]: `${w}px`, ["--s" as string]: `${spine}px`, ["--h" as string]: `${h}px`, ["--i" as string]: i }} data-rise>
            <Link href={`/books/${b.slug}`} className="shelf-book block" aria-label={`${b.title}${b.author ? `, ${b.author}` : ""}`}>
              <span className="shelf-spine" style={{ background: b.accent }}>
                <span className="shelf-title wide">{b.title}</span>
                <span className="shelf-author">{b.author}</span>
              </span>
              <span className="shelf-cover" style={{ background: b.accent }}>
                {b.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.cover} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full flex-col justify-between p-[9%] text-cream">
                    <span className="wide text-[1.5rem] leading-none font-bold">{b.title}</span>
                    <span>{b.author}</span>
                  </span>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
