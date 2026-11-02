import { describe, expect, it } from "vitest";
import { PDFDocument, rgb } from "pdf-lib";
import { pdfxProblems } from "@/lib/pdfx-check";
import { rewriteColours, toPdfx } from "@/lib/server/pdfx";

async function rgbPdf(opacity = 1) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([396, 612]);
  page.drawLine({ start: { x: 50, y: 500 }, end: { x: 300, y: 500 }, color: rgb(0.2, 0.2, 0.2) });
  page.drawRectangle({ x: 50, y: 300, width: 100, height: 50, color: rgb(0.6, 0.2, 0.1), opacity });
  return doc.save({ useObjectStreams: false });
}

const noRender = async () => new Map<number, Uint8Array>();
const opts = { gray: true, trim: { width: 396, height: 612 }, bleed: false, title: "Test", render: noRender, flatten: async (b: Uint8Array) => b };

describe("PDF/X-1a colour rewriting", () => {
  it("turns Typst's named RGB colours into grey or CMYK", () => {
    const spaces = new Map([["c0", 3]]);
    expect(rewriteColours("q /c0 cs 0 0 0 scn BT ET Q", spaces, true)).toBe("q  0 g BT ET Q");
    expect(rewriteColours("/c0 CS 1 0 0 SCN", spaces, false)).toBe(" 0 1 1 0 K");
    expect(rewriteColours("1 1 1 rg 0.5 G", new Map(), true)).toBe("1 g 0.5 G");
  });

  it("leaves glyph strings and other numbers alone", () => {
    const s = "BT /f0 11 Tf 1 0 0 1 72 700 Tm [<0012> -250 <0034>] TJ ET";
    expect(rewriteColours(s, new Map([["c0", 3]]), true)).toBe(s);
  });
});

describe("PDF/X-1a check", () => {
  it("fails an ordinary RGB PDF and says why", async () => {
    const r = await pdfxProblems(await rgbPdf());
    expect(r.ok).toBe(false);
    expect(r.problems.join(" ")).toMatch(/RGB/);
    expect(r.problems.join(" ")).toMatch(/output intent/);
  });

  it("reports fonts that aren't embedded", async () => {
    const doc = await PDFDocument.create();
    doc.addPage().drawText("Hello");
    expect((await pdfxProblems(await doc.save())).problems).toContain("The font Helvetica isn't embedded.");
  });

  it("converts a vector page to a passing PDF/X-1a file without flattening it", async () => {
    const x = await toPdfx(await rgbPdf(), opts);
    expect(x.flattened).toEqual([]);
    expect(x.report.problems).toEqual([]);
    expect(new TextDecoder().decode(x.pdf.subarray(0, 8))).toBe("%PDF-1.4");
  });

  it("flattens a page with something see-through", async () => {
    const asked: number[] = [];
    const sharp = (await import("sharp")).default;
    const png = await sharp({ create: { width: 20, height: 30, channels: 3, background: "#ffffff" } }).png().toBuffer();
    const jpg = await sharp(png).grayscale().toColourspace("b-w").jpeg().toBuffer();
    const x = await toPdfx(await rgbPdf(0.5), {
      ...opts,
      render: async (pages) => {
        asked.push(...pages);
        return new Map(pages.map((p) => [p, new Uint8Array(png)]));
      },
      flatten: async () => new Uint8Array(jpg),
    });
    expect(asked).toEqual([1]);
    expect(x.report.ok).toBe(true);
  });

  it("puts the trim box inside the bleed on the outside edge", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([396 + 9, 612 + 18]);
    doc.addPage([396 + 9, 612 + 18]);
    const x = await toPdfx(await doc.save({ useObjectStreams: false }), { ...opts, bleed: true });
    const out = await PDFDocument.load(x.pdf);
    const [right, left] = out.getPages().map((p) => p.getTrimBox());
    expect(right).toMatchObject({ x: 0, y: 9, width: 396, height: 612 });
    expect(left).toMatchObject({ x: 9, y: 9, width: 396, height: 612 });
  });
});
