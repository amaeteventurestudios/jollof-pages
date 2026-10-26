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
  return node.type === "paragraph" || node.type === "heading" ? text + sep : text;
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
    content: paras.length
      ? paras.map((p) => ({ type: "paragraph", content: [{ type: "text", text: p.replace(/\n/g, " ") }] }))
      : [{ type: "paragraph" }],
  };
}

/** Collect image nodes so exporters can fetch and embed them. */
export function collectImages(node: DocNode | null | undefined, out: string[] = []): string[] {
  if (!node) return out;
  if (node.type === "image" && typeof node.attrs?.src === "string") out.push(node.attrs.src);
  for (const c of node.content ?? []) collectImages(c, out);
  return out;
}
