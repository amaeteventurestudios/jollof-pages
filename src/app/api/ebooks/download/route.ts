import { adminPb } from "@/lib/server/credits";
import { MAX_DOWNLOADS, type Order } from "@/lib/server/ebooks";
import { slugify } from "@/lib/slug";
import type { Book } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?t=<order token> streams the bought ebook, up to MAX_DOWNLOADS times. */
export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t") || "";
  if (!/^[a-f0-9]{48}$/.test(t)) return new Response("Unknown download link.", { status: 404 });
  const pb = await adminPb();
  const order = await pb
    .collection("orders")
    .getFirstListItem<Order>(pb.filter("token = {:t}", { t }))
    .catch(() => null);
  if (!order) return new Response("Unknown download link.", { status: 404 });
  if (order.downloads >= MAX_DOWNLOADS) return new Response("This link has been used too many times. Reply to your receipt email and the author will help.", { status: 410 });
  const book = await pb.collection("books").getOne<Book>(order.book).catch(() => null);
  if (!book?.ebook_file) return new Response("The file is not available. Reply to your receipt email and the author will help.", { status: 404 });
  const fileToken = await pb.files.getToken();
  const res = await fetch(pb.files.getURL(book, book.ebook_file, { token: fileToken }));
  if (!res.ok || !res.body) return new Response("Could not fetch the file. Try again in a minute.", { status: 502 });
  await pb.collection("orders").update(order.id, { "downloads+": 1 });
  const ext = book.ebook_file.split(".").pop() || "epub";
  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("content-type") || "application/epub+zip",
      "Content-Disposition": `attachment; filename="${slugify(book.title) || "ebook"}.${ext}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
