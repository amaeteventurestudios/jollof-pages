import { describe, expect, it } from "vitest";
import { pictureAlign, pictureWidth } from "@/lib/picture";
import { docToHtml } from "@/lib/doc/html";
import { buildTypst } from "@/lib/export/typst";
import { sampleExportInput } from "@/lib/sample-book";

const pic = (attrs: Record<string, unknown>) => ({ type: "doc", content: [{ type: "image", attrs: { src: "https://x.test/a.webp", alt: "A pot", ...attrs } }] });

describe("pictures in a chapter", () => {
  it("reads the place, falling back to centred", () => {
    expect(pictureAlign("left")).toBe("left");
    expect(pictureAlign("full")).toBe("full");
    expect(pictureAlign("small")).toBe("center");
    expect(pictureAlign(undefined)).toBe("center");
  });

  it("keeps a set width and gives older pictures the size they had", () => {
    expect(pictureWidth({ width: 33 })).toBe(33);
    expect(pictureWidth({ width: "60" })).toBe(60);
    expect(pictureWidth({ width: 5, layout: "left" })).toBe(42);
    expect(pictureWidth({ width: 400 })).toBe(85);
    expect(pictureWidth({ layout: "full" })).toBe(100);
    expect(pictureWidth({ layout: "small" })).toBe(50);
    expect(pictureWidth(null)).toBe(85);
  });

  it("writes the place and width into the book page", () => {
    const out = docToHtml(pic({ layout: "right", width: 40, title: "Mama's pot" }) as never, {} as never).html;
    expect(out).toContain('<figure class="fig-right" style="width: 40%">');
    expect(out).toContain("<figcaption>Mama's pot</figcaption>");
  });

  it("sizes and places the picture in the print book", () => {
    const input = sampleExportInput();
    input.chapters.find((c) => c.kind === "chapter")!.content = pic({ layout: "left", width: 33 }) as never;
    const src = buildTypst(input, { pageCount: 120, imagePath: () => "img/1.webp" });
    expect(src).toMatch(/#align\(left, figure\(image\([^)]*, width: 33%\)/);
  });
});
