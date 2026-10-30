import { describe, expect, it } from "vitest";
import { chapterStats, docToMarkdown, splitDoc } from "@/lib/doc/markdown";
import type { DocNode } from "@/lib/doc/types";

const p = (text: string, marks?: string[]): DocNode => ({ type: "paragraph", content: [{ type: "text", text, ...(marks ? { marks: marks.map((type) => ({ type })) } : {}) }] });
const h = (text: string): DocNode => ({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] });

describe("chapter tools", () => {
  it("writes Markdown with notes, lists and blocks", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        h("Start"),
        { type: "paragraph", content: [{ type: "text", text: "Bold", marks: [{ type: "bold" }] }, { type: "text", text: " and a note" }, { type: "footnote", attrs: { text: "The source." } }] },
        { type: "bulletList", content: [{ type: "listItem", content: [p("One")] }, { type: "listItem", content: [p("Two")] }] },
        { type: "box", attrs: { variant: "tip" }, content: [p("Drink water.")] },
        { type: "horizontalRule" },
      ],
    };
    const md = docToMarkdown(doc, "Chapter one");
    expect(md).toContain("# Chapter one");
    expect(md).toContain("## Start");
    expect(md).toContain("**Bold** and a note[^1]");
    expect(md).toContain("- One\n- Two");
    expect(md).toContain("> **Tip**");
    expect(md).toContain("* * *");
    expect(md).toContain("[^1]: The source.");
  });

  it("counts words, sentences and dialogue", () => {
    const st = chapterStats({ type: "doc", content: [p("“Come here,” she said. He came."), p("The end.")] });
    expect(st.words).toBe(8);
    expect(st.paragraphs).toBe(2);
    expect(st.sentences).toBe(3);
    expect(st.dialogue).toBe(25);
  });

  it("splits before a block and takes a heading as the new title", () => {
    const { first, second, title } = splitDoc({ type: "doc", content: [p("a"), h("Part two"), p("b")] }, 1);
    expect(first.content).toHaveLength(1);
    expect(title).toBe("Part two");
    expect(second.content).toEqual([p("b")]);
  });
});
