import type { Metadata } from "next";
import { adminPb } from "@/lib/server/credits";
import { downloadUrl, MAX_DOWNLOADS, recordSale } from "@/lib/server/ebooks";
import { getCheckout } from "@/lib/server/stripe";
import { mailConfigured } from "@/lib/server/mail";
import type { Book } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your ebook", robots: { index: false } };

/** Where Stripe sends a reader after buying an ebook direct: the download, straight away. */
export default async function DownloadPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const s = (await searchParams).s || "";
  let title = "";
  let link = "";
  let problem = "";
  try {
    if (!s.startsWith("cs_")) throw new Error("This page needs the link from your payment.");
    const session = await getCheckout(s);
    if (session.payment_status !== "paid") throw new Error("Your payment has not gone through yet. Refresh this page in a minute.");
    const order = await recordSale(session);
    if (!order) throw new Error("We could not find this purchase.");
    const pb = await adminPb();
    title = (await pb.collection("books").getOne<Book>(order.book).catch(() => null))?.title ?? "your ebook";
    link = downloadUrl(order.token);
  } catch (e) {
    problem = e instanceof Error ? e.message : String(e);
  }
  return (
    <main className="grid min-h-screen place-items-center bg-paper p-6">
      <div className="w-full max-w-lg">
        {problem ? (
          <>
            <h1 className="text-3xl tracking-tight">Almost there</h1>
            <p className="mt-4 text-lg text-soft">{problem}</p>
          </>
        ) : (
          <>
            <h1 className="text-3xl tracking-tight">Thank you</h1>
            <p className="mt-4 text-lg">Your copy of <strong>{title}</strong> is ready.</p>
            <a href={link} className="mt-8 inline-flex h-12 items-center rounded-md bg-primary px-6 font-medium text-primary-foreground">
              Download the ebook
            </a>
            <p className="mt-6 text-soft">
              The link works {MAX_DOWNLOADS} times{mailConfigured() ? " and we have emailed it to you too" : ", so bookmark this page"}. The EPUB opens in Apple Books, Google Play Books, Kobo and most reading apps; for a Kindle, use Amazon&apos;s Send to Kindle.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
