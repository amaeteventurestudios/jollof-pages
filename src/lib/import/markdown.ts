"use client";

import { marked } from "marked";
import { htmlToElements, type ImportedElement } from "./docx";

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * A Markdown manuscript, such as one written with ChatGPT, as book elements. Chapters split on the
 * top heading level used more than once, exactly as the Word import does; `[^1]` footnotes become
 * the editor's inline footnotes.
 */
export function markdownToElements(text: string): ImportedElement[] {
  const notes = new Map<string, string>();
  const body = text
    .replace(/\r\n?/g, "\n")
    // a leading "```markdown" fence that chat apps sometimes wrap the whole answer in
    .replace(/^\s*```(?:markdown|md)?\n([\s\S]*?)\n```\s*$/, "$1")
    .replace(/^\[\^([^\]]+)\]:[ \t]*(.*(?:\n(?: {2,}|\t).*)*)/gm, (_, id: string, note: string) => {
      notes.set(id, note.replace(/\n\s+/g, " ").trim());
      return "";
    })
    .replace(/\[\^([^\]]+)\]/g, (m, id: string) => (notes.has(id) ? `<span data-footnote="" data-text="${escape(notes.get(id)!)}"></span>` : m));
  const html = marked.parse(body, { async: false, gfm: true }) as string;
  return htmlToElements(html);
}
