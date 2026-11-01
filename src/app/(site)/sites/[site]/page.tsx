import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getAuthors, getPublishedBooks, pausedSiteName, resolveSite } from "@/lib/pb-server";
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
import { patternOf, templateOf, type SiteDesign, type TemplateId } from "@/lib/site-design";
import type { Author, Book, SiteSettings } from "@/lib/types";
import { SiteDesignStyle } from "@/components/site/site-design-style";

export const revalidate = 60;

type Params = Promise<{ site: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const key = (await params).site;
  const site = await resolveSite(key);
  if (!site) {
    const resting = await pausedSiteName(key);
    return resting ? { title: resting, robots: { index: false } } : { title: "Site not found" };
  }
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
  if (!site) {
    const resting = await pausedSiteName(sub);
    if (resting) return <Resting name={resting} />;
    notFound();
  }
  const design = previewDesign((await searchParams).preview) ?? site.design;
  const template = templateOf(design);
  const [books, authors] = await Promise.all([getPublishedBooks(site.owner), getAuthors(site.owner)]);
  const name = site.publisher_name || sub;
  const lead = books.find((b) => b.id === site.hero_book) ?? books.find((b) => b.featured) ?? books[0];
  const people = authors.filter((a) => books.some((b) => b.author === a.id) && (a.bio || a.photo));
  const letter = (site.about || "").split(/\n{2,}/).filter(Boolean);
  const ctx: Ctx = { site, name, sub, books, lead, people, letter, design, template };

  return (
    <>
      <SiteDesignStyle design={design} />
      <SiteHeader name={name} overHero author />
      {template === "spotlight" ? <SpotlightHero {...ctx} /> : template === "shelf" || template === "letter" ? <ShortHero {...ctx} /> : <ClassicHero {...ctx} />}
      <main>
        {template === "letter" ? (
          <>
            <AboutSection {...ctx} first />
            <BooksSection {...ctx} list />
          </>
        ) : template === "spotlight" ? (
          <>
            <BooksSection {...ctx} skipLead title="More books" />
            <AboutSection {...ctx} />
          </>
        ) : template === "shelf" ? (
          <>
            <BooksSection {...ctx} big />
            <AboutSection {...ctx} />
          </>
        ) : (
          <>
            <BooksSection {...ctx} />
            <AboutSection {...ctx} />
          </>
        )}
        <JoinSection {...ctx} />
      </main>
      <SiteFooter name={name} email={site.email} blurb={site.intro || undefined} studioUrl={`https://${rootDomain()}`} />
    </>
  );
}

interface Ctx {
  site: SiteSettings;
  name: string;
  sub: string;
  books: Book[];
  lead?: Book;
  people: Author[];
  letter: string[];
  design: SiteDesign | null | undefined;
  template: TemplateId;
}

/** Shown while the author has turned their site off. */
function Resting({ name }: { name: string }) {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-ground px-6 text-center">
      <div className="max-w-[36rem]">
        <h1 className="wide text-[clamp(2rem,5vw,3.5rem)] font-bold tracking-[-0.03em]">{name}</h1>
        <p className="t-lead mt-5">This website is resting for now. Please come back soon.</p>
      </div>
    </main>
  );
}

function HeroButtons({ books }: { books: Book[] }) {
  return (
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
  );
}

/** Classic: the name large, the lead book turning in 3D beside it. */
function ClassicHero({ site, name, books, lead, design }: Ctx) {
  const heroPattern = patternOf(design, "adire");
  return (
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
          <HeroButtons books={books} />
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
  );
}

