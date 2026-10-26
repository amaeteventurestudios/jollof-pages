import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { getBookBySlug, getSampleChapter, getSite } from "@/lib/pb-server";
import { BookObject } from "@/components/site/book-object";
import { Tilt } from "@/components/site/tilt";
import { Pattern } from "@/components/site/patterns";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SubscribeForm } from "@/components/site/subscribe-form";
import { isDark, isUpcoming, spineOf, toStageBook } from "@/lib/site-data";
import { fileUrl } from "@/lib/pb";
import { PAPER_LABELS, type PaperType } from "@/lib/kdp";
import { bookFormat, type Quote } from "@/lib/types";
import { cn } from "@/lib/utils";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const book = await getBookBySlug((await params).slug);
  if (!book) return { title: "Book not found" };
  return {
    title: book.title,
    description: book.pitch || book.subtitle || book.description.slice(0, 160),
    openGraph: { title: book.title, description: book.pitch || book.subtitle, images: book.cover ? [fileUrl(book, book.cover, "960x0")] : [] },
  };
}

/**
 * A book's own page, set in the book's colour: the book stands on the left and turns as you scroll,
 * while the right column carries everything about it: what it is, where to buy it and at what price,
 * the author, praise, reviews and the printed details.
 */
export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [site, book] = await Promise.all([getSite(), getBookBySlug(slug)]);
  if (!book) notFound();
  const sample = await getSampleChapter(book.id);
  const name = site?.publisher_name || "Jollof Pages";
  const sb = toStageBook(book);
  const f = bookFormat(book);
  const links = (book.buy_links ?? []).filter((l) => l.url);
  const praise = (book.praise ?? []).filter((q) => q.quote);
  const reviews = (book.reviews ?? []).filter((q) => q.quote);
  const author = book.expand?.author;
  const upcoming = isUpcoming(book);
  const dark = isDark(sb.accent);
  const details: [string, string][] = [
    ["Format", `Paperback, ${sb.trimLabel}`],
    ["Pages", book.page_count ? String(book.page_count) : ""],
    ["Paper", PAPER_LABELS[f.paper as PaperType] ?? ""],
    ["Spine", book.page_count ? `${spineOf(sb).toFixed(3)} in` : ""],
    ["Published", book.publication_date ? new Date(book.publication_date).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" }) : ""],
    ["Paperback ISBN", book.isbn_paperback],
    ["Ebook ISBN", book.isbn_ebook],
    ["Series", book.series ? `${book.series}${book.series_number ? `, book ${book.series_number}` : ""}` : ""],
    ["Imprint", book.imprint],
  ].filter(([, v]) => v) as [string, string][];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title,
    alternativeHeadline: book.subtitle || undefined,
    author: author ? { "@type": "Person", name: author.name } : undefined,
    publisher: { "@type": "Organization", name },
    isbn: book.isbn_paperback || book.isbn_ebook || undefined,
    numberOfPages: book.page_count || undefined,
    image: book.cover ? fileUrl(book, book.cover) : undefined,
    description: book.description || undefined,
    review: reviews.map((r) => ({ "@type": "Review", reviewBody: r.quote, author: { "@type": "Organization", name: r.source }, url: r.url || undefined })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader name={name} overHero />
      <div className={cn("relative pt-[72px]", dark ? "text-cream" : "text-char")} style={{ background: sb.accent }}>
        <Pattern id="p-book" kind="adire" color={dark ? "#000" : "var(--char)"} opacity={dark ? 0.14 : 0.08} drift={false} />
        <div className="relative mx-auto grid max-w-[1400px] gap-x-16 px-4 sm:px-8 lg:grid-cols-[1fr_minmax(0,40rem)]">
          <div className="lg:sticky lg:top-[72px] lg:h-[calc(100svh-72px)]">
            <div className="flex h-full items-center justify-center py-16 max-sm:-my-10 max-sm:scale-[0.72] lg:py-0" data-rise>
              <Tilt className="float" max={10}>
                <BookObject book={sb} scale={62} className="book3d-enter book-spin" />
              </Tilt>
            </div>
          </div>

          <main className="pb-24 lg:pt-[12vh]">
            <header>
              <h1 className="t-head wide font-bold" data-rise>
                {book.title}
              </h1>
              {book.subtitle && (
                <p className="t-lead mt-5" data-rise style={{ ["--i" as string]: 1 }}>
                  {book.subtitle}
                </p>
              )}
              {author && (
                <p className="mt-5 text-[1.125rem] font-semibold" data-rise style={{ ["--i" as string]: 2 }}>
                  {author.name}
                </p>
              )}
            </header>

            {book.description && (
              <div className="mt-10 grid gap-[1.1em] text-[1.125rem] leading-[1.6]" data-rise style={{ ["--i" as string]: 3 }}>
                {book.description
                  .split(/\n{2,}/)
                  .filter(Boolean)
                  .map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
              </div>
            )}

            <Block title={links.length ? (upcoming ? "Preorder" : "Purchase") : upcoming ? "Coming soon" : "Purchase"} dark={dark}>
              {links.length > 0 ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {links.map((l) => (
                    <li key={l.url}>
                      <a href={l.url} target="_blank" rel="noreferrer" className={cn("buy-row flex h-16 items-center justify-between gap-4 border-2 px-5 font-semibold", dark ? "border-cream/60" : "border-char/60")}>
                        <span>{l.label || "Amazon"}</span>
                        <span className="flex items-center gap-3">
                          {l.price && <span className="tabular">{l.price}</span>}
                          <ArrowUpRight className="arrow size-5" aria-hidden />
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[1.125rem]">{upcoming ? "Not in the shops yet. Leave your email below and we will tell you the day it is." : "Store links are on their way."}</p>
              )}
              {sample && (
                <Link href={`/books/${book.slug}/read`} className={cn("buy-row mt-2 flex h-16 items-center justify-between border-2 px-5 font-semibold", dark ? "border-cream/60" : "border-char/60")}>
                  Read the first pages
                  <ArrowRight className="arrow size-5" aria-hidden />
                </Link>
              )}
            </Block>

            {author && (author.bio || author.photo) && (
              <Block title="Author" dark={dark}>
                <div className="flex items-start gap-5">
                  {author.photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fileUrl(author, author.photo, "400x400")} alt={author.name} width={96} height={96} className="size-24 shrink-0 object-cover" />
                  )}
                  <div>
                    <p className="text-[1.125rem] leading-[1.6]">{author.bio}</p>
                    {author.website && (
                      <a href={author.website} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 font-semibold underline decoration-2 underline-offset-4">
                        Website <ArrowUpRight className="size-4" aria-hidden />
                      </a>
                    )}
                  </div>
                </div>
              </Block>
            )}

            {praise.length > 0 && (
              <Block title="Praise" dark={dark}>
                <Quotes items={praise} />
              </Block>
            )}

            {reviews.length > 0 && (
              <Block title="Reviews" dark={dark}>
                <Quotes items={reviews} />
              </Block>
            )}

            {details.length > 0 && (
              <Block title="Details" dark={dark}>
                <dl className="grid gap-y-3">
                  {details.map(([k, v]) => (
                    <div key={k} className="flex items-end">
                      <dt className="opacity-75">{k}</dt>
                      <span className="leader" aria-hidden />
                      <dd className="tabular text-right font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              </Block>
            )}

            <section id="notify" className="relative mt-16 overflow-hidden bg-char p-7 text-cream sm:p-9" aria-labelledby="notify-title" data-reveal>
              <Pattern id="p-notify" kind="wax" color="var(--char-2)" />
              <div className="relative">
                <h2 id="notify-title" className="wide text-[1.75rem] font-bold tracking-[-0.03em]">
                  {upcoming ? "Tell me when it is out" : "Hear about the next one"}
                </h2>
                <SubscribeForm source={`book:${book.slug}`} tone="dark" />
              </div>
            </section>
          </main>
        </div>
      </div>
      <SiteFooter name={name} email={site?.email} />
    </>
  );
}

function Block({ title, dark, children }: { title: string; dark: boolean; children: React.ReactNode }) {
  return (
    <section className={cn("mt-16 border-t-4 pt-6", dark ? "border-cream" : "border-char")} data-reveal>
      <h2 className="wide mb-6 text-[1.5rem] font-bold tracking-[-0.03em]">{title}</h2>
      {children}
    </section>
  );
}

function Quotes({ items }: { items: Quote[] }) {
  return (
    <ul className="grid gap-10">
      {items.map((q, i) => (
        <li key={i}>
          <blockquote className="text-[1.375rem] leading-[1.4] tracking-[-0.01em]">&ldquo;{q.quote}&rdquo;</blockquote>
          <p className="mt-3">
            {q.url ? (
              <a href={q.url} target="_blank" rel="noreferrer" className="font-semibold underline decoration-2 underline-offset-4">
                {q.source}
              </a>
            ) : (
              <span className="font-semibold">{q.source}</span>
            )}
            {q.role && <span className="opacity-80">, {q.role}</span>}
          </p>
        </li>
      ))}
    </ul>
  );
}
