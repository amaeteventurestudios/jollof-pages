import { describe, expect, it } from "vitest";
import { orderedElements, tocText } from "@/lib/book-model";
import { getTheme } from "@/lib/themes";
import type { Chapter } from "@/lib/types";

const ch = (kind: string, order: number, title: string, options: Chapter["options"] = null): Chapter =>
  ({ id: `${order}`, kind, section: "body", order, title, subtitle: "", content: null, word_count: 0, status: "draft", is_sample: false, in_toc: true, numbered: kind === "chapter", options }) as Chapter;

describe("box sets", () => {
  it("labels each volume and restarts chapter numbers", () => {
    const els = orderedElements(
      [ch("part", 0, "First Book", { volume: true }), ch("chapter", 1, "A"), ch("chapter", 2, "B"), ch("part", 3, "Second Book", { volume: true }), ch("part", 4, "Inner part"), ch("chapter", 5, "C")],
      getTheme("uyo"),
    );
    expect(els.map((e) => e.label)).toEqual(["Book One", "Chapter 1", "Chapter 2", "Book Two", "Part One", "Chapter 1"]);
    expect(tocText(els[3])).toBe("Book Two: Second Book");
  });
});