/** Spotlight: one book, its cover, its description and a way to get it. */
function SpotlightHero({ site, name, books, lead, design }: Ctx) {
  const heroPattern = patternOf(design, "adire");
  if (!lead) return <ClassicHero {...{ site, name, books, lead, design, sub: "", people: [], letter: [], template: "classic" }} />;
  const blurb = (lead.description || lead.pitch || "").split(/\n{2,}/).filter(Boolean).slice(0, 2);
  return (
    <section aria-labelledby="author-title" className="relative overflow-hidden bg-jollof pt-[72px] text-cream">
      {heroPattern && <Pattern id="p-author" kind={heroPattern} color="var(--char)" opacity={0.14} />}
      <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-4 pt-12 pb-24 sm:px-8 sm:pt-16 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:pb-28">
        <Link href={`/books/${lead.slug}`} className="mx-auto block w-full max-w-[340px] shadow-[0_40px_60px_-30px_rgba(0,0,0,0.6)]" aria-label={`${lead.title}, open the book`} data-rise>
          <BookCover book={lead} thumb="800x0" sizes="340px" />
        </Link>
        <div>
          <p className="font-semibold tracking-wide text-bonnet uppercase" data-rise>
            {isUpcoming(lead) ? `Coming ${year(lead.publication_date)}` : `New from ${name}`}
          </p>
          <h1 id="author-title" className="t-display wide mt-3 font-bold">
            <Lines lines={[lead.title]} />
          </h1>
          {lead.subtitle && (
            <p className="t-lead mt-4 max-w-[34ch] font-semibold" data-rise style={{ ["--i" as string]: 1 }}>
              {lead.subtitle}
            </p>
          )}
          <div className="mt-5 grid max-w-[56ch] gap-3 text-[1.0625rem] text-cream/90" data-rise style={{ ["--i" as string]: 2 }}>
            {(blurb.length ? blurb : [site.intro].filter(Boolean)).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className="mt-9 flex flex-wrap gap-3" data-rise style={{ ["--i" as string]: 3 }}>
            <Link href={`/books/${lead.slug}`} className="btn">
              Get the book <ArrowRight className="size-5" aria-hidden />
            </Link>
            <a href="#join" className="btn btn-ghost">
              Join the reader list
            </a>
          </div>
        </div>
      </div>
      <Rim color="var(--ground)" />
    </section>
  );
}

/** Bookshelf and Letter: a short band with the name and headline, so what follows comes first. */
function ShortHero({ site, name, books, design }: Ctx) {
  const heroPattern = patternOf(design, "adire");
  return (
    <section aria-labelledby="author-title" className="relative overflow-hidden bg-jollof pt-[72px] text-cream">
      {heroPattern && <Pattern id="p-author" kind={heroPattern} color="var(--char)" opacity={0.16} />}
      <div className="relative mx-auto max-w-[1400px] px-4 pt-10 pb-16 sm:px-8 sm:pt-14 sm:pb-20">
        <h1 id="author-title" className="wide text-[clamp(2.5rem,6vw,4.75rem)] leading-[0.95] font-bold tracking-[-0.03em]">
          <Lines lines={[name]} />
        </h1>
        {site.tagline && (
          <p className="t-lead mt-4 max-w-[40ch] font-semibold" data-rise style={{ ["--i" as string]: 1 }}>
            {site.tagline}
          </p>
        )}
        {site.intro && (
          <p className="mt-3 max-w-[60ch] text-[1.0625rem] text-cream/90" data-rise style={{ ["--i" as string]: 2 }}>
            {site.intro}
          </p>
        )}
        {books.length === 0 && <HeroButtons books={books} />}
      </div>
      <Rim color="var(--ground)" />
    </section>
  );
}

function BooksSection({ books, lead, list = false, big = false, skipLead = false, title = "Books" }: Ctx & { list?: boolean; big?: boolean; skipLead?: boolean; title?: string }) {
  const shown = skipLead && lead ? books.filter((b) => b.id !== lead.id) : books;
  if (skipLead && shown.length === 0) return null;
  return (
    <section id="books" aria-labelledby="books-title" className="relative scroll-mt-16 overflow-hidden bg-ground py-[clamp(4rem,9vw,7rem)]">
      <Pattern id="p-author-rice" kind="rice" color="var(--ground-2)" />
      <div className="relative mx-auto max-w-[1400px] px-4 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="books-title" className="wide text-[clamp(2rem,4vw,3.25rem)] font-bold tracking-[-0.03em]">
            {title}
          </h2>
          {books.length > 1 && (
            <Link href="/books" className="link font-semibold">
              See them on the shelf
            </Link>
          )}
        </div>
        {shown.length === 0 ? (
          <p className="t-lead mt-8 max-w-[40ch]">The first book is on its way. Join the reader list below to hear the day it is out.</p>
        ) : list ? (
          <ul className="mt-10 grid max-w-[60rem] gap-8">
            {shown.map((b) => (
              <li key={b.id} data-reveal>
                <Link href={`/books/${b.slug}`} className="group grid grid-cols-[96px_1fr] items-start gap-6 border-t-4 border-char pt-6 sm:grid-cols-[120px_1fr]">
                  <div className="shadow-[0_18px_30px_-20px_rgba(58,20,10,0.55)]">
                    <BookCover book={b} thumb="480x0" sizes="120px" />
                  </div>
                  <div>
                    <h3 className="wide text-[1.5rem] leading-tight font-bold tracking-[-0.03em] transition-colors group-hover:text-jollof">{b.title}</h3>
                    {b.subtitle && <p className="mt-1 text-on-ground/75">{b.subtitle}</p>}
                    {b.pitch && <p className="mt-3 max-w-[60ch] leading-[1.6]">{b.pitch}</p>}
                    <p className="mt-3 font-semibold text-jollof">{isUpcoming(b) ? `Coming ${year(b.publication_date)}` : "Read more"}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <ul className={big ? "mt-10 grid grid-cols-2 gap-x-8 gap-y-14 md:grid-cols-3" : "mt-10 grid grid-cols-2 gap-x-6 gap-y-14 sm:grid-cols-3 lg:grid-cols-4"}>
            {shown.map((b, i) => (
              <li key={b.id} className="shelf-item" data-reveal style={{ ["--i" as string]: i % 4 }}>
                <Link href={`/books/${b.slug}`} className="group block">
                  <div className="shadow-[0_24px_40px_-24px_rgba(58,20,10,0.55)] transition-transform duration-500 group-hover:-translate-y-2 group-hover:-rotate-[1.5deg]">
                    <BookCover book={b} thumb={big ? "800x0" : "480x0"} sizes={big ? "(min-width: 768px) 33vw, 50vw" : "(min-width: 1024px) 25vw, 50vw"} />
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
  );
}

function AboutSection({ letter, people, first = false }: Ctx & { first?: boolean }) {
  if (letter.length === 0 && people.length === 0) return null;
  return (
    <section id="about" aria-labelledby="about-title" className={`relative scroll-mt-16 py-[clamp(4rem,9vw,7rem)] ${first ? "bg-ground" : "bg-ground-2"}`}>
      <div className="mx-auto grid max-w-[1400px] gap-12 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h2 id="about-title" className="wide text-[clamp(2rem,4vw,3.25rem)] font-bold tracking-[-0.03em]">
            {first ? "A note to readers" : "About"}
          </h2>
          <div className={`mt-8 grid max-w-[60ch] gap-[1.1em] leading-[1.65] ${first ? "text-[1.25rem]" : "text-[1.125rem]"}`}>
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
  );
}

function JoinSection({ name, sub, design }: Ctx) {
  const bandPattern = patternOf(design, "wax");
  return (
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
  );
}
