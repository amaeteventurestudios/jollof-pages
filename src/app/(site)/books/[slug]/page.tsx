import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBookBySlug, getSampleChapter, getSite } from "@/lib/pb-server";
import { StageProvider, Stage } from "@/components/site/stage";
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
    <StageProvider books={[sb]}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="lg:grid lg:grid-cols-2">
        <div className="sticky top-0 z-0 h-[56svh] p-3 lg:order-2 lg:h-svh lg:pl-1.5">
          <Stage books={[sb]} className="h-full" />
        </div>
        <main className="relative z-10 bg-paper px-4 sm:px-8 lg:order-1 lg:px-14">
          <SiteHeader name={name} />
          <article className="pt-12 pb-24 sm:pt-20">
            <h1 className="t-head max-w-[16ch]" data-rise>
              {book.title}
            </h1>
            {book.subtitle && (
              <p className="t-lead mt-5 max-w-[34ch]" data-rise style={{ ["--i" as string]: 1 }}>
                {book.subtitle}
              </p>
            )}
            {author && (
              <p className="mt-6" data-rise style={{ ["--i" as string]: 2 }}>
                by {author.name}
              </p>
            )}
            <div className="mt-10 flex flex-wrap gap-3" data-rise style={{ ["--i" as string]: 3 }}>
              {links.length > 0 ? (
                links.map((l, i) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className={i === 0 ? "btn" : "btn btn-quiet"}>
                    {i === 0 ? `Buy on ${l.label || "Amazon"}` : l.label}
                  </a>
                ))
              ) : isUpcoming(book) ? (
                <a href="#notify" className="btn">
                  Tell me when it is out
                </a>
              ) : null}
              {sample && (
                <Link href={`/books/${book.slug}/read`} className="btn btn-ink">
                  Read the first pages
                </Link>
              )}
            </div>

            {book.description && (
              <div className="mt-20 grid max-w-[46ch] gap-[1.1em]" data-reveal>
                {book.description
                  .split(/\n{2,}/)
                  .filter(Boolean)
                  .map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
              </div>
            )}

            {details.length > 0 && (
              <dl className="mt-20 grid max-w-[46ch] gap-y-2" data-reveal>
                {details.map(([k, v]) => (
                  <div key={k} className="flex items-end">
                    <dt className="text-soft">{k}</dt>
                    <span className="leader" aria-hidden />
                    <dd className="tabular text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            )}

            {author?.bio && (
              <section className="mt-20 max-w-[46ch]" aria-labelledby="author-title" data-reveal>
                <div className="flex items-center gap-4">
                  {author.photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fileUrl(author, author.photo, "400x400")} alt="" width={56} height={56} className="size-14 rounded-full object-cover" />
                  )}
                  <h2 id="author-title" className="text-[1.5rem] tracking-[-0.01em]">
                    About {author.name}
                  </h2>
                </div>
                <p className="mt-5">{author.bio}</p>
              </section>
            )}

            <section id="notify" className="mt-20 max-w-[30rem] bg-card p-8" aria-labelledby="notify-title" data-reveal>
              <h2 id="notify-title" className="text-[1.5rem] tracking-[-0.01em]">
                Hear about the next one
              </h2>
              <SubscribeForm source={`book:${book.slug}`} />
            </section>
          </article>
        </main>
      </div>
      <SiteFooter name={name} email={site?.email} />
    </StageProvider>
  );
}
