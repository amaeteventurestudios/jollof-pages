import { describe, expect, it } from "vitest";
import { plainTextToMarkdown, rtfToHtml, stripGutenberg } from "@/lib/import/text-formats";

const GUTENBERG = `The Project Gutenberg eBook of A Tale
This eBook is for the use of anyone anywhere.

*** START OF THE PROJECT GUTENBERG EBOOK A TALE ***

CHAPTER I.
The Beginning

It was a truth
universally acknowledged.

Second paragraph.

CHAPTER II.

Another chapter.

*** END OF THE PROJECT GUTENBERG EBOOK A TALE ***

Licence text here.`;

describe("plain text and Gutenberg", () => {
  it("keeps only the book between the Gutenberg markers", () => {
    const out = stripGutenberg(GUTENBERG);
    expect(out).toContain("CHAPTER I.");
    expect(out).not.toContain("Licence text");
    expect(out).not.toContain("anyone anywhere");
  });

  it("turns chapter lines into headings and rejoins wrapped lines", () => {
    const md = plainTextToMarkdown(GUTENBERG);
    expect(md).toContain("# CHAPTER I: The Beginning");
    expect(md).toContain("# CHAPTER II");
    expect(md).toContain("It was a truth universally acknowledged.");
  });

  it("leaves Markdown headings alone", () => {
    expect(plainTextToMarkdown("# One\n\nText")).toBe("# One\n\nText");
  });
});

describe("RTF", () => {
  it("reads paragraphs, bold, italic, escapes and headings", () => {
    // written out so the build tool does not decode it inside String.raw
    const EM = "\\u8212?";
    const rtf = String.raw`{\rtf1\ansi\deff0{\fonttbl{\f0 Times;}}{\stylesheet{\s1 heading 1;}}
{\pard\s1 Chapter One\par}
{\pard It was \b bold\b0  and \i slanted\i0 . Caf\'e9 ${EM} done.\par}
{\pard\plain {\*\generator Riched20;}Plain text\par}
}`;
    const html = rtfToHtml(rtf);
    expect(html).toContain("<h1>Chapter One</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>slanted</em>");
    expect(html).toContain("Café");
    expect(html).toContain("— done.");
    expect(html).toContain("<p>Plain text</p>");
    expect(html).not.toContain("Times");
    expect(html).not.toContain("Riched20");
  });
});
