import Link from "next/link";
import { getPublishedBooks, getSite } from "@/lib/pb-server";
import { isUpcoming, toStageBook, year } from "@/lib/site-data";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SpineCalculator } from "@/components/site/spine-calculator";
import { SubscribeForm } from "@/components/site/subscribe-form";
import { BookRows, type BookRow } from "@/components/site/book-rows";
import { Pattern, Rim } from "@/components/site/patterns";
import { Lines } from "@/components/site/lines";
import { Marquee } from "@/components/site/marquee";
import { Shelf } from "@/components/site/shelf";
import { Intro } from "@/components/site/intro";
import { BookCover } from "@/components/book-cover";
import { fileUrl } from "@/lib/pb";
import { bookFormat, type Book } from "@/lib/types";
import { getTrim } from "@/lib/kdp";

export const revalidate = 60;

const DEFAULT_INTRO = "Jollof Pages publishes practical non-fiction. Every book is written, typeset and made ready for print in our own studio, then sent to the shops where you already buy books.";

const DEFAULT_LETTER = `We publish non-fiction: books meant to be used, not just read.

For years the hard part was never the writing. It was everything after it: wrestling a manuscript into print margins, rebuilding the ebook, paying for software that did half the job.

So we built our own kitchen. Jollof Pages is a publisher, and it is the studio where the books are made. Every title here was drafted, formatted and checked in it before it went to Amazon and the other stores.

Like the dish we are named after, a good book takes one pot, patience and heat at the bottom. We would rather publish a few books that work than many that fill a shelf.

If one of them helps you, tell us. That is the whole point.`;

const STEPS = [
  {
    n: "01",
    title: "Write",
    body: "Chapter by chapter, with a daily word goal, sprints and Word import.",
  },
  {
    n: "02",
    title: "Typeset",
    body: "Print PDFs set with Typst. The gutter grows with the page count, the way KDP asks.",
  },
  {
    n: "03",
    title: "Package",
    body: "A validated EPUB, a full paperback cover with spine and bleed, at 300 dpi.",
  },
  {
    n: "04",
    title: "Publish",
    body: "Uploaded to Amazon by hand, then listed here with a free chapter to read.",
  },
];

function paragraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function toRow(b: Book): BookRow {
  const t = getTrim(bookFormat(b).trim);
  const sb = toStageBook(b);
  return {
    id: b.id,
    slug: b.slug,
    title: b.title,
    subtitle: b.subtitle,
    meta: isUpcoming(b) ? year(b.publication_date) || "Soon" : `${t.width} × ${t.height} in`,
    cover: sb.cover,
    accent: sb.accent,
  };
}

