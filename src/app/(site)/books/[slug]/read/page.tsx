import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBookBySlug, getSampleChapter, getSite } from "@/lib/pb-server";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { orderedElements } from "@/lib/book-model";
import { elementHtml } from "@/lib/render-element";
import { themeCss } from "@/lib/theme-css";
import { getTheme, THEME_FONTS_HREF } from "@/lib/themes";
import { bookFormat } from "@/lib/types";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const book = await getBookBySlug((await params).slug);
  return { title: book ? `Read a sample of ${book.title}` : "Sample not found" };
}

export default async function ReadSample({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [site, book] = await Promise.all([getSite(), getBookBySlug(slug)]);
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
      <div className="px-4 sm:px-8 lg:px-14">
        <SiteHeader name={name} />
      </div>
      <main className="px-4 pb-16 sm:px-8">
        <p className="t-small mx-auto max-w-[36rem] pt-10 text-soft">
          A free sample of{" "}
          <Link href={`/books/${book.slug}`} className="link text-ink">
            {book.title}
          </Link>
        </p>
        {chapter ? (
          <article className="reader mx-auto mt-10 max-w-[36rem] bg-card px-6 py-14 text-[#1d1a17] sm:px-14" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <p className="mx-auto mt-10 max-w-[36rem]">There is no sample for this book yet.</p>
        )}
        <div className="mx-auto mt-12 flex max-w-[36rem] flex-wrap gap-3">
          {links[0] && (
            <a href={links[0].url} target="_blank" rel="noreferrer" className="btn">
              Keep reading: buy on {links[0].label || "Amazon"}
            </a>
          )}
          <Link href={`/books/${book.slug}`} className="btn btn-quiet">
            About the book
          </Link>
        </div>
      </main>
      <SiteFooter name={name} email={site?.email} />
    </>
  );
}
