import { NextResponse } from "next/server";
import { adminPb } from "@/lib/server/credits";
import { getBilling, proAvailable } from "@/lib/server/pro";
import { createEbookCheckout } from "@/lib/server/stripe";
import { hasPro, rootDomain, siteUrl } from "@/lib/sites";
import type { Book, SiteSettings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { bookId } from a book page → { url } of Stripe Checkout; the author is paid directly. */
export async function POST(req: Request) {
  if (!proAvailable()) return NextResponse.json({ error: "Direct sales are not open yet." }, { status: 503 });
  const { bookId } = (await req.json().catch(() => ({}))) as { bookId?: string };
  try {
    const pb = await adminPb();
    const book = await pb.collection("books").getOne<Book>(String(bookId ?? "")).catch(() => null);
    if (!book?.published || !book.sell_direct || !book.ebook_file || !(book.ebook_price_cents! >= 100)) return NextResponse.json({ error: "This ebook is not for sale here." }, { status: 404 });
    const [site, billing] = await Promise.all([
      pb
        .collection("site_settings")
        .getFirstListItem<SiteSettings>(pb.filter("owner = {:o}", { o: book.owner }))
        .catch(() => null),
      getBilling(book.owner),
    ]);
    if (!hasPro(site) || !billing?.payouts_ready || !billing.payout_account) return NextResponse.json({ error: "This ebook is not for sale here right now." }, { status: 409 });
    const back = `${siteUrl(site, { protocol: "https:", host: rootDomain() })}/books/${book.slug}`;
    const session = await createEbookCheckout({
      book: { id: book.id, title: book.title, owner: book.owner },
      priceCents: book.ebook_price_cents!,
      account: billing.payout_account,
      successUrl: `https://${rootDomain()}/download?s={CHECKOUT_SESSION_ID}`,
      cancelUrl: back,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
