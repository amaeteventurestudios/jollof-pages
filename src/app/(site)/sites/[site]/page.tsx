import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getAuthors, getPublishedBooks, resolveSite } from "@/lib/pb-server";
import { BookCover } from "@/components/book-cover";
import { BookObject } from "@/components/site/book-object";
import { Lines } from "@/components/site/lines";
import { Pattern, Rim } from "@/components/site/patterns";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { SubscribeForm } from "@/components/site/subscribe-form";
import { Tilt } from "@/components/site/tilt";
import { isUpcoming, toStageBook, year } from "@/lib/site-data";
import { fileUrl } from "@/lib/pb";
import { rootDomain } from "@/lib/sites";
import { patternOf, type SiteDesign } from "@/lib/site-design";
import { SiteDesignStyle } from "@/components/site/site-design-style";

export const revalidate = 60;

type Params = Promise<{ site: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const site = await resolveSite((await params).site);
  if (!site) return { title: "Site not found" };
  const name = site.publisher_name || "Books";
  return {
    title: { absolute: site.tagline ? `${name}: ${site.tagline}` : name },
    description: site.intro || `Books by ${name}.`,
    openGraph: { title: name, description: site.intro || undefined, siteName: name },
    twitter: { card: "summary", title: name, description: site.intro || undefined },
  };
}

/**
 * An author's home page at <subdomain>.jollofpages.com, filled in from their Desk:
 * the lead book, every published book, the pen names behind them, their letter and their reader list.
 */
/** ?preview=<base64url JSON> shows a design from the Desk before it is saved. */
function previewDesign(raw: string | string[] | undefined): SiteDesign | null {
  if (typeof raw !== "string" || raw.length > 3000) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as SiteDesign;
  } catch {
    return null;
  }
}

