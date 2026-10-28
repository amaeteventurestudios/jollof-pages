import type { DocNode } from "./types";

/**
 * Tracked changes that have not been accepted yet are not part of the book. Exports, the preview
 * and the website read a chapter as if every pending suggestion were rejected: suggested insertions
 * drop out and suggested deletions stay as ordinary text.
 */

const INSERT = "suggestion_insert";
const DELETE = "suggestion_delete";

export function hasSuggestions(node: DocNode | null | undefined): boolean {
  if (!node) return false;
  if (node.marks?.some((m) => m.type === INSERT || m.type === DELETE)) return true;
  return (node.content ?? []).some(hasSuggestions);
}

function clean(node: DocNode): DocNode | null {
  if (node.type === "text") {
    const marks = node.marks ?? [];
    if (marks.some((m) => m.type === INSERT)) return null;
    if (marks.some((m) => m.type === DELETE)) {
      // the pilcrows and zero-width spaces stand in for removed paragraph breaks while a deletion is pending
      const text = (node.text ?? "").replace(/[¶​]/g, "");
      if (!text) return null;
      const rest = marks.filter((m) => m.type !== DELETE);
      return { ...node, text, ...(rest.length ? { marks: rest } : { marks: undefined }) };
    }
    return node;
  }
  if (!node.content) return node;
  const content = node.content.map(clean).filter((n): n is DocNode => n !== null);
  // a paragraph made only of suggested text goes with it
  if (node.content.length && !content.length && (node.type === "paragraph" || node.type === "heading")) return null;
  return { ...node, content };
}

export function withoutSuggestions(doc: DocNode | null): DocNode | null {
  if (!doc || !hasSuggestions(doc)) return doc;
  return clean(doc) ?? { type: "doc", content: [{ type: "paragraph" }] };
}

/** How many separate pending changes a chapter holds, for checklists. */
export function countSuggestions(node: DocNode | null | undefined): number {
  let n = 0;
  let last = "";
  const walk = (x: DocNode) => {
    const m = x.marks?.find((k) => k.type === INSERT || k.type === DELETE);
    const key = m ? `${m.type}:${String(m.attrs?.username ?? "")}` : "";
    // a run of the same change counts once, even across paragraph breaks
    if (x.type === "text") {
      if (key && key !== last) n++;
      last = key;
    }
    for (const c of x.content ?? []) walk(c);
  };
  if (node) walk(node);
  return n;
}
