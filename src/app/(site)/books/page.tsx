import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedBooks, getSite } from "@/lib/pb-server";
import { BookCover } from "@/components/book-cover";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { isUpcoming, year } from "@/lib/site-data";

export const revalidate = 60;
export const metadata: Metadata = { title: "Books", description: "Every Jollof Pages title, in paperback and ebook." };

export default async function BooksPage() {
  const [site, books] = await Promise.all([getSite(), getPublishedBooks()]);
  const name = site?.publisher_name || "Jollof Pages";
  return (
    <>
      <div className="px-4 sm:px-8 lg:px-14">
        <SiteHeader name={name} />
        <main>
          <h1 className="t-display pt-10 pb-16 sm:pt-16" data-rise>
            The books
          </h1>
          {books.length === 0 ? (
            <p className="t-lead max-w-[40ch] pb-24">The first books are in the pot. Join the reader list on the home page to hear the day they are ready.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-x-6 gap-y-14 sm:grid-cols-3 lg:grid-cols-4">
              {books.map((b, i) => (
                <li key={b.id} className="shelf-item" data-reveal style={{ ["--i" as string]: i % 4 }}>
                  <Link href={`/books/${b.slug}`} className="group block">
                    <div className="shelf-cover">
                      <BookCover book={b} thumb="480x0" sizes="(min-width: 1024px) 25vw, 50vw" />
                    </div>
                    <h2 className="mt-4 text-[1.25rem] leading-tight tracking-[-0.01em] group-hover:text-primary">{b.title}</h2>
                    {b.subtitle && <p className="t-small mt-1 text-soft">{b.subtitle}</p>}
                    <p className="t-small mt-2">{isUpcoming(b) ? `Coming ${year(b.publication_date)}` : b.expand?.author?.name}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
      <SiteFooter name={name} email={site?.email} />
    </>
  );
}
