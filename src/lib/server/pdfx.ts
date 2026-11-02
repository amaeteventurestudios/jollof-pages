import "server-only";
import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFNumber, PDFRawStream, PDFRef, PDFStream, PDFString, decodePDFRawStream, type PDFObject } from "pdf-lib";
import { pdfxProblems, type PdfxReport } from "../pdfx-check";

/**
 * Turn Typst's interior PDF into a PDF/X-1a:2003 print file, the format IngramSpark and most
 * offset printers ask for: PDF 1.4, only grey or CMYK colour, no transparency, every font
 * embedded, no links on the page, a trim box on every page and a declared printing condition.
 *
 * Text-only pages stay vector: their colours are rewritten from RGB to grey (black-and-white
 * books) or CMYK (colour books). Pages with something PDF/X-1a can't hold, like see-through
 * backgrounds, soft shadows or colour photos, are rendered to a high-resolution picture by
 * Typst itself and put back as a single flattened image. The result is checked again before it
 * is returned, and the check is what the Export tab reports.
 */

export interface PdfxOptions {
  /** black-and-white interior: everything becomes grey */
  gray: boolean;
  /** the trim size in points; the page is bigger by the bleed when there is one */
  trim: { width: number; height: number };
  bleed: boolean;
  title: string;
  /** render these 1-based pages to PNG at the given resolution */
  render: (pages: number[], ppi: number) => Promise<Map<number, Uint8Array>>;
  /** flatten a PNG onto white and encode it as a grey or CMYK JPEG */
  flatten: (png: Uint8Array, gray: boolean) => Promise<Uint8Array>;
}

export interface PdfxResult {
  pdf: Uint8Array;
  /** pages that had to be flattened to a picture */
  flattened: number[];
  report: PdfxReport;
}

/** grey text needs more pixels than colour pictures to stay sharp */
const GRAY_PPI = 600;
const COLOR_PPI = 400;
const BLEED_PT = 9; // 0.125 in

type Space = { n: 1 | 3 | 4 } | "other";

function lookup<T extends PDFObject>(doc: PDFDocument, o: PDFObject | undefined): T | undefined {
  if (!o) return undefined;
  return (o instanceof PDFRef ? doc.context.lookup(o) : o) as T;
}

function dictOf(doc: PDFDocument, o: PDFObject | undefined): PDFDict | undefined {
  const v = lookup<PDFObject>(doc, o);
  if (v instanceof PDFDict) return v;
  if (v instanceof PDFStream) return v.dict;
  return undefined;
}

/** What a colour space resource is: how many numbers its colours take, or something we don't rewrite. */
function spaceOf(doc: PDFDocument, o: PDFObject | undefined): Space {
  const v = lookup<PDFObject>(doc, o);
  if (v instanceof PDFName) {
    const n = v.asString();
    return n === "/DeviceGray" ? { n: 1 } : n === "/DeviceRGB" ? { n: 3 } : n === "/DeviceCMYK" ? { n: 4 } : "other";
  }
  if (v instanceof PDFArray) {
    const kind = lookup<PDFName>(doc, v.get(0))?.asString();
    if (kind === "/ICCBased") {
      const n = dictOf(doc, v.get(1))?.get(PDFName.of("N"));
      const c = n instanceof PDFNumber ? n.asNumber() : 0;
      return c === 1 || c === 3 || c === 4 ? { n: c } : "other";
    }
    if (kind === "/CalGray") return { n: 1 };
    if (kind === "/CalRGB") return { n: 3 };
  }
  return "other";
}

const num = (doc: PDFDocument, o: PDFObject | undefined) => {
  const v = lookup<PDFObject>(doc, o);
  return v instanceof PDFNumber ? v.asNumber() : undefined;
};

