import { NextResponse } from "next/server";
import { serverPb } from "@/lib/pb-server";
import { PB_URL } from "@/lib/pb";
import { bearer, loadExportInput } from "@/lib/server/load-book";
import { compileInterior } from "@/lib/server/typst-pdf";
import { slugify } from "@/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** POST { bookId, format?: "pdf" | "typ", binding?: "paperback" | "hardcover" } with the PocketBase token as Bearer auth. */
export async function POST(req: Request) {
  const token = bearer(req);
  if (!token) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { bookId, format, binding: asked } = (await req.json().catch(() => ({}))) as { bookId?: string; format?: string; binding?: string };
  const binding = asked === "hardcover" ? "hardcover" : "paperback";
  if (!bookId) return NextResponse.json({ error: "bookId is required" }, { status: 400 });
  const client = serverPb(token);
  let input;
  try {
    input = await loadExportInput(client, bookId);
  } catch {
    return NextResponse.json({ error: "Book not found or not yours." }, { status: 404 });
  }
  if (input.book.owner !== client.authStore.record?.id && !(await isOwner(client, input.book.owner))) {
    return NextResponse.json({ error: "Only the owner can export this book." }, { status: 403 });
  }
  const internal = (process.env.POCKETBASE_INTERNAL_URL || PB_URL).replace(/\/$/, "");
  try {
    const result = await compileInterior(input, async (src) => {
      // manuscript images live in PocketBase; fetch them over the internal address
      const url = src.startsWith(PB_URL) ? internal + src.slice(PB_URL.length) : src;
      if (!url.startsWith(internal)) return null;
      const res = await fetch(url, { headers: { Authorization: token } });
      if (!res.ok) return null;
      return { bytes: new Uint8Array(await res.arrayBuffer()), type: res.headers.get("content-type") || "image/jpeg" };
    }, binding);
    await client
      .collection("books")
      .update(bookId, binding === "hardcover" ? { hardcover_page_count: result.pages } : { page_count: result.pages })
      .catch(() => undefined);
    const name = slugify(input.book.title) + (binding === "hardcover" ? "-hardcover" : "");
    if (format === "typ")
      return new NextResponse(result.source, {
        headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.typ"`, "X-Page-Count": String(result.pages) },
      });
    return new NextResponse(result.pdf as BodyInit, {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${name}-interior.pdf"`, "X-Page-Count": String(result.pages) },
    });
  } catch (e) {
    const err = e as { stderr?: string; message?: string };
    return NextResponse.json({ error: "The PDF could not be built.", detail: (err.stderr || err.message || "").slice(0, 2000) }, { status: 500 });
  }
}

async function isOwner(client: ReturnType<typeof serverPb>, owner: string): Promise<boolean> {
  try {
    const auth = await client.collection("users").authRefresh();
    return auth.record.id === owner;
  } catch {
    return false;
  }
}
