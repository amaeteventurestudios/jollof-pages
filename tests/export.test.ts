import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildEpub } from "@/lib/export/epub";
import { buildTypst } from "@/lib/export/typst";
import { buildDocx } from "@/lib/export/docx";
import { sampleExportInput } from "@/lib/sample-book";

const root = path.resolve(__dirname, "..");
const typst = existsSync(path.join(root, "tools/typst")) ? path.join(root, "tools/typst") : null;
const epubcheck = path.join(root, "tools/epubcheck/epubcheck.jar");
const hasJava = (() => {
  try {
    execFileSync("java", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

describe("exports", () => {
  it("builds a well-formed EPUB 3", async () => {
    const bytes = await buildEpub(sampleExportInput());
    const zip = await JSZip.loadAsync(bytes);
    const names = Object.keys(zip.files);
    expect(names[0]).toBe("mimetype");
    expect(await zip.file("mimetype")!.async("string")).toBe("application/epub+zip");
    expect(names.some((n) => n.endsWith("nav.xhtml"))).toBe(true);
    expect(names.some((n) => n.endsWith("toc.ncx"))).toBe(true);
  });

  it.skipIf(!hasJava || !existsSync(epubcheck))("passes EPUBCheck", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "jp-test-"));
    const file = path.join(dir, "sample.epub");
    writeFileSync(file, await buildEpub(sampleExportInput()));
    // throws on a non-zero exit, which EPUBCheck uses for errors
    execFileSync("java", ["-jar", epubcheck, file], { stdio: "pipe" });
  });

  it("writes Typst with the KDP page setup", () => {
    const src = buildTypst(sampleExportInput(), { pageCount: 120 });
    expect(src).toContain("6in");
    expect(src).toContain("Know your reader");
  });

  it.skipIf(!typst)("compiles the Typst interior to a PDF", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "jp-test-"));
    writeFileSync(path.join(dir, "book.typ"), buildTypst(sampleExportInput(), { pageCount: 120 }));
    execFileSync(typst!, ["compile", "--font-path", path.join(root, "fonts"), "--ignore-system-fonts", path.join(dir, "book.typ"), path.join(dir, "book.pdf")], { stdio: "pipe" });
    expect(existsSync(path.join(dir, "book.pdf"))).toBe(true);
  });

  it.skipIf(!typst)("compiles a hardcover interior at the hardcover trim with a wider gutter", () => {
    const input = sampleExportInput();
    input.book.format = { ...input.book.format, trim: "5x8", hardcover: true };
    const src = buildTypst(input, { pageCount: 120, binding: "hardcover" });
    expect(src).toContain("width: 5.5in");
    expect(src).toContain("inside: 0.75in");
    expect(buildTypst(input, { pageCount: 120 })).toContain("inside: 0.625in");
    const dir = mkdtempSync(path.join(tmpdir(), "jp-test-"));
    writeFileSync(path.join(dir, "book.typ"), src);
    execFileSync(typst!, ["compile", "--font-path", path.join(root, "fonts"), "--ignore-system-fonts", path.join(dir, "book.typ"), path.join(dir, "book.pdf")], { stdio: "pipe" });
    expect(existsSync(path.join(dir, "book.pdf"))).toBe(true);
  });

  describe("chapter options", () => {
    // 2x1 PNG, enough for Typst and EPUBCheck to accept as a real image
    const png = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAADUlEQVR4nGM44KAARAAJJwJBDpI+DQAAAABJRU5ErkJggg==", "base64"));
    const IMG = "https://pb.example.com/api/files/assets/x/opener.png";
    function withOptions() {
      const input = sampleExportInput();
      const chapters = input.chapters.filter((c) => c.kind === "chapter");
      chapters[0].options = { image: IMG, invert: true, hidePageNumber: true, hideHeader: true };
      chapters[1].options = { smallTitle: true, image: IMG };
      input.chapters.find((c) => c.kind === "introduction")!.options = { hideHeading: true };
      return input;
    }

    it("passes options to Typst", () => {
      const src = buildTypst(withOptions(), { pageCount: 120, imagePath: (s) => (s === IMG ? "img/1.png" : null) });
      expect(src).toContain("numbers: false, head: false");
      expect(src).toContain('img: "img/1.png", invert: true');
      expect(src).toContain("small: true");
    });

    it.skipIf(!typst)("compiles a PDF with chapter images, hidden and small headings", () => {
      const dir = mkdtempSync(path.join(tmpdir(), "jp-test-"));
      mkdirSync(path.join(dir, "img"));
      writeFileSync(path.join(dir, "img/1.png"), png);
      writeFileSync(path.join(dir, "book.typ"), buildTypst(withOptions(), { pageCount: 120, imagePath: (s) => (s === IMG ? "img/1.png" : null) }));
      execFileSync(typst!, ["compile", "--font-path", path.join(root, "fonts"), "--ignore-system-fonts", path.join(dir, "book.typ"), path.join(dir, "book.pdf")], { stdio: "pipe" });
      expect(existsSync(path.join(dir, "book.pdf"))).toBe(true);
    });

    it("puts the chapter image in the EPUB", async () => {
      const bytes = await buildEpub(withOptions(), { images: new Map([[IMG, { bytes: png, mediaType: "image/png" }]]) });
      const zip = await JSZip.loadAsync(bytes);
      const texts = await Promise.all(Object.values(zip.files).filter((f) => !f.dir && f.name.includes("/text/")).map((f) => f.name).map((n) => zip.file(n)!.async("string")));
      expect(texts.some((t) => t.includes('class="chapter-head inverted"') && t.includes("../images/img-1.png"))).toBe(true);
      if (hasJava && existsSync(epubcheck)) {
        const file = path.join(mkdtempSync(path.join(tmpdir(), "jp-test-")), "opts.epub");
        writeFileSync(file, bytes);
        execFileSync("java", ["-jar", epubcheck, file], { stdio: "pipe" });
      }
    });
  });

  it("builds a DOCX manuscript", async () => {
    const blob = await buildDocx(sampleExportInput());
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(await zip.file("word/document.xml")!.async("string")).toContain("Know your reader");
  });
});