/** Does anything this resource dictionary can reach need flattening? */
function needsFlatten(doc: PDFDocument, resources: PDFDict | undefined, content: string[], seen = new Set<PDFDict>()): boolean {
  if (!resources || seen.has(resources)) return false;
  seen.add(resources);
  if (content.some((c) => /(^|\s)(sh|BI)(\s|$)/.test(c))) return true;
  if (dictOf(doc, resources.get(PDFName.of("Shading")))?.keys().length) return true;
  if (dictOf(doc, resources.get(PDFName.of("Pattern")))?.keys().length) return true;
  const gs = dictOf(doc, resources.get(PDFName.of("ExtGState")));
  for (const key of gs?.keys() ?? []) {
    const g = dictOf(doc, gs!.get(key));
    if (!g) continue;
    for (const k of ["CA", "ca"]) {
      const v = num(doc, g.get(PDFName.of(k)));
      if (v !== undefined && v < 1) return true;
    }
    const smask = lookup<PDFObject>(doc, g.get(PDFName.of("SMask")));
    if (smask && !(smask instanceof PDFName && smask.asString() === "/None")) return true;
    const bm = lookup<PDFObject>(doc, g.get(PDFName.of("BM")));
    if (bm instanceof PDFName && !["/Normal", "/Compatible"].includes(bm.asString())) return true;
  }
  const spaces = dictOf(doc, resources.get(PDFName.of("ColorSpace")));
  for (const key of spaces?.keys() ?? []) if (spaceOf(doc, spaces!.get(key)) === "other") return true;
  const fonts = dictOf(doc, resources.get(PDFName.of("Font")));
  for (const key of fonts?.keys() ?? []) {
    // Type 3 glyphs are little drawings that can carry their own colours
    if (dictOf(doc, fonts!.get(key))?.get(PDFName.of("Subtype"))?.toString() === "/Type3") return true;
  }
  const xo = dictOf(doc, resources.get(PDFName.of("XObject")));
  for (const key of xo?.keys() ?? []) {
    const s = lookup<PDFObject>(doc, xo!.get(key));
    if (!(s instanceof PDFRawStream)) continue;
    const sub = s.dict.get(PDFName.of("Subtype"))?.toString();
    if (sub === "/Image") {
      if (s.dict.get(PDFName.of("SMask")) || s.dict.get(PDFName.of("Mask"))) return true;
      const sp = spaceOf(doc, s.dict.get(PDFName.of("ColorSpace")));
      // colour photos need converting, which the renderer does well; grey ones can stay
      if (sp === "other" || sp.n === 3) return true;
    } else if (sub === "/Form") {
      if (needsFlatten(doc, dictOf(doc, s.dict.get(PDFName.of("Resources"))), [streamText(s)], seen)) return true;
    }
  }
  return false;
}

function streamText(s: PDFRawStream): string {
  return Buffer.from(decodePDFRawStream(s).decode()).toString("latin1");
}

function contentStreams(doc: PDFDocument, page: PDFDict): PDFRawStream[] {
  const c = lookup<PDFObject>(doc, page.get(PDFName.of("Contents")));
  const list = c instanceof PDFArray ? c.asArray() : c ? [c] : [];
  return list.map((r) => lookup<PDFObject>(doc, r)).filter((s): s is PDFRawStream => s instanceof PDFRawStream);
}

const fmt = (v: number) => String(Math.round(Math.min(1, Math.max(0, v)) * 10000) / 10000);

function toGray(v: number[]): number {
  if (v.length === 1) return v[0];
  if (v.length === 3) return 0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2];
  return 1 - Math.min(1, 0.3 * v[0] + 0.59 * v[1] + 0.11 * v[2] + v[3]);
}

function toCmyk(v: number[]): number[] {
  if (v.length === 4) return v;
  if (v.length === 1) return [0, 0, 0, 1 - v[0]];
  const k = 1 - Math.max(v[0], v[1], v[2]);
  if (k >= 1) return [0, 0, 0, 1];
  return [(1 - v[0] - k) / (1 - k), (1 - v[1] - k) / (1 - k), (1 - v[2] - k) / (1 - k), k];
}

/**
 * Rewrite colour operators to DeviceGray or DeviceCMYK ones. Typst writes colours as
 * `/c0 cs 0 0 0 scn`; the colour space line is dropped and the numbers become `g` or `k`.
 */
