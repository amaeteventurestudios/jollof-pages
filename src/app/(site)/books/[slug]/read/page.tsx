import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSampleChapter, getSiteBook } from "@/lib/pb-server";
import { rootDomain } from "@/lib/sites";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Pattern } from "@/components/site/patterns";
import { orderedElements } from "@/lib/book-model";
import { elementHtml } from "@/lib/render-element";
import { themeCss } from "@/lib/theme-css";
import { getTheme, THEME_FONTS_HREF } from "@/lib/themes";
import { bookFormat } from "@/lib/types";

export const revalidate = 60;

// also serves author sites through /sites/[site]/books/[slug]/read
type Params = Promise<{ slug: string; site?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, site: sub } = await params;
  const { book } = await getSiteBook(slug, sub);
  return { title: book ? `Read a sample of ${book.title}` : "Sample not found" };
}

export default async function ReadSample({ params }: { params: Params }) {
  const { slug, site: sub } = await params;
  const { site, book } = await getSiteBook(slug, sub);
  if (!book) notFound();
  const chapter = await getSampleChapter(book.id);
  const name = site?.publisher_name || "Jollof Pages";
  const f = bookFormat(book);
  const theme = getTheme(f.theme);
  const links = (book.buy_links ?? []).filter((l) => l.url);
  let html = "";
  if (chapter) {
    const el = orderedElements([chapter], theme)[0];
    // a lone chapter would always be numbered "One"; drop the number in the sample
    html = elementHtml({ ...el, label: "" }, { book, author: book.expand?.author ?? null, alsoBy: [] }, [el], theme);
  }
  return (
    <>
      <link rel="stylesheet" href={THEME_FONTS_HREF} />
      <style>{themeCss(theme, { scope: ".reader", dropCaps: f.dropCaps, lineHeight: 1.6 })}</style>
      <SiteHeader name={name} author={!!sub} />
      <main className="relative overflow-hidden bg-ground-2 px-4 pt-[72px] pb-24 sm:px-8">
        <Pattern id="p-read" kind="rice" color="var(--ground)" drift={false} />
        <div className="relative">
        <p className="mx-auto max-w-[38rem] pt-12 font-medium">
          A free sample of{" "}
          <Link href={`/books/${book.slug}`} className="link text-jollof">
            {book.title}
          </Link>
        </p>
        {chapter ? (
          <article className="reader mx-auto mt-6 max-w-[38rem] bg-white px-6 py-14 text-[#1d1a17] shadow-[0_30px_60px_-30px_rgba(58,20,10,0.45)] sm:px-14" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <p className="mx-auto mt-10 max-w-[38rem]">There is no sample for this book yet.</p>
        )}
        <div className="mx-auto mt-12 flex max-w-[38rem] flex-wrap gap-3">
          {links[0] && (
            <a href={links[0].url} target="_blank" rel="noreferrer" className="btn">
              Keep reading: buy on {links[0].label || "Amazon"}
            </a>
          )}
          <Link href={`/books/${book.slug}`} className="btn btn-ink">
            About the book
          </Link>
        </div>
        </div>
      </main>
      <SiteFooter name={name} email={site?.email} {...(sub ? { blurb: site?.intro || undefined, studioUrl: `https://${rootDomain()}` } : {})} />
    </>
  );
}
