import { BLOCKS, blockTemplate } from "@/lib/blocks";
import { ELEMENT_KINDS } from "@/lib/elements";
import type { ExportInput } from "@/lib/book-model";
import type { DocNode } from "@/lib/doc/types";
import { sampleExportInput } from "@/lib/sample-book";
import type { Chapter } from "@/lib/types";

const p = (text: string): DocNode => ({ type: "paragraph", content: [{ type: "text", text }] });

/** A book that uses every block and every section type, with backgrounds and ornaments. */
export function showcaseInput(theme = "accra"): ExportInput {
  const input = sampleExportInput();
  input.book.format = { ...input.book.format, theme, pageBackground: { src: "bg:linen", strength: 0.6, where: "openers" } };
  const blocks: DocNode[] = [p("Every block in the catalog follows.")];
  for (const b of BLOCKS) {
    blocks.push({ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: b.label }] });
    const tpl = blockTemplate(b.id);
    if (tpl) blocks.push(tpl);
    else if (b.kind === "footnote" || b.kind === "endnote") blocks.push({ type: "paragraph", content: [{ type: "text", text: "A sentence with a note." }, { type: "footnote", attrs: { text: "The note.", endnote: b.kind === "endnote" } }] });
    else if (b.kind === "image") blocks.push(p("(a picture goes here)"));
    else blocks.push(p(`${b.label} 😀`));
  }
  blocks.push({ type: "horizontalRule", attrs: { ornament: "rose-flanked" } });
  blocks.push(p("After a rose."));
  const base = { title: "", subtitle: "", content: null, word_count: 0, status: "draft", is_sample: false, in_toc: true, numbered: false, options: null, collectionId: "chapters", book: input.book.id, owner: "u", created: "", updated: "" };
  const extra: Partial<Chapter>[] = [
    { kind: "chapter", section: "body", numbered: true, title: "Every block", content: { type: "doc", content: blocks }, options: { background: "bg:kente", backgroundStrength: 0.5, backgroundOpener: true } },
    { kind: "chapter", section: "body", numbered: true, title: "A whole chapter on mudcloth", content: { type: "doc", content: [p("Background behind every page.")] }, options: { background: "bg:bogolan", backgroundStrength: 0.7 } },
    { kind: "chapter", section: "body", numbered: true, title: "Marble and gold", content: { type: "doc", content: [p("A painted spread across both pages."), p("It runs on to the next page.")] }, options: { background: "bg:marble-gold" } },
    { kind: "chapter", section: "body", numbered: true, title: "Night marble", content: { type: "doc", content: [p("Light text on a dark painted spread.")] }, options: { background: "bg:marble-night", backgroundStrength: 0.9 } },
    { kind: "chapter", section: "body", numbered: true, title: "Ebook only chapter", content: { type: "doc", content: [p("Only in the ebook.")] }, options: { only: "ebook" } },
  ];
  // one of every section type that is not already in the sample
  const have = new Set(input.chapters.map((c) => c.kind));
  ELEMENT_KINDS.filter((k) => !have.has(k.id) && k.id !== "chapter").forEach((k, i) =>
    extra.push({ kind: k.id, section: k.section, title: k.label, order: 50 + i, in_toc: k.inToc, content: k.smart ? null : { type: "doc", content: [p(`${k.label}: ${k.hint}`)] } }),
  );
  input.chapters = [...input.chapters, ...extra.map((c, i) => ({ ...base, order: 10 + i, ...c, id: `x${i}` }) as Chapter)];
  return input;
}
