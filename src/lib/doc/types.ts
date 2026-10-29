/**
 * Manuscript content is stored as ProseMirror/Tiptap JSON. Every export (EPUB, DOCX, Typst, the
 * public reader) is a serializer over this one shape, so the editor never has to round-trip HTML.
 */
export interface DocMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface DocNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  marks?: DocMark[];
  text?: string;
}

export const EMPTY_DOC: DocNode = { type: "doc", content: [{ type: "paragraph" }] };

export function plainText(node: DocNode | null | undefined, sep = " "): string {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return sep;
  if (node.type === "footnote") return "";
  const inner = (node.content ?? []).map((c) => plainText(c, sep));
  const text = inner.join("");
  return node.type === "paragraph" || node.type === "heading" || node.type === "chatMessage" || node.type === "tableCell" || node.type === "tableHeader" ? text + sep : text;
}

export function countWords(node: DocNode | null | undefined): number {
  const text = plainText(node).trim();
  if (!text) return 0;
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** Text of the first paragraph-ish block, for previews and meta descriptions. */
export function excerpt(node: DocNode | null | undefined, max = 220): string {
  const text = plainText(node).replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return text.slice(0, text.lastIndexOf(" ", max)).replace(/[,;:.\s]+$/, "") + "…";
}

export function paragraphsToDoc(text: string): DocNode {
  const paras = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return {
    type: "doc",
    content: paras.length ? paras.map((p) => ({ type: "paragraph", content: [{ type: "text", text: p.replace(/\n/g, " ") }] })) : [{ type: "paragraph" }],
  };
}

/** Collect image nodes so exporters can fetch and embed them. */
export function collectImages(node: DocNode | null | undefined, out: string[] = []): string[] {
  if (!node) return out;
  if ((node.type === "image" || node.type === "box") && typeof node.attrs?.src === "string" && node.attrs.src) out.push(node.attrs.src);
  for (const c of node.content ?? []) collectImages(c, out);
  return out;
}

/** Every scene-break ornament a document asks for by name (the theme's own is added by callers). */
export function collectOrnaments(node: DocNode | null | undefined, out: Set<string> = new Set()): Set<string> {
  if (!node) return out;
  if (node.type === "horizontalRule" && typeof node.attrs?.ornament === "string" && node.attrs.ornament) out.add(node.attrs.ornament);
  for (const c of node.content ?? []) collectOrnaments(c, out);
  return out;
}

/** A heading that starts a sub-chapter: level 2 with some text. Exports give the nth one the id `sub-n`. */
export function isSubhead(node: DocNode): boolean {
  return node.type === "heading" && Number(node.attrs?.level ?? 2) <= 2 && !!plainText(node, "").trim();
}

/** The sub-chapter headings of a chapter, in reading order. */
export function subheads(doc: DocNode | null | undefined): string[] {
  const out: string[] = [];
  const walk = (n: DocNode) => {
    if (isSubhead(n)) out.push(plainText(n, "").trim());
    else n.content?.forEach(walk);
  };
  if (doc) walk(doc);
  return out;
}