export function rewriteColours(text: string, spaces: Map<string, number>, gray: boolean): string {
  let fill = 1;
  let stroke = 1;
  return text.replace(/\/([A-Za-z0-9_.#-]+)\s+(cs|CS)(?=\s)|(?<=^|\s)((?:-?\d*\.?\d+\s+){1,4})(scn|SCN|sc|SC|rg|RG|g|G|k|K)(?=\s|$)/g, (all, name, op, nums, cop) => {
    if (op) {
      const n = spaces.get(name) ?? (name === "DeviceGray" ? 1 : name === "DeviceRGB" ? 3 : name === "DeviceCMYK" ? 4 : 0);
      if (!n) return all;
      if (op === "cs") fill = n;
      else stroke = n;
      return "";
    }
    const v = (nums as string).trim().split(/\s+/).map(Number);
    const isStroke = cop === cop.toUpperCase();
    const want = cop === "rg" || cop === "RG" ? 3 : cop === "g" || cop === "G" ? 1 : cop === "k" || cop === "K" ? 4 : isStroke ? stroke : fill;
    // a number belonging to an earlier operator can't be here, but keep only the operands the space takes
    const ops = v.slice(-want);
    const lead = v.length > want ? v.slice(0, v.length - want).join(" ") + " " : "";
    const prefix = (nums as string).match(/^\s*/)![0];
    if (gray) return `${prefix}${lead}${fmt(toGray(ops))} ${isStroke ? "G" : "g"}`;
    return `${prefix}${lead}${toCmyk(ops).map(fmt).join(" ")} ${isStroke ? "K" : "k"}`;
  });
}

function spaceMap(doc: PDFDocument, resources: PDFDict | undefined): Map<string, number> {
  const out = new Map<string, number>();
  const spaces = dictOf(doc, resources?.get(PDFName.of("ColorSpace")));
  for (const key of spaces?.keys() ?? []) {
    const s = spaceOf(doc, spaces!.get(key));
    if (s !== "other") out.set(key.asString().slice(1), s.n);
  }
  return out;
}

/** Replace the stream at `ref` with its colours rewritten, keeping its own keys (a form's BBox, Matrix, Resources). */
function rewriteStream(doc: PDFDocument, ref: PDFObject | undefined, resources: PDFDict | undefined, gray: boolean, done: Set<string>) {
  if (!(ref instanceof PDFRef) || done.has(ref.tag)) return;
  done.add(ref.tag);
  const s = doc.context.lookup(ref);
  if (!(s instanceof PDFRawStream)) return;
  const fresh = doc.context.flateStream(Buffer.from(rewriteColours(streamText(s), spaceMap(doc, resources), gray), "latin1"));
  for (const [k, v] of s.dict.entries()) {
    const key = k.asString();
    // the old encoding goes, and so does the transparency group: nothing on the page is see-through
    if (key === "/Length" || key === "/Filter" || key === "/DecodeParms" || key === "/Group") continue;
    fresh.dict.set(k, v);
  }
  doc.context.assign(ref, fresh);
}

/** Rewrite a vector page and the drawings it uses; grey and CMYK images are relabelled as Device spaces. */
function convertVector(doc: PDFDocument, page: PDFDict, gray: boolean, done: Set<string>) {
  const resources = dictOf(doc, page.get(PDFName.of("Resources")));
  const c = page.get(PDFName.of("Contents"));
  const list = c instanceof PDFArray ? c.asArray() : lookup<PDFObject>(doc, c) instanceof PDFArray ? (lookup<PDFArray>(doc, c) as PDFArray).asArray() : [c];
  for (const r of list) rewriteStream(doc, r, resources, gray, done);
  const walk = (res: PDFDict | undefined) => {
    const xo = dictOf(doc, res?.get(PDFName.of("XObject")));
    for (const key of xo?.keys() ?? []) {
      const ref = xo!.get(key);
      const s = lookup<PDFObject>(doc, ref);
      if (!(s instanceof PDFRawStream) || !(ref instanceof PDFRef) || done.has(ref.tag)) continue;
      const sub = s.dict.get(PDFName.of("Subtype"))?.toString();
      if (sub === "/Form") {
        const inner = dictOf(doc, s.dict.get(PDFName.of("Resources")));
        rewriteStream(doc, ref, inner, gray, done);
        walk(inner);
      } else if (sub === "/Image") {
        const sp = spaceOf(doc, s.dict.get(PDFName.of("ColorSpace")));
        if (sp !== "other") s.dict.set(PDFName.of("ColorSpace"), PDFName.of(sp.n === 1 ? "DeviceGray" : "DeviceCMYK"));
        done.add(ref.tag);
      }
    }
    // every colour now names its Device space directly
    res?.delete(PDFName.of("ColorSpace"));
  };
  walk(resources);
  page.delete(PDFName.of("Group"));
}

function boxes(page: PDFDict, index: number, o: PdfxOptions, doc: PDFDocument) {
  const media = page.get(PDFName.of("MediaBox"));
  const arr = media instanceof PDFArray ? media.asArray().map((v) => (v as PDFNumber).asNumber()) : [0, 0, o.trim.width, o.trim.height];
  const [x0, y0] = arr;
  // a right-hand page bleeds off the right edge, a left-hand page off the left; both off top and bottom
  const recto = index % 2 === 0;
  const trim = o.bleed ? [x0 + (recto ? 0 : BLEED_PT), y0 + BLEED_PT, x0 + (recto ? 0 : BLEED_PT) + o.trim.width, y0 + BLEED_PT + o.trim.height] : arr;
  page.set(PDFName.of("TrimBox"), doc.context.obj(trim));
  page.set(PDFName.of("BleedBox"), doc.context.obj(arr));
  page.delete(PDFName.of("CropBox"));
  page.delete(PDFName.of("ArtBox"));
}

/** Remove objects nothing points to any more (the drawings of flattened pages), so they aren't written. */
function dropUnused(doc: PDFDocument) {
  const keep = new Set<string>();
  const visit = (o: PDFObject | undefined) => {
    if (!o) return;
    if (o instanceof PDFRef) {
      if (keep.has(o.tag)) return;
      keep.add(o.tag);
      visit(doc.context.lookup(o));
    } else if (o instanceof PDFDict) {
      for (const [, v] of o.entries()) visit(v);
    } else if (o instanceof PDFArray) {
      for (const v of o.asArray()) visit(v);
    } else if (o instanceof PDFStream) {
      visit(o.dict);
    }
  };
  visit(doc.context.trailerInfo.Root);
  visit(doc.context.trailerInfo.Info);
  for (const [ref] of doc.context.enumerateIndirectObjects()) if (!keep.has(ref.tag)) doc.context.delete(ref);
}

export async function toPdfx(pdf: Uint8Array, o: PdfxOptions): Promise<PdfxResult> {
  const doc = await PDFDocument.load(pdf, { updateMetadata: false });
  const pages = doc.getPages();
  const flatten: number[] = [];
  pages.forEach((p, i) => {
    const res = dictOf(doc, p.node.get(PDFName.of("Resources")));
    if (needsFlatten(doc, res, contentStreams(doc, p.node).map(streamText))) flatten.push(i + 1);
  });

  const done = new Set<string>();
  pages.forEach((p, i) => {
    if (!flatten.includes(i + 1)) convertVector(doc, p.node, o.gray, done);
  });

  if (flatten.length) {
    const ppi = o.gray ? GRAY_PPI : COLOR_PPI;
    const pngs = await o.render(flatten, ppi);
    for (const n of flatten) {
      const png = pngs.get(n);
      if (!png) throw new Error(`Page ${n} could not be rendered for the print file.`);
      const page = pages[n - 1];
      const jpg = await doc.embedJpg(await o.flatten(png, o.gray));
      const { width, height } = page.getSize();
      const content = doc.context.flateStream(`q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q`);
      page.node.set(PDFName.of("Contents"), doc.context.register(content));
      page.node.set(PDFName.of("Resources"), doc.context.obj({ XObject: { Im0: jpg.ref } }));
      page.node.delete(PDFName.of("Group"));
    }
  }

  pages.forEach((p, i) => {
    // links and other annotations aren't allowed on a PDF/X page
    p.node.delete(PDFName.of("Annots"));
    boxes(p.node, i, o, doc);
  });

  // the document: no XMP from Typst (it describes the PDF before this change), PDF/X keys in Info
  const catalog = doc.catalog;
  catalog.delete(PDFName.of("Metadata"));
  catalog.delete(PDFName.of("OpenAction"));
  catalog.delete(PDFName.of("AcroForm"));
  catalog.set(
    PDFName.of("OutputIntents"),
    doc.context.obj([
      {
        Type: "OutputIntent",
        S: "GTS_PDFX",
        OutputConditionIdentifier: PDFString.of("CGATS TR 001"),
        OutputCondition: PDFString.of(o.gray ? "Black-and-white book printing (SWOP)" : "Commercial offset printing, coated (SWOP)"),
        RegistryName: PDFString.of("http://www.color.org"),
        Info: PDFString.of("CGATS TR 001 (SWOP)"),
      },
    ]),
  );
  const now = new Date();
  doc.setTitle(o.title || "Book interior");
  doc.setCreationDate(now);
  doc.setModificationDate(now);
  doc.setProducer("Jollof Pages");
  const info = dictOf(doc, doc.context.trailerInfo.Info);
  info?.set(PDFName.of("GTS_PDFXVersion"), PDFString.of("PDF/X-1a:2003"));
  info?.set(PDFName.of("GTS_PDFXConformance"), PDFString.of("PDF/X-1a:2003"));
  info?.set(PDFName.of("Trapped"), PDFName.of("False"));
  const id = PDFHexString.of(Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("hex"));
  doc.context.trailerInfo.ID = doc.context.obj([id, id]);

  dropUnused(doc);
  const out = await doc.save({ useObjectStreams: false, updateFieldAppearances: false });
  // pdf-lib keeps the loaded header; make sure it says 1.4
  const bytes = new Uint8Array(out);
  const head = Buffer.from(bytes.subarray(0, 8)).toString("latin1");
  if (head !== "%PDF-1.4") bytes.set(Buffer.from("%PDF-1.4", "latin1"), 0);
  return { pdf: bytes, flattened: flatten, report: await pdfxProblems(bytes) };
}