export default async function Home() {
  const [site, books] = await Promise.all([getSite(), getPublishedBooks()]);
  const name = site?.publisher_name || "Jollof Pages";
  const lead = books.find((b) => b.id === site?.hero_book) ?? books.find((b) => b.featured) ?? books[0];
  const leadStage = lead ? toStageBook(lead) : null;
  const stageBooks = books.map((b, i) => toStageBook(b, i));
  // the lead book has its own section, so the list holds the rest and nothing is shown twice
  const rest = books.filter((b) => b.id !== lead?.id);
  const available = rest.filter((b) => !isUpcoming(b));
  const upcoming = rest.filter(isUpcoming);
  const covers = books.filter((b) => b.cover);
  const letter = paragraphs(site?.about || DEFAULT_LETTER);

  return (
    <>
      <Intro name={name} />
      <SiteHeader name={name} overHero />

      {/* hero: the pot itself, red with adire circles */}
      <section aria-labelledby="hero-title" className="relative overflow-hidden bg-jollof pt-[72px] text-cream">
        <Pattern id="p-hero" kind="adire" color="var(--char)" opacity={0.22} />
        <div className="hero-box relative mx-auto flex max-w-[1600px] flex-col gap-12 px-4 pt-[clamp(3rem,10vh,8rem)] pb-16 sm:px-8 lg:gap-16 lg:pb-20">
          <h1 id="hero-title" className="hero-line wide font-bold">
            <Lines lines={[site?.tagline || "Useful books, slowly cooked."]} />
          </h1>
          <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,34rem)_1fr]">
            <div>
              <p className="t-lead max-w-[38ch] text-cream" data-rise style={{ ["--i" as string]: 2 }}>
                {site?.intro || DEFAULT_INTRO}
              </p>
              <div className="mt-8 flex flex-wrap gap-3" data-rise style={{ ["--i" as string]: 3 }}>
                <a href="#list" className="btn">
                  See the books
                  <Arrow />
                </a>
                {lead && (
                  <Link href={`/books/${lead.slug}/read`} className="btn btn-ghost">
                    Read a free chapter
                  </Link>
                )}
              </div>
            </div>
            {stageBooks.length > 0 && (
              <div className="relative min-w-0 lg:justify-self-end">
                <Shelf books={stageBooks} unit={54} />
                <div className="h-3 bg-char" aria-hidden />
              </div>
            )}
          </div>
        </div>
        <Rim color="var(--char)" />
      </section>

      <Marquee
        items={["Practical non-fiction", "Written in our own studio", "Paperback and ebook", "Slowly cooked"]}
        className="bg-char py-5 text-[clamp(1.25rem,1rem+1.2vw,2rem)] font-bold text-bonnet"
      />

      <main>
        {lead && <Showcase book={lead} />}

        {/* the list, on a scatter of rice */}
        {(books.length === 0 || rest.length > 0) && (
          <section id="list" aria-labelledby="list-title" className="relative scroll-mt-16 overflow-hidden bg-ground py-[clamp(5rem,12vw,10rem)]">
            <Pattern id="p-rice" kind="rice" color="var(--ground-2)" />
            <div className="relative mx-auto max-w-[1400px] px-4 sm:px-8">
              <div className="flex flex-wrap items-end justify-between gap-6">
                <h2 id="list-title" className="t-head wide font-bold" data-reveal>
                  The list
                </h2>
                <p className="max-w-[30ch] text-on-ground/80" data-reveal style={{ ["--i" as string]: 1 }}>
                  Practical non-fiction in paperback and ebook. Every title is also on Amazon.
                </p>
              </div>
              {books.length === 0 ? (
                <p className="mt-12 text-[1.25rem]">The first books are in the pot. Join the reader list to hear the day they are ready.</p>
              ) : (
                <>
                  <div className="mt-12">
                    <BookRows rows={available.map(toRow)} />
                  </div>
                  {upcoming.length > 0 && (
                    <>
                      <h3 className="wide mt-16 text-[1.5rem] font-bold" data-reveal>
                        Coming soon
                      </h3>
                      <div className="mt-6">
                        <BookRows rows={upcoming.map(toRow)} start={available.length + 1} />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {/* the studio, on a woven strip */}
        <section id="studio" aria-labelledby="studio-title" className="relative scroll-mt-16 overflow-hidden bg-bonnet py-[clamp(5rem,12vw,10rem)] text-char">
          <Pattern id="p-weave" kind="weave" color="var(--jollof)" opacity={0.16} />
          <div className="relative mx-auto max-w-[1400px] px-4 sm:px-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-end">
              <h2 id="studio-title" className="t-head wide font-bold" data-reveal>
                <span className="line">
                  <span>Made in our</span>
                </span>
                <span className="line">
                  <span>own kitchen</span>
                </span>
              </h2>
              <p className="max-w-[44ch] text-[1.125rem]" data-reveal style={{ ["--i" as string]: 1 }}>
                We built the tool we write in. It knows Amazon&apos;s print rules, so a manuscript becomes a paperback and an ebook without leaving the studio. Try it: slide the page count and watch
                the book change thickness.
              </p>
            </div>
            <div className="mt-12" data-reveal style={{ ["--i" as string]: 2 }}>
              <SpineCalculator book={leadStage} />
            </div>
            <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <li key={s.n} className="group bg-cream p-6 transition-transform duration-500 hover:-translate-y-1.5" data-reveal style={{ ["--i" as string]: i }}>
                  <span className="tabular text-jollof font-bold">{s.n}</span>
                  <h3 className="wide mt-6 text-[1.75rem] font-bold tracking-[-0.03em]">{s.title}</h3>
                  <p className="mt-2 text-char/85">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* the letter, on pepper seeds */}
        <section id="about" aria-label="A letter from the publisher" className="relative scroll-mt-16 overflow-hidden bg-ground py-[clamp(5rem,12vw,10rem)]">
          <Pattern id="p-pepper" kind="pepper" color="var(--jollof)" opacity={0.14} drift={false} />
          <div className="relative mx-auto grid max-w-[1400px] gap-12 px-4 sm:px-8 lg:grid-cols-[1fr_1.1fr]">
            <blockquote className="wide text-[clamp(1.5rem,1.1rem+1.6vw,2.25rem)] leading-[1.1] font-bold tracking-[-0.03em] text-jollof lg:sticky lg:top-28 lg:self-start" data-reveal>
              “A good book takes one pot, patience and heat at the bottom.”
            </blockquote>
            <div data-reveal style={{ ["--i" as string]: 1 }}>
              {lead?.expand?.author?.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fileUrl(lead.expand.author, lead.expand.author.photo, "400x400")} alt="" width={56} height={56} className="size-14 object-cover" />
              ) : null}
              <div className="mt-6 grid gap-[1.3em] text-[1.125rem] leading-[1.6]">
                {letter.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <p className="wide mt-10 text-[1.5rem] font-bold">{name}</p>
              <p className="text-on-ground/70">The publisher</p>
            </div>
          </div>
        </section>

        {/* every cover at once, with the reader list on top */}
        <section id="reader-list" aria-labelledby="rl-title" className="relative scroll-mt-16 overflow-hidden bg-char">
          {covers.length > 0 && (
            <div className="scroll-grow grid grid-cols-3 overflow-hidden sm:grid-cols-4 lg:grid-cols-6" aria-hidden>
              {mosaic(covers).map((b, i) => (
                <div key={i} className="relative aspect-[2/3] overflow-hidden">
                  {b ? (
                    <div className="scroll-rise h-full" style={{ animationDelay: `${(i % 3) * -0.2}s` }}>
                      <BookCover book={b} thumb="480x0" className="h-full" />
                    </div>
                  ) : (
                    <div className={TILE_TONES[i % TILE_TONES.length].bg}>
                      <Pattern id={`p-tile-${i}`} kind={TILE_TONES[i % TILE_TONES.length].kind} color={TILE_TONES[i % TILE_TONES.length].color} drift={false} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div
            className={
              covers.length ? "relative -mt-24 px-4 pb-6 sm:absolute sm:top-1/2 sm:left-1/2 sm:mt-0 sm:w-[min(560px,90vw)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:p-0" : "relative px-4 py-24"
            }
          >
            <div className="relative overflow-hidden bg-jollof p-8 text-cream sm:p-12">
              <Pattern id="p-rl" kind="adire" color="var(--char)" opacity={0.2} />
              <div className="relative">
                <h2 id="rl-title" className="wide text-[clamp(2rem,1.4rem+2vw,3rem)] leading-none font-bold tracking-[-0.04em]">
                  The reader list
                </h2>
                <p className="mt-4 text-[1.125rem]">One email when a new book is out, sometimes a free chapter before it is. Nothing else.</p>
                <SubscribeForm source="home" tone="dark" />
                {site?.email && (
                  <p className="t-small mt-6 text-cream/80">
                    Bookshops and press:{" "}
                    <a href={`mailto:${site.email}`} className="link text-cream">
                      {site.email}
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter name={name} email={site?.email} />
    </>
  );
}

/** Twelve tiles with each cover once, spread out, and woven pattern tiles between them. */
function mosaic(covers: Book[]): (Book | null)[] {
  const tiles: (Book | null)[] = Array(12).fill(null);
  const shown = covers.slice(0, 12);
  shown.forEach((b, i) => {
    tiles[Math.floor((i * 12) / shown.length + (12 / shown.length) * 0.4) % 12] = b;
  });
  return tiles;
}

const TILE_TONES = [
  {
    bg: "absolute inset-0 bg-bonnet",
    kind: "pepper" as const,
    color: "var(--jollof)",
  },
  {
    bg: "absolute inset-0 bg-jollof",
    kind: "adire" as const,
    color: "var(--char)",
  },
  {
    bg: "absolute inset-0 bg-cream",
    kind: "rice" as const,
    color: "var(--cream-2)",
  },
  {
    bg: "absolute inset-0 bg-char-2",
    kind: "wax" as const,
    color: "var(--char)",
  },
];

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" className="arrow size-5" aria-hidden>
      <path d="M4 12h15M13 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}

function Showcase({ book }: { book: Book }) {
  const buy = (book.buy_links ?? []).filter((l) => l.url)[0];
  return (
    <section aria-labelledby="showcase-title" className="relative overflow-hidden bg-char py-[clamp(5rem,12vw,10rem)] text-cream">
      <Pattern id="p-wax" kind="wax" color="var(--char-2)" />
      <div className="relative mx-auto grid max-w-[1400px] items-center gap-12 px-4 sm:px-8 lg:grid-cols-2">
        <div className="relative mx-auto w-[min(380px,72vw)]" data-reveal>
          <div className="absolute top-1/2 left-1/2 aspect-square w-[150%] -translate-x-1/2 -translate-y-1/2 bg-bonnet" aria-hidden />
          <div className="scroll-turn relative">
            <BookCover book={book} thumb="960x0" sizes="(min-width: 1024px) 380px, 72vw" className="shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)]" />
          </div>
        </div>
        <div>
          <p className="font-semibold text-bonnet" data-reveal>
            Start here
            {book.expand?.author?.name ? `, by ${book.expand.author.name}` : ""}
          </p>
          <h2 id="showcase-title" className="t-head wide mt-4 font-bold" data-reveal style={{ ["--i" as string]: 1 }}>
            {book.title}
          </h2>
          <p className="mt-6 max-w-[40ch] text-[1.25rem] text-cream/90" data-reveal style={{ ["--i" as string]: 2 }}>
            {book.pitch || book.subtitle || book.description.split(/\n/)[0]}
          </p>
          <div className="mt-10 flex flex-wrap gap-3" data-reveal style={{ ["--i" as string]: 3 }}>
            <Link href={`/books/${book.slug}/read`} className="btn">
              Read a sample
              <Arrow />
            </Link>
            {buy ? (
              <a href={buy.url} target="_blank" rel="noreferrer" className="btn btn-ghost">
                Buy on {buy.label || "Amazon"}
              </a>
            ) : (
              <Link href={`/books/${book.slug}`} className="btn btn-ghost">
                About the book
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
