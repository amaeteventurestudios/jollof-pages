"use client";

import mammoth from "mammoth";
import { generateJSON } from "@tiptap/html";
import { manuscriptExtensions } from "@/components/studio/editor-extensions";
import type { DocNode } from "../doc/types";
import type { Section } from "../types";
import { elementKind } from "../elements";

export interface ImportedElement {
  kind: string;
  section: Section;
  title: string;
  content: DocNode;
}

const KIND_PATTERNS: [RegExp, string][] = [
  [/^(table of )?contents$/i, "contents"],
  [/^copyright/i, "copyright"],
  [/^dedication/i, "dedication"],
  [/^epigraph/i, "epigraph"],
  [/^foreword/i, "foreword"],
  [/^preface/i, "preface"],
  [/^introduction/i, "introduction"],
  [/^part\s+([ivxlc]+|\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i, "part"],
  [/^conclusion/i, "conclusion"],
  [/^(epilogue|afterword)/i, "afterword"],
  [/^acknowledg/i, "acknowledgments"],
  [/^about the author/i, "about_author"],
  [/^(also by|other books)/i, "also_by"],
  [/^(bibliography|references|works cited)/i, "bibliography"],
  [/^glossary/i, "glossary"],
  [/^(notes|endnotes)$/i, "notes"],
  [/^(resources|further reading)/i, "resources"],
];

export function guessKind(title: string, seenBody: boolean): string {
  const t = title.trim();
  for (const [re, kind] of KIND_PATTERNS) if (re.test(t)) return kind;
  if (!seenBody && /^(prologue)/i.test(t)) return "introduction";
  return "chapter";
}

/** "Chapter 3: Know your reader" -> "Know your reader"; "Chapter Three" alone stays as is. */
export function cleanChapterTitle(title: string): string {
  const m = title.match(/^chapter\s+([0-9]+|[a-z-]+)\s*[:.\-–—]+\s*(.+)$/i);
  return (m ? m[2] : title).trim();
}

/** Turn mammoth's footnote links into inline footnote nodes and drop the note lists. */
function inlineFootnotes(root: HTMLElement) {
  const notes = new Map<string, string>();
  root.querySelectorAll('li[id^="footnote-"], li[id^="endnote-"]').forEach((li) => {
    const clone = li.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('a[href^="#footnote-ref"], a[href^="#endnote-ref"]').forEach((a) => a.remove());
    notes.set(li.id, clone.textContent?.replace(/\s*↑\s*$/, "").trim() ?? "");
  });
  root.querySelectorAll('a[href^="#footnote-"], a[href^="#endnote-"]').forEach((a) => {
    const id = a.getAttribute("href")!.slice(1);
    if (!notes.has(id)) return;
    const span = root.ownerDocument.createElement("span");
    span.setAttribute("data-footnote", "");
    span.setAttribute("data-text", notes.get(id)!);
    const sup = a.closest("sup");
    (sup ?? a).replaceWith(span);
  });
  root.querySelectorAll('li[id^="footnote-"], li[id^="endnote-"]').forEach((li) => {
    const list = li.parentElement;
    li.remove();
    if (list && !list.children.length) list.remove();
  });
}

export async function docxToElements(file: ArrayBuffer, uploadImage?: (blob: Blob, contentType: string) => Promise<string>): Promise<ImportedElement[]> {
  const result = await mammoth.convertToHtml(
    { arrayBuffer: file },
    {
      styleMap: [
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Subtitle'] => p.subtitle:fresh",
        "p[style-name='Quote'] => blockquote > p:fresh",
        "p[style-name='Intense Quote'] => div.callout > p:fresh",
      ],
      convertImage: mammoth.images.imgElement(async (image) => {
        const b64 = await image.read("base64");
        if (!uploadImage) return { src: "" };
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const src = await uploadImage(new Blob([bytes], { type: image.contentType }), image.contentType).catch(() => "");
        return { src };
      }),
    },
  );
  return htmlToElements(result.value, inlineFootnotes);
}

/** Split converted HTML into book elements on its chapter headings. Shared by the Word and Markdown imports. */
export function htmlToElements(html: string, prepare?: (root: HTMLElement) => void): ImportedElement[] {
  const dom = new DOMParser().parseFromString(`<div id="root">${html}</div>`, "text/html");
  const root = dom.getElementById("root")!;
  prepare?.(root);
  root.querySelectorAll("img").forEach((img) => {
    if (!img.getAttribute("src")) img.remove();
  });

  // split on the highest heading level that is used more than once
  const level = root.querySelectorAll("h1").length >= 2 ? 1 : root.querySelectorAll("h2").length >= 2 ? 2 : root.querySelectorAll("h1").length ? 1 : 0;
  const chunks: { title: string; html: string }[] = [];
  let current: { title: string; parts: string[] } = { title: "", parts: [] };
  for (const node of Array.from(root.childNodes)) {
    const el = node as HTMLElement;
    if (level && el.tagName === `H${level}`) {
      if (current.title || current.parts.join("").trim()) chunks.push({ title: current.title, html: current.parts.join("") });
      current = { title: el.textContent?.trim() || "Untitled", parts: [] };
      continue;
    }
    if (el.nodeType === 1) {
      // shift remaining headings so the chapter title is the only level-1 heading
      const m = el.tagName.match(/^H(\d)$/);
      if (m) {
        const n = Math.min(Math.max(Number(m[1]) - level + 1, 2), 4);
        current.parts.push(`<h${n}>${el.innerHTML}</h${n}>`);
      } else current.parts.push(el.outerHTML);
    } else if (node.textContent?.trim()) current.parts.push(`<p>${node.textContent}</p>`);
  }
  if (current.title || current.parts.join("").trim()) chunks.push({ title: current.title, html: current.parts.join("") });

  const extensions = manuscriptExtensions();
  let seenBody = false;
  return chunks.map((c, i) => {
    const kind = c.title ? guessKind(c.title, seenBody) : i === 0 ? "introduction" : "chapter";
    const k = elementKind(kind);
    if (k.section === "body") seenBody = true;
    const content = generateJSON(c.html || "<p></p>", extensions) as DocNode;
    return {
      kind,
      section: k.section,
      title: kind === "chapter" ? cleanChapterTitle(c.title || `Chapter ${i + 1}`) : c.title || k.label,
      content,
    };
  });
}
