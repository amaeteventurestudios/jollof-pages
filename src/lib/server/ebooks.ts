import "server-only";
import { randomBytes } from "node:crypto";
import { adminPb } from "./credits";
import { count } from "./stats";
import { ebookFeeCents, type CheckoutSession } from "./stripe";
import { letterHtml, letterText, mailConfigured, sendMail } from "./mail";
import { rootDomain } from "../sites";
import type { Book, SiteSettings } from "../types";

export interface Order {
  id: string;
  owner: string;
  book: string;
  email: string;
  amount_cents: number;
  token: string;
  downloads: number;
  stripe_session: string;
}

export const MAX_DOWNLOADS = 10;

export function downloadUrl(token: string): string {
  return `https://${rootDomain()}/api/ebooks/download?t=${token}`;
}

/** Records a paid direct sale once, counts it and emails the reader their link. */
export async function recordSale(s: CheckoutSession): Promise<Order | null> {
  if (s.payment_status !== "paid" || s.metadata?.kind !== "ebook") return null;
  const pb = await adminPb();
  const existing = await pb
    .collection("orders")
    .getFirstListItem<Order>(pb.filter("stripe_session = {:s}", { s: s.id }))
    .catch(() => null);
  if (existing) return existing;
  const amount = s.amount_total ?? 0;
  let order: Order;
  try {
    order = await pb.collection("orders").create<Order>({
      owner: s.metadata.owner,
      book: s.metadata.book,
      email: s.customer_details?.email ?? "",
      amount_cents: amount,
      fee_cents: ebookFeeCents(amount),
      currency: s.currency ?? "usd",
      stripe_session: s.id,
      token: randomBytes(24).toString("hex"),
      downloads: 0,
    });
  } catch {
    // the webhook and the reader's return visit raced; the unique index kept one
    return pb.collection("orders").getFirstListItem<Order>(pb.filter("stripe_session = {:s}", { s: s.id }));
  }
  count(order.owner, "sale", order.book);
  count(order.owner, "revenue", "", amount);
  if (mailConfigured() && order.email) {
    const [book, site] = await Promise.all([
      pb.collection("books").getOne<Book>(order.book).catch(() => null),
      pb
        .collection("site_settings")
        .getFirstListItem<SiteSettings>(pb.filter("owner = {:o}", { o: order.owner }))
        .catch(() => null),
    ]);
    const name = site?.publisher_name || "Jollof Pages";
    const body = `Thank you for buying **${book?.title ?? "the ebook"}**.\n\nDownload it here: ${downloadUrl(order.token)}\n\nThe link works ${MAX_DOWNLOADS} times, so keep this email. The file is an EPUB, which opens in Apple Books, Google Play Books, Kobo and most reading apps. To read it on a Kindle, send it with Amazon's Send to Kindle.`;
    await sendMail({
      to: order.email,
      subject: `Your copy of ${book?.title ?? "the ebook"}`,
      html: letterHtml(body, { name, accent: site?.design?.palette?.hero, footer: `Sold by ${name} through Jollof Pages.` }),
      text: letterText(body),
      fromName: name,
      fromLocal: site?.subdomain,
      replyTo: site?.email || undefined,
    }).catch(() => undefined);
  }
  return order;
}
