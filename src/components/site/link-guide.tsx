/**
 * A picture of an Amazon address bar showing which part of the link to copy: everything up to
 * /ref. The long link works too; we cut it down ourselves.
 */
export function LinkGuide({ dark = false }: { dark?: boolean }) {
  return (
    <figure className={dark ? "text-cream/85" : "text-soft"}>
      <div className={`overflow-hidden border ${dark ? "border-cream/25 bg-char/40" : "border-border bg-paper-2"}`} aria-hidden>
        <div className={`flex items-center gap-1.5 border-b px-2.5 py-1.5 ${dark ? "border-cream/15" : "border-border"}`}>
          <span className="size-2 bg-current opacity-30" />
          <span className="size-2 bg-current opacity-30" />
          <span className="size-2 bg-current opacity-30" />
        </div>
        <p className="overflow-hidden px-3 py-2 font-mono text-[12px] leading-relaxed break-all">
          <span className={dark ? "bg-bonnet px-0.5 text-char" : "bg-primary/15 px-0.5 text-ink"}>
            https://www.amazon.com/Your-Book-Title-ebook/dp/<b>B0C7G8NHC2</b>
          </span>
          <span className="line-through opacity-50">/ref=sr_1_1?crid=DBDSZKS7U0BN&amp;keywords=…</span>
        </p>
      </div>
      <figcaption className="mt-1.5 text-[13px] leading-snug">
        From your book&apos;s Amazon page, copy the address up to <b>/ref</b>, or paste the whole thing and we&apos;ll tidy it. The 10 characters after <b>/dp/</b> are the ASIN, also listed under
        Product details.
      </figcaption>
    </figure>
  );
}
