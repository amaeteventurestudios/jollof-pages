import { NextResponse } from "next/server";
import { PB_URL, fileUrl } from "@/lib/pb";
import { serverPb } from "@/lib/pb-server";
import { creditsFor, generationFileName, type Quality, type Target } from "@/lib/cover-ai";
import { bearer } from "@/lib/server/load-book";
import { addLedger, adminConfigured, adminPb, balance, caller, isFree, withUserLock } from "@/lib/server/credits";
import { falConfigured, generateImages, mockImages, type GenerateInput } from "@/lib/server/fal";
import type { Book } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 200;

const ASPECTS = new Set(["2:3", "3:4", "4:5", "9:16", "1:1"]);
const HEX = /^#[0-9a-f]{6}$/i;

interface Body {
  bookId?: string;
  prompt?: string;
  target?: Target;
  quality?: Quality;
  aspect?: string;
  count?: number;
  /** a picture to match: a PocketBase file URL, such as the current front artwork or an earlier result */
  referenceUrl?: string;
  palette?: { bg?: string; fg?: string; accent?: string };
}

/** Fetches a picture from this site's PocketBase and inlines it, so fal.ai never needs to reach the server. */
async function inlineReference(url: string, token: string): Promise<string | null> {
  if (!url.startsWith(PB_URL + "/api/files/")) return null;
  const internal = (process.env.POCKETBASE_INTERNAL_URL || PB_URL).replace(/\/$/, "");
  const res = await fetch(internal + url.slice(PB_URL.length), { headers: { Authorization: token } });
  if (!res.ok) return null;
  const type = res.headers.get("content-type") || "image/png";
  if (!/^image\/(png|jpeg|webp)/.test(type)) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 15 * 1024 * 1024) return null;
  return `data:${type};base64,${buf.toString("base64")}`;
}

/** POST: makes 1–4 pictures for a book's cover, spending the writer's credits. */
export async function POST(req: Request) {
  const token = bearer(req);
  const me = await caller(token);
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: "AI covers are not set up on the server yet (PB_SUPERUSER_EMAIL / PB_SUPERUSER_PASSWORD)." }, { status: 503 });

  const b = (await req.json().catch(() => ({}))) as Body;
  const prompt = (b.prompt ?? "").trim();
  const target: Target = b.target === "back" ? "back" : "front";
  const quality: Quality = b.quality === "print" ? "print" : "draft";
  const aspect = ASPECTS.has(b.aspect ?? "") ? b.aspect! : "2:3";
  const count = Math.min(4, Math.max(1, Math.floor(Number(b.count) || 1)));
  if (!b.bookId) return NextResponse.json({ error: "bookId is required" }, { status: 400 });
  if (prompt.length < 10) return NextResponse.json({ error: "Describe the picture first." }, { status: 400 });
  if (prompt.length > 5000) return NextResponse.json({ error: "The prompt is too long (5000 characters at most)." }, { status: 400 });

  let book: Book;
  try {
    book = await serverPb(me.token).collection("books").getOne<Book>(b.bookId);
    if (book.owner !== me.id) throw new Error("not owner");
  } catch {
    return NextResponse.json({ error: "Book not found or not yours." }, { status: 404 });
  }

  const palette = {
    bg: HEX.test(b.palette?.bg ?? "") ? b.palette!.bg! : "#ad3a17",
    fg: HEX.test(b.palette?.fg ?? "") ? b.palette!.fg! : "#ffffff",
    accent: HEX.test(b.palette?.accent ?? "") ? b.palette!.accent! : "#f2c14e",
  };
  const test = !falConfigured();
  const cost = isFree(me.email) ? 0 : creditsFor(quality, count);
  const admin = await adminPb();

  // charge first, under a per-writer lock, and refund if the model fails
  type Gen = { id: string; collectionId: string };
  let gens: Gen[];
  let charge: { id: string } | null = null;
  try {
    const started = await withUserLock(me.id, async () => {
      const have = await balance(me.id);
      if (have < cost) return { short: have };
      const created: Gen[] = [];
      for (let i = 0; i < count; i++) {
        created.push(
          await admin.collection("cover_generations").create<Gen>({
            owner: me.id,
            book: book.id,
            prompt,
            target,
            quality,
            aspect,
            status: "running",
            credits: cost / count,
            mock: test,
          }),
        );
      }
      const row = cost ? await addLedger({ owner: me.id, delta: -cost, reason: "generation", generation: created[0].id, note: `${count} ${quality} picture${count > 1 ? "s" : ""}` }) : null;
      return { created, row };
    });
    if ("short" in started) {
      return NextResponse.json({ error: `This needs ${cost} credits and you have ${started.short}. Top up to keep going.`, needCredits: cost, credits: started.short }, { status: 402 });
    }
    gens = started.created;
    charge = started.row;
  } catch (e) {
    return NextResponse.json({ error: `Could not start: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }

  const references: string[] = [];
  if (b.referenceUrl) {
    const ref = await inlineReference(b.referenceUrl, me.token).catch(() => null);
    if (ref) references.push(ref);
  }
  const input: GenerateInput = { prompt, aspect, quality, count, references };

  try {
    const out = test ? mockImages(input, palette, book.title) : await generateImages(input);
    const saved = await Promise.all(
      gens.map(async (g, i) => {
        const img = out.images[i];
        if (!img) {
          await admin.collection("cover_generations").update(g.id, { status: "failed", error: "The model returned fewer pictures than asked." });
          return null;
        }
        const ext = img.type.includes("svg") ? "svg" : img.type.includes("jpeg") ? "jpg" : img.type.includes("webp") ? "webp" : "png";
        const fd = new FormData();
        fd.append("image", new File([img.bytes as BlobPart], generationFileName(book.title, target, ext), { type: img.type }));
        fd.append("status", "done");
        fd.append("model", out.model);
        if (img.width) fd.append("width", String(img.width));
        if (img.height) fd.append("height", String(img.height));
        const rec = await admin.collection("cover_generations").update(g.id, fd);
        return { id: rec.id, url: fileUrl(rec, rec.image), thumb: fileUrl(rec, rec.image, img.type.includes("svg") ? undefined : "480x0"), width: img.width, height: img.height, target, quality, mock: test, prompt, created: rec.created };
      }),
    );
    const missing = saved.filter((s) => !s).length;
    if (missing && cost) await addLedger({ owner: me.id, delta: (cost / count) * missing, reason: "refund", generation: gens[0].id, note: "Pictures the model did not return" });
    return NextResponse.json({ images: saved.filter(Boolean), credits: await balance(me.id), charged: cost - (cost / count) * missing, test });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await Promise.all(gens.map((g) => admin.collection("cover_generations").update(g.id, { status: "failed", error: message.slice(0, 1900) }).catch(() => undefined)));
    if (charge && cost) await addLedger({ owner: me.id, delta: cost, reason: "refund", generation: gens[0].id, note: "Generation failed" }).catch(() => undefined);
    return NextResponse.json({ error: `${message.replace(/fetch failed/, "Could not reach the image service").replace(/\.?$/, ".")} Your credits were returned.`, credits: await balance(me.id).catch(() => undefined) }, { status: 502 });
  }
}
