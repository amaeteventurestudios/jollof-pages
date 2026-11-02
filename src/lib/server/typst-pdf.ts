import "server-only";
import { mkdtemp, rm, writeFile, readFile, mkdir, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { bookImages, type ExportInput } from "../book-model";
import { buildTypst } from "../export/typst";
import { estimatePages, getTrim, hardcoverTrim, minGutter, type Binding } from "../kdp";
import type { PdfxReport } from "../pdfx-check";
import { toPdfx } from "./pdfx";
import { bookFormat, printEdition } from "../types";
import { fontPath, run, typstBin } from "./tools";

export interface PdfResult {
  pdf: Uint8Array;
  pages: number;
  source: string;
  /** set when a PDF/X-1a print file was asked for */
  pdfx?: { report: PdfxReport; flattened: number[] };
}

function extFor(type: string): string {
  if (type.includes("png")) return "png";
  if (type.includes("gif")) return "gif";
  if (type.includes("webp")) return "webp";
  if (type.includes("svg")) return "svg";
  return "jpg";
}

/**
 * Compile the interior. KDP's gutter depends on the page count, so when the first pass lands in a
 * different gutter band than the guess, compile once more with the real count.
 */
export async function compileInterior(
  input: ExportInput,
  fetchImage: (src: string) => Promise<{ bytes: Uint8Array; type: string } | null>,
  binding: Binding = "paperback",
  opts: { pdfx?: boolean } = {},
): Promise<PdfResult> {
  const dir = await mkdtemp(path.join(tmpdir(), "jp-typst-"));
  try {
    await mkdir(path.join(dir, "img"));
    const paths = new Map<string, string>();
    let n = 0;
    for (const src of bookImages(input.chapters)) {
      const img = await fetchImage(src).catch(() => null);
      if (!img) continue;
      const name = `img/${++n}.${extFor(img.type)}`;
      await writeFile(path.join(dir, name), img.bytes);
      paths.set(src, name);
    }
    const f = bookFormat(input.book);
    const { trim } = printEdition(f, binding);
    const last = binding === "hardcover" ? input.book.hardcover_page_count : input.book.page_count;
    let guess = last || estimatePages(input.chapters.reduce((s, c) => s + (c.word_count || 0), 0), trim, input.chapters.length, f.fontSize);
    let result: PdfResult | null = null;
    for (let pass = 0; pass < 2; pass++) {
      const source = buildTypst(input, { pageCount: guess, binding, imagePath: (src) => paths.get(src) ?? null });
      await writeFile(path.join(dir, "book.typ"), source);
      // a PDF/X-1a file is built on PDF 1.4
      await run(typstBin(), ["compile", "--font-path", fontPath(), "--ignore-system-fonts", ...(opts.pdfx ? ["--pdf-standard", "1.4"] : []), path.join(dir, "book.typ"), path.join(dir, "book.pdf")], {
        timeout: 120_000,
        maxBuffer: 10 * 1024 * 1024,
      });
      const pdf = new Uint8Array(await readFile(path.join(dir, "book.pdf")));
      const pages = (await PDFDocument.load(pdf, { updateMetadata: false })).getPageCount();
      result = { pdf, pages, source };
      if (minGutter(pages) === minGutter(guess)) break;
      guess = pages;
    }
    if (opts.pdfx && result) {
      const { width, height } = binding === "hardcover" ? hardcoverTrim(trim) : getTrim(trim);
      const gray = !printEdition(f, binding).paper.startsWith("color");
      const x = await toPdfx(result.pdf, {
        gray,
        trim: { width: width * 72, height: height * 72 },
        bleed: f.bleed,
        title: input.book.title,
        render: async (pages, ppi) => {
          const out = new Map<number, Uint8Array>();
          // render in batches so the command line stays short
          for (let i = 0; i < pages.length; i += 40) {
            const batch = pages.slice(i, i + 40);
            await run(typstBin(), ["compile", "--font-path", fontPath(), "--ignore-system-fonts", "--format", "png", "--ppi", String(ppi), "--pages", batch.join(","), path.join(dir, "book.typ"), path.join(dir, "page-{0p}.png")], {
              timeout: 300_000,
              maxBuffer: 10 * 1024 * 1024,
            });
            const files = await readdir(dir);
            for (const n of batch) {
              const file = files.find((f) => new RegExp(`^page-0*${n}\\.png$`).test(f));
              if (file) out.set(n, new Uint8Array(await readFile(path.join(dir, file))));
            }
          }
          return out;
        },
        flatten: async (png, toGray) => {
          const sharp = (await import("sharp")).default;
          const img = sharp(png).flatten({ background: "#ffffff" });
          return new Uint8Array(await (toGray ? img.grayscale().toColourspace("b-w") : img.toColourspace("cmyk")).jpeg({ quality: 92, chromaSubsampling: "4:4:4" }).toBuffer());
        },
      });
      result = { ...result, pdf: x.pdf, pdfx: { report: x.report, flattened: x.flattened } };
    }
    return result!;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
