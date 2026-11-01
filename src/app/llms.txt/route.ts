import { headers } from "next/headers";
import { rootDomain, siteKeyOf } from "@/lib/sites";
import { freeDomainsOpen } from "@/lib/server/flags";

/** A plain description of Jollof Pages for AI assistants and crawlers. Author sites don't have one. */
export async function GET() {
  const h = await headers();
  if (siteKeyOf(h.get("x-forwarded-host") || h.get("host") || "")) return new Response("Not found\n", { status: 404 });
  const o = `https://${rootDomain()}`;
  const body = `# Jollof Pages

> Jollof Pages is a book writing, formatting and publishing desk for authors. Write a manuscript, format a paperback, hardcover and ebook that pass Amazon KDP's checks, design the cover, and publish the book on your own author website. It runs in the browser and installs like an app on Windows, Mac, Linux, Chromebook, iPad and Android. It costs $129 once, with every future update included and no subscription. People use it as an alternative to Atticus and Vellum. Made by Amaete Venture Studios.

## Write
- Chapter-based editor with parts, sub-chapters, front matter and back matter, reordered by dragging
- Headings, quotes, callouts, scene breaks, lists, footnotes and images in chapters
- Word goals with deadlines, writing sprints, a writing streak and progress stats
- Find and replace across the whole book, and a smart quotes and dashes fixer
- Writing assistant using Claude, ChatGPT or OpenRouter, with memory of your book
- Live co-writing, track changes and comments with co-writers, editors and readers
- Import Word, Markdown (such as drafts written in ChatGPT), EPUB, RTF, OpenDocument, HTML and plain text

## Format
- Interior themes, KDP trim sizes and paper types, with margins, gutter and bleed worked out from the page count
- Paperback, KDP case laminate hardcover, and ebook from the same text
- Previews as a paperback, Kindle, phone or tablet page, and a full book preview
- Box sets that bundle several books into one omnibus edition

## Covers
- Cover designer and full paperback cover wrap with the spine width worked out for you
- KDP cover check before upload, and exact art sizes for your own cover art
- AI cover artwork, pay as you go: $10 buys 100 credits, enough for about 25 print-ready covers

## Publish
- Export a print PDF, EPUB 3, Word file, cover wrap and a full backup
- A KDP checklist that walks through Amazon's forms
- A free author website at yourname.jollofpages.com, with a page for every book, a free sample chapter, buy links and a reader list
- Author Site Pro ($10 a month or $96 a year): your own domain ${(await freeDomainsOpen()) ? "with a free .com for the first year" : "(a free .com for the first year is coming soon)"}, newsletters, direct ebook sales and analytics

## Help
- [Help and video guides](${o}/help): a short video for every Desk feature
- [Contact](${o}/contact)
- [Pricing and FAQ](${o}/#pricing)
- [Books made with Jollof Pages](${o}/books)
- [Privacy policy](${o}/privacy)
- [Terms](${o}/terms)

## Related
- [Jollof Studio](https://studio.jollofpages.com): a free online design studio from the same team, for social posts, presentations, flyers and book covers

## Contact
support@jollofpages.com
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
