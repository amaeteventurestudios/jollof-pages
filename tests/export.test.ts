import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
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

  it("builds a DOCX manuscript", async () => {
    const blob = await buildDocx(sampleExportInput());
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(await zip.file("word/document.xml")!.async("string")).toContain("Know your reader");
  });
});
