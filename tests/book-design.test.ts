import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { BACKGROUNDS, backgroundArt } from "@/lib/backgrounds";
import { BLOCKS } from "@/lib/blocks";
import { ELEMENT_KINDS } from "@/lib/elements";
import { buildEpub } from "@/lib/export/epub";
import { buildTypst } from "@/lib/export/typst";
import { FONTS } from "@/lib/fonts";
import { ORNAMENTS, ornamentSvg } from "@/lib/ornaments";
import { THEMES, themeFor } from "@/lib/themes";
import { readFileSync } from "node:fs";
import { showcaseInput } from "./showcase";

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

describe("book design library", () => {
  it("has three times Lacuna's catalog", () => {
    expect(THEMES).toHaveLength(93);
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(93);
    expect(BLOCKS.length).toBeGreaterThanOrEqual(51);
    expect(ELEMENT_KINDS.length).toBeGreaterThanOrEqual(78);
    expect(new Set(ELEMENT_KINDS.map((k) => k.id)).size).toBe(ELEMENT_KINDS.length);
    expect(BACKGROUNDS).toHaveLength(112);
    expect(BACKGROUNDS.filter((b) => b.group === "Painted")).toHaveLength(12);
    expect(ORNAMENTS).toHaveLength(60);
  });

  it("only uses fonts, ornaments and backgrounds that exist", () => {
    const families = new Set(FONTS.map((f) => f.family));
    for (const t of THEMES) {
      expect(families.has(t.bodyFont), t.id).toBe(true);
      expect(families.has(t.headingFont), t.id).toBe(true);
      if (t.labelFont) expect(families.has(t.labelFont), t.id).toBe(true);
      expect(ORNAMENTS.some((o) => o.id === t.ornament), t.id).toBe(true);
      if (t.openerBackground) expect(BACKGROUNDS.some((b) => b.id === t.openerBackground), t.id).toBe(true);
    }
    for (const b of BACKGROUNDS) expect(backgroundArt(b.id, 0.7)?.svg, b.id).toMatch(/^<svg /);
    for (const o of ORNAMENTS) if (o.kind === "drawn") expect(ornamentSvg(o.id)?.svg, o.id).toMatch(/^<svg /);
  });

  it("keeps scripts/fonts.txt in step with the font list", () => {
    const listed = readFileSync(path.join(root, "scripts/fonts.txt"), "utf8")
      .split("\n")
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => l.split("|")[0]);
    expect(listed).toEqual(FONTS.map((f) => f.family));
  });

  it("applies an author's theme changes", () => {
    const t = themeFor({ theme: "lagos", custom: { accent: "#ff0000", headingFont: "Cinzel", dropCap: "boxed" } });
    expect(t.accent).toBe("#ff0000");
    expect(t.headingCss).toContain("Cinzel");
    expect(t.dropCap).toBe("boxed");
    expect(t.bodyFont).toBe("Literata");
  });

  it("puts every block, section and background into the EPUB", async () => {
    const zip = await JSZip.loadAsync(await buildEpub(showcaseInput()));
    const texts = await Promise.all(
      Object.keys(zip.files)
        .filter((n) => n.startsWith("OEBPS/text/") && !zip.files[n].dir)
        .map((n) => zip.file(n)!.async("string")),
    );
    const all = texts.join("\n");
    expect(all).toContain('class="chat"');
    expect(all).toContain('class="cols cols-3"');
    expect(all).toContain('<table class="book-table">');
    expect(all).toContain("blk-newspaper");
    expect(all).toContain("images/orn-rose-flanked.svg");
    expect(all).toContain("bg-kente-50.svg");
    expect(all).toContain("Only in the ebook.");
    expect(all).not.toContain("blk-print_only");
    expect(Object.keys(zip.files)).toContain("OEBPS/images/bg-bogolan-70.svg");
  });

  it.skipIf(!hasJava || !existsSync(epubcheck))("passes EPUBCheck with every block", async () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), "jp-test-")), "showcase.epub");
    writeFileSync(file, await buildEpub(showcaseInput("zanzibar")));
    execFileSync("java", ["-jar", epubcheck, file], { stdio: "pipe" });
  });

  it("leaves ebook-only sections out of print", () => {
    const src = buildTypst(showcaseInput(), { pageCount: 200 });
    expect(src).not.toContain("Only in the ebook.");
    expect(src).toContain("#jp-msg(");
    expect(src).toContain("#jp-table(");
    expect(src).toContain("tiling(");
    // painted spreads run across facing pages, and dark ones set light text
    expect(src).toContain("dx: if calc.even(here().page())");
    expect(src).toContain('#set text(fill: rgb("#f3ede2"))');
  });

  it("follows the page layout rules", () => {
    const input = showcaseInput();
    input.book.format = { ...input.book.format, chaptersOnRight: false, countFrontMatter: true, margins: { inside: 0.1, outside: 1, pictureGutter: 0.5 } };
    const src = buildTypst(input, { pageCount: 200 });
    expect(src).toContain('numbering: "1"');
    expect(src).not.toContain("#counter(page).update(1)");
    // only the first chapter is pushed to a right-hand page
    expect(src.match(/#pagebreak\(to: "odd"\)/g)).toHaveLength(1);
    // KDP's minimum gutter wins over a too-small inside margin
    expect(src).toContain("inside: 0.5in");
    expect(src).toContain("outside: 1in");
  });

  it("marks dark painted pages for light text in the ebook", async () => {
    const zip = await JSZip.loadAsync(await buildEpub(showcaseInput()));
    const texts = await Promise.all(Object.keys(zip.files).filter((n) => n.startsWith("OEBPS/text/") && !zip.files[n].dir).map((n) => zip.file(n)!.async("string")));
    expect(texts.join("\n")).toContain("has-bg bg-dark");
  });

  it.skipIf(!typst)(
    "typesets every block in a range of themes",
    () => {
      const dir = mkdtempSync(path.join(tmpdir(), "jp-test-"));
      for (const theme of ["accra", "zanzibar", "lalibela", "johannesburg", "arusha", "brazzaville", "rabat", "entebbe"]) {
        writeFileSync(path.join(dir, "book.typ"), buildTypst(showcaseInput(theme), { pageCount: 200 }));
        execFileSync(typst!, ["compile", "--font-path", path.join(root, "fonts"), "--ignore-system-fonts", path.join(dir, "book.typ"), path.join(dir, `${theme}.pdf`)], { stdio: "pipe" });
      }
    },
    180_000,
  );
});
