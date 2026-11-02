import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildTypst } from "@/lib/export/typst";
import { buildDocx } from "@/lib/export/docx";
import { sampleExportInput } from "@/lib/sample-book";
import { headTitles, pageChrome, runningHeads, folioText, type RunningHeads } from "@/lib/running-heads";
import { authorName, orderedElements } from "@/lib/book-model";
import { themeFor } from "@/lib/themes";
import { bookFormat, type BookFormat } from "@/lib/types";

const root = path.resolve(__dirname, "..");
const typst = existsSync(path.join(root, "tools/typst")) ? path.join(root, "tools/typst") : null;
const hasPdftotext = (() => {
  try {
    execFileSync("pdftotext", ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

function withHeads(heads: Partial<RunningHeads>, extra: Partial<BookFormat> = {}) {
  const input = sampleExportInput();
  input.book = { ...input.book, format: { ...input.book.format, heads, ...extra } };
  // longer chapters, so they run past their opening page
  for (const c of input.chapters) if (c.content?.content) c.content.content = [...c.content.content, ...c.content.content, ...c.content.content];
  return input;
}

/** compile and return the text of each page */
function pages(input: ReturnType<typeof sampleExportInput>): string[] {
  const dir = mkdtempSync(path.join(tmpdir(), "jp-heads-"));
  writeFileSync(path.join(dir, "book.typ"), buildTypst(input, { pageCount: 120 }));
  execFileSync(typst!, ["compile", "--font-path", path.join(root, "fonts"), "--ignore-system-fonts", path.join(dir, "book.typ"), path.join(dir, "book.pdf")], { stdio: "pipe" });
  return execFileSync("pdftotext", ["-layout", path.join(dir, "book.pdf"), "-"]).toString().split("\f");
}

describe("running heads", () => {
  it("defaults to book title left, chapter right, number at the bottom", () => {
    const h = runningHeads({});
    expect(h).toMatchObject({ left: "book", right: "chapter", folio: "bottom-center" });
    expect(runningHeads({ runningHeads: false })).toMatchObject({ left: "none", right: "none" });
    expect(runningHeads({ heads: { left: "bogus" as never } }).left).toBe("book");
  });

  it("formats page numbers", () => {
    expect(folioText("12", "plain")).toBe("12");
    expect(folioText("12", "dashes")).toBe("– 12 –");
    expect(folioText("12", "word")).toBe("Page 12");
    expect(folioText("", "word")).toBe("");
  });

  it("uses a chapter's shorter running title and tracks parts", () => {
    const input = sampleExportInput();
    const els = orderedElements(input.chapters, themeFor(bookFormat(input.book)));
    const body = els.findIndex((e) => e.section === "body");
    els[body].options.runningTitle = "Short one";
    const t = headTitles(els);
    expect(t[body].title).toBe("Short one");
  });

  it("works out what each preview page shows", () => {
    const base = { opener: false, front: false, folio: "13", book: "Book", author: "Ada", title: "Ch", part: "P" };
    const h = runningHeads({});
    expect(pageChrome(h, { ...base, recto: true })).toMatchObject({ head: "Ch", headAlign: "right", folio: "13", folioAlign: "center" });
    expect(pageChrome(h, { ...base, recto: false }).head).toBe("Book");
    expect(pageChrome(h, { ...base, recto: true, opener: true }).head).toBe("");
    const top = runningHeads({ heads: { folio: "top-outside", openerFolio: true } });
    expect(pageChrome(top, { ...base, recto: true, opener: true }).folio).toBe("");
    expect(pageChrome(top, { ...base, recto: true })).toMatchObject({ folioTop: true, headAlign: "left" });
    const noOpener = runningHeads({ heads: { openerFolio: false } });
    expect(pageChrome(noOpener, { ...base, recto: true, opener: true }).folio).toBe("");
    expect(pageChrome(runningHeads({ heads: { left: "author" } }), { ...base, recto: false }).head).toBe("Ada");
  });

  it("sets widow and orphan costs in print", () => {
    const strict = sampleExportInput();
    strict.book = { ...strict.book, format: { ...strict.book.format, custom: { widows: "strict" } } };
    expect(buildTypst(strict, { pageCount: 120 })).toMatch(/widow: 1000%/);
  });

  it("puts the head settings in the Word file", async () => {
    const blob = await buildDocx(withHeads({ left: "author", folio: "bottom-outside", folioStyle: "word" }));
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const files = Object.keys(zip.files).filter((f) => /word\/(header|footer)\d+\.xml/.test(f));
    const xml = (await Promise.all(files.map((f) => zip.file(f)!.async("string")))).join("\n");
    const settings = await zip.file("word/settings.xml")!.async("string");
    expect(settings).toContain("evenAndOddHeaders");
    expect(xml).toContain("STYLEREF");
    expect(xml).toContain("Page ");
  });

  it.skipIf(!typst || !hasPdftotext)("prints heads and numbers as set", () => {
    const input = withHeads({});
    const firstChapter = input.chapters.find((c) => c.title && c.content)!;
    const plain = pages(input).join("\n");
    expect(plain).toContain(input.book.title.toUpperCase());

    const author = authorName(input);
    const custom = pages(withHeads({ left: "author", right: "book", folio: "top-outside", folioStyle: "dashes" })).join("\n");
    expect(custom).toContain(author);
    expect(custom).toMatch(/\n–\s*\d+\s*–\s+TOLA EKANEM/);

    const none = pages(withHeads({ left: "none", right: "none", folio: "none" }));
    const textPages = none.filter((p) => p.includes(firstChapter.title));
    expect(textPages.length).toBeGreaterThan(0);
    // no page ends with a page number line (footnote markers sit above other text)
    const lastLine = (p: string) => p.trimEnd().split("\n").pop()?.trim() ?? "";
    expect(none.filter((p) => /^([0-9]+|[ivxlc]+)$/.test(lastLine(p)))).toEqual([]);
    expect(plain.split("\f").some((p) => /^([0-9]+|[ivxlc]+)$/.test(lastLine(p)))).toBe(true);
  });
});