export default async function AuthorHome({ params, searchParams }: { params: Params; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sub = (await params).site;
  const site = await resolveSite(sub);
  if (!site) notFound();
  const design = previewDesign((await searchParams).preview) ?? site.design;
  const heroPattern = patternOf(design, "adire");
  const bandPattern = patternOf(design, "wax");
  const [books, authors] = await Promise.all([getPublishedBooks(site.owner), getAuthors(site.owner)]);
  const name = site.publisher_name || sub;
  const lead = books.find((b) => b.id === site.hero_book) ?? books.find((b) => b.featured) ?? books[0];
  const people = authors.filter((a) => books.some((b) => b.author === a.id) && (a.bio || a.photo));
  const letter = (site.about || "").split(/\n{2,}/).filter(Boolean);

  return (
    <>
      <SiteDesignStyle design={design} />
      <SiteHeader name={name} overHero author />

      <section aria-labelledby="author-title" className="relative overflow-hidden bg-jollof pt-[72px] text-cream">
        {heroPattern && <Pattern id="p-author" kind={heroPattern} color="var(--char)" opacity={0.18} />}
        <div className="relative mx-auto grid max-w-[1400px] items-center gap-10 px-4 pt-14 pb-24 sm:px-8 sm:pt-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:pb-32">
          <div>
            <h1 id="author-title" className="t-display wide font-bold">
              <Lines lines={[name]} />
            </h1>
            {site.tagline && (
              <p className="t-lead mt-6 max-w-[34ch] font-semibold" data-rise style={{ ["--i" as string]: 1 }}>
                {site.tagline}
              </p>
            )}
            {site.intro && (
              <p className="mt-4 max-w-[52ch] text-[1.125rem] text-cream/90" data-rise style={{ ["--i" as string]: 2 }}>
                {site.intro}
              </p>
            )}
            <div className="mt-9 flex flex-wrap gap-3" data-rise style={{ ["--i" as string]: 3 }}>
              {books.length > 0 && (
                <a href="#books" className="btn">
                  See the books <ArrowRight className="size-5" aria-hidden />
                </a>
              )}
              <a href="#join" className="btn btn-ghost">
                Join the reader list
              </a>
            </div>
          </div>
          {lead && (
            <Link href={`/books/${lead.slug}`} className="flex justify-center py-6 max-sm:scale-[0.8]" aria-label={`${lead.title}, open the book`} data-rise style={{ ["--i" as string]: 2 }}>
              <Tilt className="float" max={10}>
                <BookObject book={toStageBook(lead)} scale={48} className="book3d-enter" />
              </Tilt>
            </Link>
          )}
        </div>
        <Rim color="var(--ground)" />
      </section>

      <main>
        <section id="books" aria-labelledby="books-title" className="relative scroll-mt-16 overflow-hidden bg-ground py-[clamp(4rem,9vw,7rem)]">
          <Pattern id="p-author-rice" kind="rice" color="var(--ground-2)" />
          <div className="relative mx-auto max-w-[1400px] px-4 sm:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="books-title" className="wide text-[clamp(2rem,4vw,3.25rem)] font-bold tracking-[-0.03em]">
                Books
              </h2>
              {books.length > 1 && (
                <Link href="/books" className="link font-semibold">
                  See them on the shelf
                </Link>
              )}
            </div>
            {books.length === 0 ? (
              <p className="t-lead mt-8 max-w-[40ch]">The first book is on its way. Join the reader list below to hear the day it is out.</p>
            ) : (
              <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-14 sm:grid-cols-3 lg:grid-cols-4">
                {books.map((b, i) => (
                  <li key={b.id} className="shelf-item" data-reveal style={{ ["--i" as string]: i % 4 }}>
                    <Link href={`/books/${b.slug}`} className="group block">
                      <div className="shadow-[0_24px_40px_-24px_rgba(58,20,10,0.55)] transition-transform duration-500 group-hover:-translate-y-2 group-hover:-rotate-[1.5deg]">
                        <BookCover book={b} thumb="480x0" sizes="(min-width: 1024px) 25vw, 50vw" />
                      </div>
                      <h3 className="wide mt-5 text-[1.375rem] leading-tight font-bold tracking-[-0.03em] transition-colors group-hover:text-jollof">{b.title}</h3>
                      {b.subtitle && <p className="mt-1 text-on-ground/75">{b.subtitle}</p>}
                      <p className="mt-2 font-semibold text-jollof">{isUpcoming(b) ? `Coming ${year(b.publication_date)}` : b.expand?.author?.name}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {(letter.length > 0 || people.length > 0) && (
          <section id="about" aria-labelledby="about-title" className="relative scroll-mt-16 bg-ground-2 py-[clamp(4rem,9vw,7rem)]">
            <div className="mx-auto grid max-w-[1400px] gap-12 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div>
                <h2 id="about-title" className="wide text-[clamp(2rem,4vw,3.25rem)] font-bold tracking-[-0.03em]">
                  About
                </h2>
                <div className="mt-8 grid max-w-[60ch] gap-[1.1em] text-[1.125rem] leading-[1.65]">
                  {letter.map((p, i) => (
                    <p key={i} data-reveal>
                      {p}
                    </p>
                  ))}
                </div>
              </div>
              {people.length > 0 && (
                <ul className="grid content-start gap-8">
                  {people.map((a) => (
                    <li key={a.id} className="flex items-start gap-5 border-t-4 border-char pt-6" data-reveal>
                      {a.photo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={fileUrl(a, a.photo, "400x400")} alt={a.name} width={96} height={96} className="size-24 shrink-0 object-cover" />
                      )}
                      <div>
                        <p className="wide text-[1.375rem] font-bold tracking-[-0.02em]">{a.name}</p>
                        {a.bio && <p className="mt-2 leading-[1.6]">{a.bio}</p>}
                        {a.website && (
                          <a href={a.website} target="_blank" rel="noreferrer" className="link mt-3 inline-block font-semibold">
                            Website
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        <section id="join" aria-labelledby="join-title" className="relative scroll-mt-16 overflow-hidden bg-char py-[clamp(4rem,9vw,7rem)] text-cream">
          {bandPattern && <Pattern id="p-join" kind={bandPattern} color="var(--char-2)" />}
          <div className="relative mx-auto max-w-[1400px] px-4 sm:px-8">
            <h2 id="join-title" className="wide text-[clamp(2rem,4vw,3.25rem)] font-bold tracking-[-0.03em]">
              Join the reader list
            </h2>
            <p className="t-lead mt-4 max-w-[44ch]">New books, first chapters and news, straight from {name}. No spam, and you can leave any time.</p>
            <div className="max-w-[40rem]">
              <SubscribeForm source="author-site" site={sub} tone="dark" done="You are on the list. Thank you for reading." />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter name={name} email={site.email} blurb={site.intro || undefined} studioUrl={`https://${rootDomain()}`} />
    </>
  );
}
