import { isSubhead, type DocMark, type DocNode } from "./types";
import { boxDef } from "../blocks";

export interface HtmlOptions {
  /** "epub" adds epub:type attributes and produces XHTML-safe void tags */
  mode: "epub" | "web";
  /** maps an image src to the href used in the output */
  imageHref?: (src: string) => string;
  /** glyph for scene breaks; empty draws a short rule */
  sceneBreak?: string;
  /** id prefix for footnotes so ids stay unique across chapters */
  notePrefix?: string;
  /** markup for a scene break; given the break's own ornament id, or undefined for the theme's */
  ornament?: (id: string | undefined) => string;
  /** which edition this is for: blocks marked for the other one are left out (default ebook) */
  target?: "ebook" | "print";
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
  let sub = 0;
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

  const target = opts.target ?? "ebook";
  const endnotes: string[] = [];
  // only top-level paragraphs open a chapter (a drop cap never lands inside a box or a table)
  let depth = 0;

  function inline(nodes: DocNode[] | undefined): string {
    return (nodes ?? []).map(node).join("");
  }

  function nested(nodes: DocNode[] | undefined): string {
    depth++;
    try {
      return inline(nodes);
    } finally {
      depth--;
    }
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
        const cls = !firstDone && depth === 0 ? ' class="first"' : "";
        if (depth === 0) firstDone = true;
        return `<p${cls}${align(n)}>${body}</p>`;
      }
      case "heading": {
        const level = Math.min(Math.max(Number(n.attrs?.level ?? 2), 2), 4);
        firstDone = false;
        // sub-chapters get ids so the contents can link to them
        const id = isSubhead(n) ? ` id="sub-${++sub}"` : "";
        return `<h${level}${id}${align(n)}>${inline(n.content)}</h${level}>`;
      }
      case "blockquote":
        return `<blockquote>${nested(n.content)}</blockquote>`;
      case "callout":
        return `<div class="callout">${nested(n.content)}</div>`;
      case "box": {
        const def = boxDef(String(n.attrs?.variant ?? ""));
        const st = def.box ?? {};
        if (st.only) return st.only === target ? nested(n.content) : "";
        const labelText = n.attrs?.label != null ? String(n.attrs.label) : (st.label ?? "");
        // the ebook/print badge is an editor hint, not part of the book
        const label = labelText && !st.only ? `<p class="blk-label">${escapeHtml(labelText)}</p>` : "";
        const src = typeof n.attrs?.src === "string" && n.attrs.src ? (opts.imageHref ? opts.imageHref(n.attrs.src) : n.attrs.src) : "";
        const style = src ? ` style="background-image: url('${escapeHtml(src).replace(/'/g, "%27")}')"` : "";
        const lines = st.lines ? `<div class="blk-lines" style="height:${(st.lines * 1.9).toFixed(1)}em"></div>` : "";
        const body = nested(n.content);
        return `<div class="blk blk-${def.id}"${style}>${st.labelAtEnd ? "" : label}${body}${lines}${st.labelAtEnd ? label : ""}</div>`;
      }
      case "chat":
        return `<div class="chat${n.attrs?.group ? " chat-group" : ""}">${nested(n.content)}</div>`;
      case "chatMessage": {
        const me = n.attrs?.from === "me";
        const name = n.attrs?.name ? `<span class="msg-name">${escapeHtml(String(n.attrs.name))}</span>` : "";
        return `<div class="msg ${me ? "msg-me" : "msg-them"}">${name}<p>${inline(n.content) || "&#160;"}</p></div>`;
      }
      case "columns":
        return `<div class="cols cols-${Number(n.attrs?.count) === 3 ? 3 : 2}">${nested(n.content)}</div>`;
      case "column":
        return `<div class="col">${inline(n.content)}</div>`;
      case "table":
        return `<table class="book-table">${nested(n.content)}</table>`;
      case "tableRow":
        return `<tr>${inline(n.content)}</tr>`;
      case "tableHeader":
        return `<th>${inline(n.content)}</th>`;
      case "tableCell":
        return `<td>${inline(n.content)}</td>`;
      case "pageBreak":
        return `<div class="page-break"></div>`;
      case "spacer":
        return `<div class="spacer" style="height:${(Math.min(Math.max(Number(n.attrs?.size) || 2, 1), 8) * 1.5).toFixed(1)}em"></div>`;
      case "bulletList":
        return `<ul>${nested(n.content)}</ul>`;
      case "orderedList": {
        const start = Number(n.attrs?.start ?? 1);
        return `<ol${start !== 1 ? ` start="${start}"` : ""}>${nested(n.content)}</ol>`;
      }
      case "listItem":
        return `<li>${inline(n.content)}</li>`;
      case "horizontalRule": {
        firstDone = false;
        const own = typeof n.attrs?.ornament === "string" && n.attrs.ornament ? n.attrs.ornament : undefined;
        if (opts.ornament) return opts.ornament(own);
        return opts.sceneBreak ? `<p class="scene-break" role="separator">${escapeHtml(opts.sceneBreak)}</p>` : epub ? '<hr class="scene-break"/>' : '<hr class="scene-break">';
      }
      case "image": {
        const src = typeof n.attrs?.src === "string" ? n.attrs.src : "";
        if (!src) return "";
        const href = opts.imageHref ? opts.imageHref(src) : src;
        const alt = escapeHtml(String(n.attrs?.alt ?? ""));
        const caption = n.attrs?.title ? `<figcaption>${escapeHtml(String(n.attrs.title))}</figcaption>` : "";
        const layout = ["left", "right", "full", "small"].includes(String(n.attrs?.layout)) ? ` class="fig-${n.attrs!.layout}"` : "";
        return `<figure${layout}><img src="${escapeHtml(href)}" alt="${alt}"${epub ? "/" : ""}>${caption}</figure>`;
      }
      case "footnote": {
        if (n.attrs?.endnote) {
          const i = endnotes.length + 1;
          const text = escapeHtml(String(n.attrs?.text ?? ""));
          const id = `${prefix}-e${i}`;
          endnotes.push(`<li id="${id}"><p>${text} <a href="#${id}-ref" aria-label="Back to text">↩</a></p></li>`);
          return epub
            ? `<a epub:type="noteref" href="#${id}" id="${id}-ref" class="noteref">${i}</a>`
            : `<sup><a href="#${id}" id="${id}-ref" class="noteref">${i}</a></sup>`;
        }
        const i = notes.length + 1;
        const text = escapeHtml(String(n.attrs?.text ?? ""));
        const id = `${prefix}-${i}`;
        notes.push(
          epub ? `<aside epub:type="footnote" id="${id}"><p><a href="#${id}-ref">${i}.</a> ${text}</p></aside>` : `<li id="${id}">${text} <a href="#${id}-ref" aria-label="Back to text">↩</a></li>`,
        );
        return epub ? `<a epub:type="noteref" href="#${id}" id="${id}-ref" class="noteref">${i}</a>` : `<sup><a href="#${id}" id="${id}-ref" class="noteref">${i}</a></sup>`;
      }
      default:
        return inline(n.content);
    }
  }

  const html = node(doc ?? { type: "doc" });
  let notesHtml = notes.length ? (epub ? `<section class="footnotes">${notes.join("")}</section>` : `<ol class="footnotes">${notes.join("")}</ol>`) : "";
  if (endnotes.length) notesHtml += `<section class="endnotes"${epub ? ' epub:type="endnotes"' : ""}><h2>Notes</h2><ol>${endnotes.join("")}</ol></section>`;
  return { html, notes: notesHtml };
}
