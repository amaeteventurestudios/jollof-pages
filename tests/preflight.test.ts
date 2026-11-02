import { describe, expect, it } from "vitest";
import { preflightBook, storeReadiness, type Finding } from "@/lib/preflight";
import { accessibilityMeta } from "@/lib/export/epub";
import { sampleExportInput } from "@/lib/sample-book";
import type { ExportInput } from "@/lib/book-model";

const ids = (f: Finding[]) => f.map((x) => x.id);

function ready(): ExportInput {
  const input = sampleExportInput();
  input.book.cover = "cover.jpg";
  input.book.cover_full = "full.pdf";
  input.book.page_count = 180;
  input.book.keywords = ["first book", "writing"];
  return input;
}

describe("ready to publish checks", () => {
  it("passes a finished book with nothing to stop it", () => {
    const f = preflightBook(ready(), { cover: { width: 1600, height: 2560 } });
    expect(f.filter((x) => x.level === "stop")).toEqual([]);
  });

  it("stops a missing or tiny ebook cover and warns Apple-sized ones", () => {
    const input = ready();
    input.book.cover = "";
    expect(ids(preflightBook(input))).toContain("ebook-cover");
    expect(ids(preflightBook(ready(), { cover: { width: 500, height: 800 } }))).toContain("ebook-cover-small");
    expect(ids(preflightBook(ready(), { cover: { width: 1200, height: 1920 } }))).toContain("ebook-cover-apple");
    expect(ids(preflightBook(ready(), { cover: { width: 2000, height: 2000 } }))).toContain("ebook-cover-shape");
  });

  it("checks ISBN check digits and editions sharing one", () => {
    const input = ready();
    input.book.isbn_paperback = "978-0-306-40615-3";
    input.book.isbn_ebook = "9780306406157";
    const f = preflightBook(input);
    expect(ids(f)).toContain("isbn-paperback");
    expect(ids(f)).not.toContain("isbn-ebook");
    input.book.isbn_paperback = "9780306406157";
    expect(ids(preflightBook(input))).toContain("isbn-dup-paperback");
  });

  it("finds leftover placeholder text and points at the chapter", () => {
    const input = ready();
    const ch = input.chapters.find((c) => c.kind === "chapter")!;
    ch.content = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "She walked into the room. TK describe the market here." }] }] };
    const hit = preflightBook(input).find((x) => x.id === `placeholder-${ch.id}`);
    expect(hit?.chapterId).toBe(ch.id);
    expect(hit?.detail).toContain("TK describe");
  });

  it("does not mistake ordinary words for placeholders", () => {
    const input = ready();
    const ch = input.chapters.find((c) => c.kind === "chapter")!;
    ch.content = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "The TKO came in round two. Todo list: buy rice [sic]." }] }] };
    expect(ids(preflightBook(input)).some((i) => i.startsWith("placeholder"))).toBe(false);
  });

  it("asks for picture descriptions, treating camera file names as none", () => {
    const input = ready();
    const ch = input.chapters.find((c) => c.kind === "chapter")!;
    ch.content = {
      type: "doc",
      content: [
        { type: "image", attrs: { src: "a.jpg", alt: "IMG 2034" } },
        { type: "image", attrs: { src: "b.jpg", alt: "A pot of jollof on a coal fire" } },
      ],
    };
    const alt = preflightBook(input).find((x) => x.id === "alt-text");
    expect(alt?.title).toBe("1 picture has no description");
  });

  it("warns about pictures too small to print sharply", () => {
    const input = ready();
    const ch = input.chapters.find((c) => c.kind === "chapter")!;
    ch.content = { type: "doc", content: [{ type: "image", attrs: { src: "a.jpg", alt: "x", layout: "full" } }] };
    const soft = preflightBook(input, { images: new Map([["a.jpg", { width: 600, height: 400 }]]) }).find((x) => x.id === "soft-pictures");
    expect(soft?.level).toBe("warn");
    expect(preflightBook(input, { images: new Map([["a.jpg", { width: 3000, height: 2000 }]]) }).some((x) => x.id === "soft-pictures")).toBe(false);
  });

  it("checks the printed page count against KDP's limits", () => {
    const input = ready();
    input.book.page_count = 12;
    expect(ids(preflightBook(input))).toContain("pages-range-paperback");
    input.book.page_count = 0;
    expect(ids(preflightBook(input))).toContain("pages-paperback");
  });

  it("puts stops first", () => {
    const input = ready();
    input.book.title = "";
    input.book.keywords = [];
    const f = preflightBook(input);
    expect(f[0].level).toBe("stop");
    expect(f.at(-1)!.level).toBe("tip");
  });
});

describe("store readiness", () => {
  it("is ready everywhere for a clean book, except IngramSpark without an ISBN", () => {
    const input = ready();
    const s = storeReadiness(preflightBook(input, { cover: { width: 1600, height: 2560 } }), input.book, { errors: 0 });
    expect(s.find((x) => x.id === "apple")!.level).toBe("ready");
    expect(s.find((x) => x.id === "kdp-print")!.level).toBe("ready");
    expect(s.find((x) => x.id === "ingram")!.level).toBe("stop");
  });

  it("lets KDP through with EPUBCheck errors but not Apple or Kobo", () => {
    const input = ready();
    const s = storeReadiness(preflightBook(input, { cover: { width: 1600, height: 2560 } }), input.book, { errors: 2 });
    expect(s.find((x) => x.id === "kdp-ebook")!.level).toBe("warn");
    expect(s.find((x) => x.id === "apple")!.level).toBe("stop");
    expect(s.find((x) => x.id === "kobo")!.level).toBe("stop");
  });

  it("does not hold KDP back for an Apple-only cover size", () => {
    const input = ready();
    const s = storeReadiness(preflightBook(input, { cover: { width: 1200, height: 1920 } }), input.book, { errors: 0 });
    expect(s.find((x) => x.id === "kdp-ebook")!.level).toBe("ready");
    expect(s.find((x) => x.id === "apple")!.level).toBe("warn");
  });
});

describe("EPUB accessibility metadata", () => {
  it("claims alternative text only when every picture is described", () => {
    const img = (alt: string) => ({ type: "doc", content: [{ type: "image", attrs: { src: "a", alt } }] });
    expect(accessibilityMeta([img("A pot")], true)).toContain("alternativeText");
    const some = accessibilityMeta([img("A pot"), img("")], true);
    expect(some).not.toContain("alternativeText");
    expect(some).toContain("textual,visual");
    const text = accessibilityMeta([{ type: "doc", content: [] }], false);
    expect(text).not.toContain("visual");
    expect(text).toContain("accessibilityHazard\">none");
  });
});
