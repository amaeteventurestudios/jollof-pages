import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedBooks, resolveSite } from "@/lib/pb-server";
import { notFound } from "next/navigation";
import { rootDomain } from "@/lib/sites";
import { BookCover } from "@/components/book-cover";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { isUpcoming, year } from "@/lib/site-data";
import { Pattern, Rim } from "@/components/site/patterns";
import { Lines } from "@/components/site/lines";
import { CompleteShelf } from "@/components/site/complete-shelf/complete-shelf";
import { toShelfBook } from "@/lib/shelf-catalog";

export const revalidate = 60;
export const metadata: Metadata = { title: "Books", description: "Every Jollof Pages title, in paperback and ebook." };

// also serves an author's /books through /sites/[site]/books
export default async function BooksPage({ params }: { params?: Promise<{ site?: string }> }) {
  const sub = (await params)?.site;
  const site = await resolveSite(sub);
  if (sub && !site) notFound();
  const books = await getPublishedBooks(site?.owner);
  const name = site?.publisher_name || "Jollof Pages";
  return (
    <>
      <SiteHeader name={name} overHero={books.length === 0} author={!!sub} />
      {books.length > 0 && (
        <div className="pt-[72px]" style={{ ["--cs-height" as string]: "calc(100svh - 72px)" }}>
          <CompleteShelf books={books.map(toShelfBook)} />
        </div>
      )}
      <section className={books.length > 0 ? "sr-only" : "relative overflow-hidden bg-jollof pt-[72px] text-cream"}>
        <Pattern id="p-books" kind="wax" color="var(--char)" opacity={0.22} />
        <div className="relative mx-auto max-w-[1400px] px-4 pt-16 pb-28 sm:px-8 sm:pt-24 sm:pb-36">
          <h1 className="t-display wide">
            <Lines lines={["The books"]} />
          </h1>
          <p className="t-lead mt-6 max-w-[36ch]" data-rise style={{ ["--i" as string]: 2 }}>
            {sub ? "In paperback and ebook." : "Practical non-fiction, in paperback and ebook."} Open one to read the first pages free.
          </p>
        </div>
        <Rim color="var(--cream)" />
      </section>
      <main className="relative overflow-hidden bg-ground pt-12 pb-[clamp(5rem,10vw,9rem)]">
        <Pattern id="p-books-rice" kind="rice" color="var(--ground-2)" />
        <div className="relative mx-auto max-w-[1400px] px-4 sm:px-8">
          {books.length > 0 && <h2 className="wide mb-10 text-[clamp(1.75rem,3vw,2.5rem)] font-bold tracking-[-0.03em]">Every book</h2>}
          {books.length === 0 ? (
            <p className="t-lead max-w-[40ch]">The first books are in the pot. Join the reader list on the home page to hear the day they are ready.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-x-6 gap-y-14 sm:grid-cols-3 lg:grid-cols-4">
              {books.map((b, i) => (
                <li key={b.id} className="shelf-item" data-reveal style={{ ["--i" as string]: i % 4 }}>
                  <Link href={`/books/${b.slug}`} className="group block">
                    <div className="shadow-[0_24px_40px_-24px_rgba(58,20,10,0.55)] transition-transform duration-500 group-hover:-translate-y-2 group-hover:-rotate-[1.5deg]">
                      <BookCover book={b} thumb="480x0" sizes="(min-width: 1024px) 25vw, 50vw" />
                    </div>
                    <h2 className="wide mt-5 text-[1.375rem] leading-tight font-bold tracking-[-0.03em] transition-colors group-hover:text-jollof">{b.title}</h2>
                    {b.subtitle && <p className="mt-1 text-on-ground/75">{b.subtitle}</p>}
                    <p className="mt-2 font-semibold text-jollof">{isUpcoming(b) ? `Coming ${year(b.publication_date)}` : b.expand?.author?.name}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <SiteFooter name={name} email={site?.email} {...(sub ? { blurb: site?.intro || undefined, studioUrl: `https://${rootDomain()}` } : {})} />
    </>
  );
}
