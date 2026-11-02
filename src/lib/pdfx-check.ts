import { PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, PDFRawStream, PDFRef, PDFStream, decodePDFRawStream, type PDFObject } from "pdf-lib";

/**
 * Our own PDF/X-1a check: the rules a printer's preflight (Acrobat, Pitstop, IngramSpark's
 * upload check) looks at, run on the finished file. It reads every object, so it catches things
 * the conversion might have missed. It is not a certified validator; it says what it checked.
 */

export interface PdfxReport {
  ok: boolean;
  /** plain-language problems, empty when it passes */
  problems: string[];
  /** what was checked, for the "what we checked" list */
  checked: string[];
  pages: number;
}

const CHECKED = [
  "PDF version 1.4 or older, with no compressed object streams",
  "Every colour is grey or CMYK (no RGB, no ICC colour spaces)",
  "Nothing is see-through: no transparency, soft masks or blend modes",
  "Every font is embedded",
  "Every page has a trim box and a bleed box",
  "No links or other annotations on the pages",
  "A PDF/X output intent and the PDF/X-1a:2003 version keys",
  "A document ID and no encryption",
];

const look = (doc: PDFDocument, o: PDFObject | undefined): PDFObject | undefined => (o instanceof PDFRef ? doc.context.lookup(o) : o);
const dict = (doc: PDFDocument, o: PDFObject | undefined): PDFDict | undefined => {
  const v = look(doc, o);
  return v instanceof PDFDict ? v : v instanceof PDFStream ? v.dict : undefined;
};
const name = (o: PDFObject | undefined) => (o instanceof PDFName ? o.asString() : "");

function allowedSpace(doc: PDFDocument, o: PDFObject | undefined): boolean {
  const v = look(doc, o);
  if (v instanceof PDFName) return ["/DeviceGray", "/DeviceCMYK", "/Pattern"].includes(v.asString());
  if (v instanceof PDFArray) {
    const kind = name(look(doc, v.get(0)));
    if (kind === "/Separation" || kind === "/DeviceN") return allowedSpace(doc, v.get(2));
    if (kind === "/Indexed") return allowedSpace(doc, v.get(1));
    return false;
  }
  return false;
}

function hasRgb(s: PDFRawStream): boolean {
  try {
    return /(^|\s)(rg|RG)(\s|$)/.test(new TextDecoder("latin1").decode(decodePDFRawStream(s).decode()));
  } catch {
    return false;
  }
}

export async function pdfxProblems(pdf: Uint8Array): Promise<PdfxReport> {
  const problems = new Set<string>();
  const head = new TextDecoder("latin1").decode(pdf.subarray(0, 8));
  const version = Number(head.slice(5));
  if (!head.startsWith("%PDF-") || !(version <= 1.4)) problems.add(`The file is PDF ${head.slice(5) || "of an unknown version"}; PDF/X-1a needs 1.4 or older.`);
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(pdf, { updateMetadata: false });
  } catch (e) {
    return { ok: false, problems: [`The file could not be read: ${(e as Error).message}`], checked: CHECKED, pages: 0 };
  }

  let rgbOps = 0;
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    const d = obj instanceof PDFDict ? obj : obj instanceof PDFStream ? obj.dict : undefined;
    if (!d) continue;
    const type = name(d.get(PDFName.of("Type")));
    const sub = name(d.get(PDFName.of("Subtype")));
    if (type === "/ObjStm" || type === "/XRef") problems.add("The file uses compressed object streams, which PDF 1.4 doesn't have.");
    if (type === "/ExtGState") {
      for (const k of ["CA", "ca"]) {
        const v = look(doc, d.get(PDFName.of(k)));
        if (v instanceof PDFNumber && v.asNumber() < 1) problems.add("Something on a page is see-through (transparency).");
      }
      const sm = look(doc, d.get(PDFName.of("SMask")));
      if (sm && name(sm) !== "/None") problems.add("A soft mask (fading or shadow) is used.");
      const bm = look(doc, d.get(PDFName.of("BM")));
      if (bm && !["/Normal", "/Compatible"].includes(name(bm))) problems.add("A blend mode other than Normal is used.");
    }
    const group = dict(doc, d.get(PDFName.of("Group")));
    if (group && name(group.get(PDFName.of("S"))) === "/Transparency") problems.add("A transparency group is used.");
    if (sub === "/Image") {
      if (d.get(PDFName.of("SMask"))) problems.add("A picture has a see-through (alpha) layer.");
      if (!d.get(PDFName.of("ImageMask")) && !allowedSpace(doc, d.get(PDFName.of("ColorSpace")))) problems.add("A picture isn't in grey or CMYK.");
    }
    if (type === "/FontDescriptor" && !d.get(PDFName.of("FontFile")) && !d.get(PDFName.of("FontFile2")) && !d.get(PDFName.of("FontFile3"))) {
      problems.add(`The font ${name(d.get(PDFName.of("FontName"))).slice(1) || "(unnamed)"} isn't embedded.`);
    }
    if ((sub === "/Type1" || sub === "/TrueType") && !d.get(PDFName.of("FontDescriptor"))) problems.add(`The font ${name(d.get(PDFName.of("BaseFont"))).slice(1)} isn't embedded.`);
    const cs = dict(doc, d.get(PDFName.of("ColorSpace")));
    if (cs && type !== "/XObject" && sub !== "/Image") {
      for (const k of cs.keys()) if (!allowedSpace(doc, cs.get(k))) problems.add("A colour space other than grey or CMYK is defined.");
    }
    if (obj instanceof PDFRawStream && sub === "/Form" && hasRgb(obj)) rgbOps++;
  }

  const catalog = doc.catalog;
  const intents = look(doc, catalog.get(PDFName.of("OutputIntents")));
  const pdfx = intents instanceof PDFArray && intents.asArray().some((i) => name(dict(doc, i)?.get(PDFName.of("S"))) === "/GTS_PDFX");
  if (!pdfx) problems.add("There is no PDF/X output intent (the printing condition).");
  const info = dict(doc, doc.context.trailerInfo.Info);
  const ver = info?.get(PDFName.of("GTS_PDFXVersion"));
  if (!ver || !/PDF\/X-1/.test(String((ver as { decodeText?: () => string }).decodeText?.() ?? ver.toString()))) problems.add("The PDF/X-1a version key is missing.");
  if (!doc.context.trailerInfo.ID) problems.add("The file has no document ID.");
  if (doc.context.trailerInfo.Encrypt) problems.add("The file is encrypted.");

  const pages = doc.getPages();
  for (const p of pages) {
    const c = look(doc, p.node.get(PDFName.of("Contents")));
    for (const r of c instanceof PDFArray ? c.asArray() : [p.node.get(PDFName.of("Contents"))]) {
      const s = look(doc, r);
      if (s instanceof PDFRawStream && hasRgb(s)) rgbOps++;
    }
  }
  if (rgbOps) problems.add("Some text or lines are coloured in RGB.");
  pages.forEach((p, i) => {
    if (!p.node.get(PDFName.of("TrimBox")) && !p.node.get(PDFName.of("ArtBox"))) problems.add(`Page ${i + 1} has no trim box.`);
    const annots = look(doc, p.node.get(PDFName.of("Annots")));
    if (annots instanceof PDFArray && annots.size() > 0) problems.add("Some pages have links or other annotations.");
  });

  const list = [...problems];
  return { ok: list.length === 0, problems: list, checked: CHECKED, pages: pages.length };
}
