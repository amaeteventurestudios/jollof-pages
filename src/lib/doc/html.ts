import type { DocMark, DocNode } from "./types";

export interface HtmlOptions {
  /** "epub" adds epub:type attributes and produces XHTML-safe void tags */
  mode: "epub" | "web";
  /** maps an image src to the href used in the output */
  imageHref?: (src: string) => string;
  /** glyph for scene breaks; empty draws a short rule */
  sceneBreak?: string;
  /** id prefix for footnotes so ids stay unique across chapters */
  notePrefix?: string;
}

export interface HtmlResult {
  html: string;
  notes: string;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function safeUrl(href: unknown): string | null {
  if (typeof href !== "string") return null;
  const h = href.trim();
  if (/^(https?:|mailto:|#)/i.test(h)) return h;
  return null;
}

/** Serialize Tiptap JSON to (X)HTML. The first paragraph gets class "first" for drop caps. */
export function docToHtml(doc: DocNode | null | undefined, opts: HtmlOptions): HtmlResult {
  const notes: string[] = [];
  const prefix = opts.notePrefix ?? "fn";
  let firstDone = false;
  const epub = opts.mode === "epub";
  const br = epub ? "<br/>" : "<br>";

  function marks(text: string, ms: DocMark[] | undefined): string {
    let out = escapeHtml(text);
    for (const m of ms ?? []) {
      switch (m.type) {
        case "bold":
          out = `<strong>${out}</strong>`;
          break;
        case "italic":
          out = `<em>${out}</em>`;
          break;
        case "underline":
          out = `<span class="u">${out}</span>`;
          break;
        case "strike":
          out = `<s>${out}</s>`;
          break;
        case "code":
          out = `<code>${out}</code>`;
          break;
        case "link": {
          const href = safeUrl(m.attrs?.href);
          if (href) out = `<a href="${escapeHtml(href)}">${out}</a>`;
          break;
        }
      }
    }
    return out;
  }

  function align(n: DocNode): string {
    const a = n.attrs?.textAlign;
    return a === "center" || a === "right" || a === "justify" ? ` style="text-align:${a}"` : "";
  }

  function inline(nodes: DocNode[] | undefined): string {
    return (nodes ?? []).map(node).join("");
  }

  function node(n: DocNode): string {
    switch (n.type) {
      case "doc":
        return inline(n.content);
      case "text":
        return marks(n.text ?? "", n.marks);
      case "hardBreak":
        return br;
      case "paragraph": {
        const body = inline(n.content);
        if (!body) return epub ? `<p class="blank">${"&#160;"}</p>` : "<p>&nbsp;</p>";
        const cls = !firstDone ? ' class="first"' : "";
        firstDone = true;
        return `<p${cls}${align(n)}>${body}</p>`;
      }
      case "heading": {
        const level = Math.min(Math.max(Number(n.attrs?.level ?? 2), 2), 4);
        firstDone = false;
        return `<h${level}${align(n)}>${inline(n.content)}</h${level}>`;
      }
      case "blockquote":
        return `<blockquote>${inline(n.content)}</blockquote>`;
      case "callout":
        return `<div class="callout">${inline(n.content)}</div>`;
      case "bulletList":
        return `<ul>${inline(n.content)}</ul>`;
      case "orderedList": {
        const start = Number(n.attrs?.start ?? 1);
        return `<ol${start !== 1 ? ` start="${start}"` : ""}>${inline(n.content)}</ol>`;
      }
      case "listItem":
        return `<li>${inline(n.content)}</li>`;
      case "horizontalRule":
        firstDone = false;
        return opts.sceneBreak
          ? `<p class="scene-break" role="separator">${escapeHtml(opts.sceneBreak)}</p>`
          : epub
            ? '<hr class="scene-break"/>'
            : '<hr class="scene-break">';
      case "image": {
        const src = typeof n.attrs?.src === "string" ? n.attrs.src : "";
        if (!src) return "";
        const href = opts.imageHref ? opts.imageHref(src) : src;
        const alt = escapeHtml(String(n.attrs?.alt ?? ""));
        const caption = n.attrs?.title ? `<figcaption>${escapeHtml(String(n.attrs.title))}</figcaption>` : "";
        return `<figure><img src="${escapeHtml(href)}" alt="${alt}"${epub ? "/" : ""}>${caption}</figure>`;
      }
      case "footnote": {
        const i = notes.length + 1;
        const text = escapeHtml(String(n.attrs?.text ?? ""));
        const id = `${prefix}-${i}`;
        notes.push(
          epub
            ? `<aside epub:type="footnote" id="${id}"><p><a href="#${id}-ref">${i}.</a> ${text}</p></aside>`
            : `<li id="${id}">${text} <a href="#${id}-ref" aria-label="Back to text">↩</a></li>`,
        );
        return epub
          ? `<a epub:type="noteref" href="#${id}" id="${id}-ref" class="noteref">${i}</a>`
          : `<sup><a href="#${id}" id="${id}-ref" class="noteref">${i}</a></sup>`;
      }
      default:
        return inline(n.content);
    }
  }

  const html = node(doc ?? { type: "doc" });
  const notesHtml = notes.length
    ? epub
      ? `<section class="footnotes">${notes.join("")}</section>`
      : `<ol class="footnotes">${notes.join("")}</ol>`
    : "";
  return { html, notes: notesHtml };
}
