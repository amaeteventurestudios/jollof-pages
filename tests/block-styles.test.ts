import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { boxStyle, cleanLook, cleanPresets } from "@/lib/blocks";
import { docToHtml } from "@/lib/doc/html";
import type { DocNode } from "@/lib/doc/types";
import { buildEpub } from "@/lib/export/epub";
import { buildTypst, docToTypst } from "@/lib/export/typst";
import { openingParagraph, paraCss, paraFormat } from "@/lib/paragraph";
import { paletteOf, themeCss } from "@/lib/theme-css";
import { themeFor } from "@/lib/themes";
import { showcaseInput } from "./showcase";

const root = path.resolve(__dirname, "..");
const typst = existsSync(path.join(root, "tools/typst")) ? path.join(root, "tools/typst") : null;

const p = (text: string, attrs?: Record<string, unknown>): DocNode => ({ type: "paragraph", ...(attrs ? { attrs } : {}), content: [{ type: "text", text }] });
const box = (variant: string, attrs: Record<string, unknown> = {}): DocNode => ({ type: "box", attrs: { variant, ...attrs }, content: [p("Meet me at noon.")] });

const custom = {
  boxes: { note: { fill: "#112233", corners: 2 as const } },
  boxPresets: [{ id: "hand1", name: "Market note", variant: "handwritten", look: { fontFamily: "Reenie Beanie", size: 1.5, border: "box" as const, weight: 3 as const } }],
};

describe("block looks", () => {
  it("keeps only safe values", () => {
    const look = cleanLook({ fill: "red;}body{x", border: "box", weight: 9, corners: 2, fontFamily: "Comic Sans", text: "#abcdef", size: 99 });
    expect(look.fill).toBeUndefined();
    expect(look.border).toBe("box");
    expect(look.weight).toBeUndefined();
    expect(look.corners).toBe(2);
    expect(look.fontFamily).toBeUndefined();
    expect(look.text).toBe("#abcdef");
    expect(cleanPresets([{ id: "x y", name: "bad" }, null, "z"])).toEqual([]);
  });

  it("layers catalog, book default, preset and the block's own look", () => {
    expect(boxStyle("note", custom).fill).toBe("#112233");
    const hand = boxStyle("handwritten", custom, undefined, "hand1");
    expect(hand.fontFamily).toBe("Reenie Beanie");
    expect(hand.fill).toBe("#fff8d6"); // from the catalog
    expect(boxStyle("handwritten", custom, { size: 1 }, "hand1").size).toBe(1);
    // a preset for another kind of block is ignored
    expect(boxStyle("note", custom, undefined, "hand1").fontFamily).toBeUndefined();
  });

  it("writes presets as classes and a block's own look inline", () => {
    const theme = themeFor({ theme: "accra", custom });
    const doc: DocNode = { type: "doc", content: [box("handwritten", { preset: "hand1" }), box("note", { look: { fill: "#000000" } })] };
    const { html } = docToHtml(doc, { mode: "web", palette: paletteOf(theme) });
    expect(html).toContain("blk-p-hand1");
    expect(html).toMatch(/class="[^"]*blk-own[^"]*"[^>]*style="[^"]*background-color: #000000/);
    const css = themeCss(theme, { dropCaps: true });
    expect(css).toContain(".blk.blk-p-hand1");
    expect(css).toContain("Reenie Beanie");
  });

  it("passes the look to print", () => {
    const theme = themeFor({ theme: "accra", custom });
    const src = docToTypst({ type: "doc", content: [box("handwritten", { preset: "hand1" }), box("note", { look: { corners: 0, fill: "#000000" } })] }, { book: theme });
    expect(src).toContain("Reenie Beanie");
    expect(src).toContain("radius: 0pt");
  });
});

describe("paragraph settings", () => {
  it("sanitises and turns settings into CSS", () => {
    const f = paraFormat({ first: true, tracking: 2, indent: 0, left: "3", dropCap: "yes" });
    expect(f).toEqual({ first: true, tracking: 0.3, indent: 0 });
    expect(paraCss({ noIndent: true, tracking: 0.1, left: 2 })).toBe("letter-spacing: 0.1em; text-indent: 0; margin-left: 2em");
    expect(openingParagraph([{ type: "heading" }, { type: "paragraph" }, { type: "paragraph", attrs: { first: true } }])).toBe(2);
    expect(openingParagraph([{ type: "paragraph" }])).toBe(-1);
  });

  it("moves the chapter opening to the marked paragraph", () => {
    const doc: DocNode = { type: "doc", content: [p("An epigraph."), p("The story starts.", { first: true }), p("Indented.", { left: 2 })] };
    const { html } = docToHtml(doc, { mode: "web" });
    expect(html).toMatch(/<p class="first[^"]*">The story starts/);
    expect(html).not.toMatch(/<p class="first[^"]*">An epigraph/);
    expect(html).toContain("margin-left: 2em");
  });
});

describe("styled books build", () => {
  const styled = () => {
    const input = showcaseInput("accra");
    input.book.format = { ...input.book.format, custom };
    const ch = input.chapters.find((c) => c.title === "Every block")!;
    ch.content = {
      type: "doc",
      content: [p("Opener.", { first: true, leadIn: true, dropCap: true }), box("handwritten", { preset: "hand1" }), box("note", { look: { fill: "#222222", weight: 3, corners: 0, labelColor: "#ffcc00" } }), p("Spaced.", { tracking: 0.1, left: 1.5 })],
    };
    return input;
  };

  it("makes an EPUB with the styles", async () => {
    const zip = await JSZip.loadAsync(await buildEpub(styled()));
    const css = await zip.file(Object.keys(zip.files).find((n) => n.endsWith(".css"))!)!.async("string");
    expect(css).toContain(".blk.blk-p-hand1");
  });

  it.skipIf(!typst)(
    "typesets styled blocks and paragraphs",
    () => {
      const dir = mkdtempSync(path.join(tmpdir(), "jp-style-"));
      writeFileSync(path.join(dir, "book.typ"), buildTypst(styled(), { pageCount: 200 }));
      execFileSync(typst!, ["compile", "--font-path", path.join(root, "fonts"), "--ignore-system-fonts", path.join(dir, "book.typ"), path.join(dir, "book.pdf")], { stdio: "pipe" });
    },
    120_000,
  );
});
