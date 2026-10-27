// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { markdownToElements } from "@/lib/import/markdown";

const md = `\`\`\`markdown
# Introduction

Why this book exists.

# Chapter 1: Know your reader

Start with **one** reader.[^1]

## A smaller heading

- first
- second

---

After the break.

# Acknowledgments

Thanks.

[^1]: Not everyone & their aunt.
\`\`\``;

describe("markdown import", () => {
  const els = markdownToElements(md);
  it("splits chapters on # and places front and back matter", () => {
    expect(els.map((e) => [e.kind, e.section, e.title])).toEqual([
      ["introduction", "front", "Introduction"],
      ["chapter", "body", "Know your reader"],
      ["acknowledgments", "back", "Acknowledgments"],
    ]);
  });
  it("keeps headings, lists, scene breaks and footnotes", () => {
    const json = JSON.stringify(els[1].content);
    expect(json).toContain('"level":2');
    expect(json).toContain("bulletList");
    expect(json).toContain("horizontalRule");
    expect(json).toContain('"text":"Not everyone & their aunt."');
    expect(json).toContain('"type":"bold"');
  });
});
