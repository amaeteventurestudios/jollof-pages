import Link from "next/link";
import { getPublishedBooks, getSite } from "@/lib/pb-server";
import { isUpcoming, toStageBook, year } from "@/lib/site-data";
import { StageProvider, Stage } from "@/components/site/stage";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SpineCalculator } from "@/components/site/spine-calculator";
import { SubscribeForm } from "@/components/site/subscribe-form";
import { BookCover } from "@/components/book-cover";
import { fileUrl } from "@/lib/pb";
import { bookFormat, type Book } from "@/lib/types";
import { getTrim } from "@/lib/kdp";

export const revalidate = 60;

const DEFAULT_INTRO =
  "Jollof Pages publishes practical non-fiction. Every book is written, typeset and made ready for print in our own studio, then sent out to the shops where you already buy books.";

const DEFAULT_LETTER = `I write non-fiction: books meant to be used, not just read.

For years the hard part was never the writing. It was everything after it: wrestling a manuscript into print margins, rebuilding the ebook, paying for software that did half the job.

So I built Jollof Pages. It is a publisher, and it is the studio where the books are made. Every title here was drafted, formatted and checked in it before it went to Amazon and the other stores.

Like the dish it is named after, a good book takes one pot, patience and heat at the bottom. I would rather publish a few books that work than many that fill a shelf.

If one of them helps you, tell me. That is the whole point.`;

function paragraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export default async function Home() {
  const [site, books] = await Promise.all([getSite(), getPublishedBooks()]);
  const name = site?.publisher_name || "Jollof Pages";
  const stageBooks = books.map(toStageBook);
  const lead = books.find((b) => b.id === site?.hero_book) ?? books.find((b) => b.featured) ?? books[0];
  const available = books.filter((b) => !isUpcoming(b));
  const upcoming = books.filter(isUpcoming);
  const covers = books.filter((b) => b.cover);

  return (
    <StageProvider books={stageBooks}>
      <div className="lg:grid lg:grid-cols-2">
        {/* the fixed half: the book itself, at its real proportions */}
        {stageBooks.length > 0 && (
          <div className="sticky top-0 z-0 hidden h-svh p-3 pl-1.5 lg:order-2 lg:block">
            <Stage books={stageBooks} className="h-full" />
          </div>
        )}

        <main className="relative z-10 bg-paper px-4 sm:px-8 lg:order-1 lg:px-14 xl:px-18">
          <SiteHeader name={name} />

          <section aria-labelledby="hero-title" className="flex flex-col justify-center py-12 sm:py-16 lg:min-h-[calc(88svh-88px)]" data-stage={lead?.id}>
            <h1 id="hero-title" className="t-display max-w-[14ch] text-primary" data-rise style={{ ["--i" as string]: 0 }}>
              {site?.tagline || "Useful books, slowly cooked."}
            </h1>
            <p className="t-lead mt-8 max-w-[40ch]" data-rise style={{ ["--i" as string]: 1 }}>
              {site?.intro || DEFAULT_INTRO}
            </p>
            <div className="mt-10 flex flex-wrap gap-3" data-rise style={{ ["--i" as string]: 2 }}>
              <a href="#list" className="btn">
                See the books
              </a>
              {lead && (
                <Link href={`/books/${lead.slug}`} className="btn btn-quiet">
                  Start with {lead.title}
                </Link>
              )}
            </div>
          </section>

          {/* on a phone the stage sits under the hero instead of beside it */}
          {stageBooks.length > 0 && (
            <div className="-mx-4 h-[64svh] sm:-mx-8 lg:hidden">
              <Stage books={stageBooks} className="h-full" />
            </div>
          )}

          {/* the list, set like a printed menu sheet */}
          <section id="list" aria-labelledby="list-title" className="scroll-mt-6 py-[clamp(4rem,10vw,9rem)]">
            <div className="sheet mx-auto max-w-[640px] bg-card px-6 py-14 sm:px-14 sm:py-16">
              <h2 id="list-title" className="t-head text-center" data-reveal>
                The list
              </h2>
              <p className="t-small mt-3 text-center text-soft" data-reveal style={{ ["--i" as string]: 1 }}>
                Practical non-fiction, in paperback and ebook
              </p>
              {books.length === 0 ? (
                <p className="mt-12 text-center">The first books are in the pot. Join the reader list below to hear the day they are ready.</p>
              ) : (
                <>
                  <ListGroup title="Available now" books={available} />
                  {upcoming.length > 0 && <ListGroup title="Coming soon" books={upcoming} />}
                </>
              )}
              <p className="t-small mt-14 text-center text-soft">
                New books reach the reader list first.
                <br />
                Every title is also on Amazon.
              </p>
            </div>
          </section>

          {lead && <Showcase book={lead} />}

          <section id="studio" aria-labelledby="studio-title" className="scroll-mt-6 py-[clamp(4rem,10vw,9rem)]">
            <h2 id="studio-title" className="t-head max-w-[12ch]" data-reveal>
              Made in our own studio
            </h2>
            <p className="mt-6 max-w-[40ch]" data-reveal style={{ ["--i" as string]: 1 }}>
              We built the tool we write in. It knows Amazon&apos;s print rules, so a manuscript becomes a paperback and an ebook without leaving the kitchen. Try it: set a page count and watch the book change thickness.
            </p>
            <SpineCalculator trim={lead ? bookFormat(lead).trim : "6x9"} />
            <div className="mt-16 max-w-[480px]">
              <Slip />
            </div>
          </section>

          <section id="about" aria-label="A letter from the publisher" className="scroll-mt-6 py-[clamp(5rem,12vw,10rem)]">
            <div className="mx-auto max-w-[520px]" data-reveal>
              {lead?.expand?.author?.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fileUrl(lead.expand.author, lead.expand.author.photo, "400x400")} alt="" width={44} height={44} className="size-11 rounded-full object-cover" />
              ) : null}
              <div className="mt-7 grid gap-[1.55em] leading-[1.55]">
                {paragraphs(site?.about || DEFAULT_LETTER).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <p className="mt-10 text-[1.375rem] italic">{site?.about ? name : "Amaete Umanah"}</p>
              <p className="t-small text-soft">Publisher, {name}</p>
            </div>
          </section>
        </main>
      </div>

      {/* breaks the split: every cover at once, with the reader list on top */}
      <section id="reader-list" aria-labelledby="rl-title" className="relative z-10 scroll-mt-6 bg-ink">
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6" aria-hidden={covers.length > 0}>
          {(covers.length ? Array.from({ length: 12 }, (_, i) => covers[i % covers.length]) : []).map((b, i) => (
            <div key={i} className="aspect-[2/3] overflow-hidden">
              <BookCover book={b} thumb="480x0" className="h-full" />
            </div>
          ))}
        </div>
        <div className="relative -mt-20 px-4 pb-4 sm:absolute sm:top-[60px] sm:right-[60px] sm:mt-0 sm:w-[380px] sm:p-0">
          <div className="bg-paper p-8">
            <h2 id="rl-title" className="text-[1.75rem] leading-tight tracking-[-0.02em]">
              The reader list
            </h2>
            <p className="mt-3">One email when a new book is out, sometimes a free chapter before it is. Nothing else.</p>
            <SubscribeForm source="home" />
            {site?.email && (
              <p className="t-small mt-6 text-soft">
                Bookshops and press:{" "}
                <a href={`mailto:${site.email}`} className="link text-ink">
                  {site.email}
                </a>
              </p>
            )}
          </div>
        </div>
      </section>

      <SiteFooter name={name} email={site?.email} />
    </StageProvider>
  );
}

