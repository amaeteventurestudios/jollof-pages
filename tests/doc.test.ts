import { describe, expect, it } from "vitest";
import { countWords, paragraphsToDoc, plainText } from "@/lib/doc/types";
import { docToHtml, escapeHtml } from "@/lib/doc/html";
import { slugify } from "@/lib/slug";
import { cleanChapterTitle, guessKind } from "@/lib/import/docx";

const doc = {
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "Hello " }, { type: "text", text: "world", marks: [{ type: "italic" }] }, { type: "footnote", attrs: { text: "A note & more" } }] },
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Next <part>" }] },
    { type: "horizontalRule" },
  ],
};

describe("manuscript documents", () => {
  it("counts words and extracts text", () => {
    expect(countWords(doc)).toBe(4);
    expect(plainText(paragraphsToDoc("One two\n\nthree"))).toContain("three");
  });

  it("renders web HTML with footnotes and escaping", () => {
    const { html, notes } = docToHtml(doc, { mode: "web" });
    expect(html).toContain("<em>world</em>");
    expect(html).toContain("Next &lt;part&gt;");
    expect(notes).toContain("A note &amp; more");
    expect(escapeHtml(`"a"&<b>`)).toBe("&quot;a&quot;&amp;&lt;b&gt;");
  });

  it("renders EPUB footnotes as noterefs", () => {
    const { html } = docToHtml(doc, { mode: "epub" });
    expect(html).toContain('epub:type="noteref"');
  });

  it("makes clean slugs", () => {
    expect(slugify("Small Pot, Big Fire!")).toBe("small-pot-big-fire");
  });

  it("recognises book parts when importing Word files", () => {
    expect(guessKind("Acknowledgements", true)).toBe("acknowledgments");
    expect(guessKind("Introduction", false)).toBe("introduction");
    expect(guessKind("Chapter 4: Pricing", true)).toBe("chapter");
    expect(cleanChapterTitle("Chapter 4: Pricing")).toBe("Pricing");
    expect(cleanChapterTitle("Chapter Four")).toBe("Chapter Four");
  });
});
