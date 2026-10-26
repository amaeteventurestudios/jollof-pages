import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBookBySlug, getSampleChapter, getSite } from "@/lib/pb-server";
import { BookObject } from "@/components/site/book-object";
import { Tilt } from "@/components/site/tilt";
import { Pattern, Rim } from "@/components/site/patterns";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SubscribeForm } from "@/components/site/subscribe-form";
import { isUpcoming, spineOf, toStageBook } from "@/lib/site-data";
import { fileUrl } from "@/lib/pb";
import { PAPER_LABELS, type PaperType } from "@/lib/kdp";
import { bookFormat } from "@/lib/types";

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

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [site, book] = await Promise.all([getSite(), getBookBySlug(slug)]);
  if (!book) notFound();
  const sample = await getSampleChapter(book.id);
  const name = site?.publisher_name || "Jollof Pages";
  const sb = toStageBook(book);
  const f = bookFormat(book);
  const links = (book.buy_links ?? []).filter((l) => l.url);
  const author = book.expand?.author;
  const details: [string, string][] = [
    ["Author", author?.name ?? ""],
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
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader name={name} overHero />
      <section className="relative overflow-hidden bg-jollof pt-[72px] text-cream">
        <Pattern id="p-book" kind="adire" color="var(--char)" opacity={0.22} />
        <div className="relative mx-auto grid max-w-[1400px] items-center gap-12 px-4 pt-12 pb-28 sm:px-8 lg:min-h-[calc(92svh-72px)] lg:grid-cols-[1.2fr_1fr] lg:pb-36">
          <div>
            <h1 className="t-head wide font-bold" data-rise>
              {book.title}
            </h1>
            {book.subtitle && (
              <p className="t-lead mt-6 max-w-[34ch]" data-rise style={{ ["--i" as string]: 1 }}>
                {book.subtitle}
              </p>
            )}
            {author && (
              <p className="mt-6 font-semibold text-bonnet" data-rise style={{ ["--i" as string]: 2 }}>
                by {author.name}
              </p>
            )}
            <div className="mt-10 flex flex-wrap gap-3" data-rise style={{ ["--i" as string]: 3 }}>
              {links.length > 0 ? (
                links.map((l, i) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className={i === 0 ? "btn" : "btn btn-ghost"}>
                    {i === 0 ? `Buy on ${l.label || "Amazon"}` : l.label}
                  </a>
                ))
              ) : isUpcoming(book) ? (
                <a href="#notify" className="btn">
                  Tell me when it is out
                </a>
              ) : null}
              {sample && (
                <Link href={`/books/${book.slug}/read`} className={links.length || isUpcoming(book) ? "btn btn-ghost" : "btn"}>
                  Read the first pages
                </Link>
              )}
            </div>
          </div>
          <div className="relative flex justify-center max-sm:-my-12 max-sm:scale-[0.75]" data-rise style={{ ["--i" as string]: 2 }}>
            <div className="absolute top-1/2 left-1/2 aspect-square w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-char" aria-hidden />
            <Tilt className="float relative" max={12}>
              <BookObject book={sb} scale={46} className="book3d-enter" />
            </Tilt>
          </div>
        </div>
        <Rim color="var(--cream)" />
      </section>

      <main className="relative overflow-hidden bg-cream py-[clamp(4rem,9vw,8rem)]">
        <Pattern id="p-book-pepper" kind="pepper" color="var(--jollof)" opacity={0.12} drift={false} />
        <div className="relative mx-auto grid max-w-[1400px] gap-16 px-4 sm:px-8 lg:grid-cols-[1.3fr_1fr]">
          <div>
            {book.description && (
              <div className="grid max-w-[52ch] gap-[1.1em] text-[1.125rem] leading-[1.6]" data-reveal>
                {book.description
                  .split(/\n{2,}/)
                  .filter(Boolean)
                  .map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
              </div>
            )}
            {author?.bio && (
              <section className="mt-16 max-w-[52ch]" aria-labelledby="author-title" data-reveal>
                <div className="flex items-center gap-4">
                  {author.photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fileUrl(author, author.photo, "400x400")} alt="" width={56} height={56} className="size-14 rounded-full object-cover" />
                  )}
                  <h2 id="author-title" className="wide text-[1.75rem] font-bold tracking-[-0.03em]">
                    About {author.name}
                  </h2>
                </div>
                <p className="mt-5 text-[1.125rem] leading-[1.6]">{author.bio}</p>
              </section>
            )}
          </div>
          <div className="grid content-start gap-6">
            {details.length > 0 && (
              <dl className="grid gap-y-3 rounded-[28px] bg-white p-7" data-reveal>
                {details.map(([k, v]) => (
                  <div key={k} className="flex items-end">
                    <dt className="text-char/70">{k}</dt>
                    <span className="leader" aria-hidden />
                    <dd className="tabular text-right font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            <section id="notify" className="relative overflow-hidden rounded-[28px] bg-char p-7 text-cream" aria-labelledby="notify-title" data-reveal style={{ ["--i" as string]: 1 }}>
              <Pattern id="p-notify" kind="wax" color="var(--char-2)" />
              <div className="relative">
                <h2 id="notify-title" className="wide text-[1.75rem] font-bold tracking-[-0.03em]">
                  Hear about the next one
                </h2>
                <SubscribeForm source={`book:${book.slug}`} tone="dark" />
              </div>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter name={name} email={site?.email} />
    </>
  );
}
