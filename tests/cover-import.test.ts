import { describe, expect, it } from "vitest";
import { checkCover, readHandoff } from "@/lib/cover-import";
import { coverGeometry } from "@/lib/kdp";

const pdf = new Blob(["%PDF-1.7"], { type: "application/pdf" });
const front = new Blob(["jpg"], { type: "image/jpeg" });
const msg = (over: Record<string, unknown> = {}) => ({ type: "jp-cover", version: 1, book: "b99k6dwhsqv8phh", binding: "paperback", trimWidth: 6, trimHeight: 9, pages: 300, paper: "white", title: "Small Pot", pdf, front, ...over });
const sheet = (trim: string, pages: number, paper: "white" | "cream" = "white", binding: "paperback" | "hardcover" = "paperback") => {
  const g = coverGeometry(trim, pages, paper, binding);
  return { width: g.width, height: g.height };
};

describe("covers sent from Jollof Studio", () => {
  it("accepts a well-formed cover", () => {
    const c = readHandoff(msg());
    expect("error" in c).toBe(false);
    expect(c).toMatchObject({ book: "b99k6dwhsqv8phh", binding: "paperback", pages: 300, paper: "white" });
  });

  it("turns away anything that isn't a cover, with a reason a writer can act on", () => {
    expect(readHandoff(null)).toHaveProperty("error");
    expect(readHandoff({ type: "something-else" })).toHaveProperty("error");
    expect(readHandoff(msg({ version: 2 }))).toEqual({ error: expect.stringContaining("newer Jollof Studio") });
    expect(readHandoff(msg({ pdf: "not a file" }))).toHaveProperty("error");
    expect(readHandoff(msg({ pdf: new Blob(["x"], { type: "image/png" }) }))).toEqual({ error: "The full cover should be a PDF." });
    expect(readHandoff(msg({ pages: 0 }))).toHaveProperty("error");
    expect(readHandoff(msg({ paper: "glossy" }))).toHaveProperty("error");
    expect(readHandoff(msg({ binding: "spiral" }))).toHaveProperty("error");
  });

  it("refuses a PDF bigger than the book can hold", () => {
    const big = { type: "application/pdf", size: 60 * 1024 * 1024 } as Blob;
    Object.setPrototypeOf(big, Blob.prototype);
    expect(readHandoff(msg({ pdf: big }))).toEqual({ error: expect.stringContaining("up to 50 MB") });
  });

  it("drops a book id that isn't a record id", () => {
    const c = readHandoff(msg({ book: "../users" }));
    expect("error" in c ? null : c.book).toBeUndefined();
  });
});

describe("checking a cover against its book", () => {
  const book = { trim: "6x9", paper: "white" as const, pages: 300, pagesEstimated: false };
  const cover = { binding: "paperback" as const, trimWidth: 6, trimHeight: 9, pages: 300, paper: "white" as const };

  it("passes a cover made for this book", () => {
    const r = checkCover(cover, sheet("6x9", 300), book);
    expect(r.level).toBe("ok");
    expect(r.notes).toEqual([]);
  });

  it("catches a spine made for an old page count and says what to change", () => {
    const r = checkCover({ ...cover, pages: 240 }, sheet("6x9", 240), book);
    expect(r.level).toBe("warn");
    expect(r.notes[0]).toContain("240 pages, but your book is now 300 pages");
    expect(r.notes[0]).toContain("set the page count to 300");
  });

  it("catches a spine made for the wrong paper", () => {
    const r = checkCover({ ...cover, paper: "cream" }, sheet("6x9", 300, "cream"), book);
    expect(r.level).toBe("warn");
    expect(r.notes[0]).toContain("set the paper to white");
  });

  it("lets a small page difference through when the spine comes out the same", () => {
    const r = checkCover({ ...cover, pages: 301 }, sheet("6x9", 301), book);
    expect(r.level).toBe("ok");
    expect(r.notes[0]).toContain("works out the same width");
  });

  it("stops a cover made for another trim size", () => {
    const r = checkCover({ ...cover, trimWidth: 5.5, trimHeight: 8.5 }, sheet("5.5x8.5", 300), book);
    expect(r.level).toBe("stop");
    expect(r.notes.join(" ")).toContain("set the trim size to 6 x 9");
  });

  it("stops a PDF that isn't the size its settings say (a broken or wrong file)", () => {
    const r = checkCover(cover, { width: 12, height: 9 }, book);
    expect(r.level).toBe("stop");
    expect(r.notes[0]).toContain("Send it again");
  });

  it("stops a size KDP doesn't print", () => {
    expect(checkCover({ ...cover, trimWidth: 4, trimHeight: 4 }, { width: 8.5, height: 4.25 }, book).level).toBe("stop");
  });

  it("checks a hardcover against the hardcover's own sheet", () => {
    const hc = { ...cover, binding: "hardcover" as const };
    expect(checkCover(hc, sheet("6x9", 300, "white", "hardcover"), book).level).toBe("ok");
    expect(checkCover(hc, sheet("6x9", 300), book).level).toBe("stop");
  });

  it("reminds the writer when the page count is still an estimate, and about blank spines under 79 pages", () => {
    expect(checkCover(cover, sheet("6x9", 300), { ...book, pagesEstimated: true }).notes.join(" ")).toContain("estimate");
    const thin = checkCover({ ...cover, pages: 60 }, sheet("6x9", 60), { ...book, pages: 60 });
    expect(thin.notes.join(" ")).toContain("no text on the spine");
  });
});
