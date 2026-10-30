import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildEpub } from "@/lib/export/epub";
import { buildTypst } from "@/lib/export/typst";
import { themeCss } from "@/lib/theme-css";
import { textStyle, themeFor, type ThemeCustom } from "@/lib/themes";
import type { DocNode } from "@/lib/doc/types";
import { showcaseInput } from "./showcase";

const root = path.resolve(__dirname, "..");
const typst = existsSync(path.join(root, "tools/typst")) ? path.join(root, "tools/typst") : null;
const epubcheck = path.join(root, "tools/epubcheck/epubcheck.jar");
const hasPdftotext = (() => {
  try {
    execFileSync("pdftotext", ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();
const hasJava = (() => {
  try {
    execFileSync("java", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

const custom: ThemeCustom = { justify: false, hyphenate: false, paraSpacing: 0.5, indentSize: 2, headingSpace: 1.4, subtitleStyle: "smallcaps", endnotes: "book" };

function styled() {
  const input = showcaseInput("accra");
  input.book.format = { ...input.book.format, custom };
  const ch = input.chapters.find((c) => c.title === "Every block")!;
  const extra: DocNode = {
    type: "paragraph",
    content: [
      { type: "text", text: "Jollof", marks: [{ type: "indexTerm", attrs: { term: "Jollof rice" } }] },
      { type: "text", text: " is cooked in one pot." },
      { type: "footnote", attrs: { text: "A note for the end of the book.", endnote: true } },
    ],
  };
  ch.content = { type: "doc", content: [extra, ...(ch.content?.content ?? [])] };
  return input;
}

describe("edit styles", () => {
  it("cleans the settings", () => {
    const t = textStyle({ ...themeFor({ theme: "accra" }), paraSpacing: 9, headingSpace: -3, subtitleStyle: "bogus" as never });
    expect(t.paraSpacing).toBe(2);
    expect(t.headingSpace).toBe(0.5);
    expect(t.subtitleStyle).toBe("italic");
    expect(textStyle(themeFor({ theme: "accra" })).justify).toBeNull();
  });

  it("reaches the ebook and website styles", () => {
    const css = themeCss(themeFor({ theme: "accra", custom }), { dropCaps: true });
    expect(css).toContain("text-indent: 2em");
    expect(css).toContain("text-align: left");
    expect(css).toContain("hyphens: manual");
    expect(css).toContain("margin: 0 0 0.5em");
    expect(css).toContain("font-variant: small-caps");
  });

  it("reaches print, with notes and an index at the back", () => {
    const src = buildTypst(styled(), { pageCount: 200 });
    expect(src).toContain("hyphenate: false");
    expect(src).toContain("justify: false");
    expect(src).toContain("first-line-indent: 2em");
    expect(src).toContain('#jp-ix("Jollof rice")');
    expect(src).toContain("#jp-note-group(");
    expect(src).toContain("#jp-index()");
  });

  it("puts the book's endnotes and index on their own pages in the ebook", async () => {
    const zip = await JSZip.loadAsync(await buildEpub(styled()));
    const names = Object.keys(zip.files);
    const notes = await zip.file(names.find((n) => n.endsWith("-notes.xhtml"))!)!.async("string");
    expect(notes).toContain("A note for the end of the book.");
    const index = await zip.file(names.find((n) => n.endsWith("-index.xhtml"))!)!.async("string");
    expect(index).toContain("Jollof rice");
    expect(index).toMatch(/href="e\d+-chapter\.xhtml#n\d+-ix1"/);
  });

  it.skipIf(!typst)(
    "typesets the styled book",
    () => {
      const dir = mkdtempSync(path.join(tmpdir(), "jp-styles-"));
      writeFileSync(path.join(dir, "book.typ"), buildTypst(styled(), { pageCount: 200 }));
      execFileSync(typst!, ["compile", "--font-path", path.join(root, "fonts"), "--ignore-system-fonts", path.join(dir, "book.typ"), path.join(dir, "book.pdf")], { stdio: "pipe" });
      if (!hasPdftotext) return;
      const text = execFileSync("pdftotext", [path.join(dir, "book.pdf"), "-"]).toString();
      expect(text).toMatch(/Jollof rice, \d+/);
      expect(text).toContain("A note for the end of the book.");
    },
    120_000,
  );

  it.skipIf(!hasJava || !existsSync(epubcheck))("passes EPUBCheck", async () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), "jp-styles-")), "styled.epub");
    writeFileSync(file, await buildEpub(styled()));
    execFileSync("java", ["-jar", epubcheck, file], { stdio: "pipe" });
  }, 120_000);
});