function ListGroup({ title, books }: { title: string; books: Book[] }) {
  if (!books.length) return null;
  return (
    <div className="mt-14">
      <h3 className="text-center text-[1.375rem]" data-reveal>
        {title}
      </h3>
      <ul className="mx-auto mt-6 grid max-w-[420px] gap-4">
        {books.map((b, i) => (
          <li key={b.id} data-stage={b.id} data-reveal style={{ ["--i" as string]: i }}>
            <Link href={`/books/${b.slug}`} className="group block">
              <span className="flex items-baseline justify-between gap-4">
                <span className="link group-hover:text-primary">{b.title}</span>
                <span className="tabular shrink-0">{isUpcoming(b) ? year(b.publication_date) || "Soon" : `${getTrim(bookFormat(b).trim).width} × ${getTrim(bookFormat(b).trim).height}`}</span>
              </span>
              {b.subtitle && <span className="t-small mt-0.5 block text-soft">{b.subtitle}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Showcase({ book }: { book: Book }) {
  const buy = (book.buy_links ?? []).filter((l) => l.url)[0];
  return (
    <section aria-labelledby="showcase-title" data-stage={book.id} className="grid min-h-[88svh] items-center gap-10 py-[clamp(4rem,10vw,9rem)] xl:grid-cols-2">
      <div className="flex aspect-square items-center justify-center bg-paper-2 p-[14%]" data-reveal>
        <div className="w-[62%]">
          <BookCover book={book} thumb="960x0" sizes="(min-width: 1280px) 220px, 50vw" />
        </div>
      </div>
      <div className="flex h-full flex-col justify-between gap-10">
        <p className="text-[1.125rem]" data-reveal>
          Paperback and ebook{book.expand?.author?.name ? `, by ${book.expand.author.name}` : ""}
        </p>
        <div data-reveal style={{ ["--i" as string]: 1 }}>
          <h2 id="showcase-title" className="text-[clamp(2rem,2.6vw,2.5rem)] leading-[1.05] font-semibold tracking-[-0.02em]">
            {book.title}
          </h2>
          <p className="mt-12 max-w-[34ch]">{book.pitch || book.subtitle || book.description.split(/\n/)[0]}</p>
        </div>
        <div className="grid grid-cols-2" data-reveal style={{ ["--i" as string]: 2 }}>
          <Link href={`/books/${book.slug}/read`} className="flex h-[72px] items-center justify-center bg-ink px-3 text-center font-semibold text-paper transition-colors hover:bg-black">
            Read a sample
          </Link>
          {buy ? (
            <a href={buy.url} target="_blank" rel="noreferrer" className="flex h-[72px] items-center justify-center bg-paper-2 px-3 text-center font-semibold transition-colors hover:bg-paper-3">
              Buy on {buy.label || "Amazon"}
            </a>
          ) : (
            <Link href={`/books/${book.slug}`} className="flex h-[72px] items-center justify-center bg-paper-2 px-3 text-center font-semibold transition-colors hover:bg-paper-3">
              About the book
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

const SLIP: { group: string; rows: [string, string][] }[] = [
  { group: "Writing", rows: [["Drafted chapter by chapter", "in the studio"], ["Daily word goal and sprints", "500 words"], ["Word manuscripts imported", ".docx"]] },
  { group: "Formatting", rows: [["Typeset for print with Typst", "6 × 9 in"], ["Gutter set from the page count", "0.375–0.875 in"], ["Ebook built and validated", "EPUBCheck"]] },
  { group: "Publishing", rows: [["Full cover with spine and bleed", "300 dpi"], ["Uploaded to Amazon KDP", "by hand"]] },
];

function Slip() {
  return (
    <div className="slip bg-card px-5 pt-8 pb-12 text-[0.9375rem] sm:px-8 sm:text-[1rem]" data-reveal style={{ ["--i" as string]: 2 }}>
      {SLIP.map((g) => (
        <div key={g.group} className="mt-7 first:mt-0">
          <h3 className="font-semibold">{g.group}</h3>
          <ul className="mt-2 grid gap-2">
            {g.rows.map(([what, value]) => (
              <li key={what} className="flex items-end">
                <span>{what}</span>
                <span className="leader" aria-hidden />
                <span className="tabular shrink-0 text-right">{value}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="mt-8 flex h-11 items-center justify-between bg-ink px-3 text-paper">
        <span>In your hands</span>
        <span>paperback and ebook</span>
      </p>
    </div>
  );
}
