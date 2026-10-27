import type { BookElement, ExportInput } from "./book-model";
import { authorName, tocText } from "./book-model";
import { docToHtml, escapeHtml } from "./doc/html";
import { sceneBreakGlyph, type InteriorTheme } from "./themes";

/** One element as web HTML, for the studio preview and the public sample reader. */
export function elementHtml(e: BookElement, input: Pick<ExportInput, "book" | "author" | "alsoBy">, all: BookElement[], theme: InteriorTheme): string {
  const { book } = input;
  switch (e.kind.id) {
    case "title_page":
      return `<section class="title-page"><p class="tp-title">${escapeHtml(book.title)}</p>${book.subtitle ? `<p class="tp-subtitle">${escapeHtml(book.subtitle)}</p>` : ""}<p class="tp-author">${escapeHtml(authorName(input))}</p>${book.imprint ? `<p class="tp-imprint">${escapeHtml(book.imprint)}</p>` : ""}</section>`;
    case "contents":
      return `<section class="toc"><header class="chapter-head"><h1>${escapeHtml(e.title)}</h1></header><ol>${all
        .filter((x) => x.inToc)
        .map((x) => `<li>${escapeHtml(tocText(x))}</li>`)
        .join("")}</ol></section>`;
    case "also_by":
      return `<section><header class="chapter-head"><h1>${escapeHtml(e.title)}</h1></header>${
        input.alsoBy.length ? input.alsoBy.map((b) => `<p class="first">${escapeHtml(b.title)}</p>`).join("") : "<p>Other published books by this author are listed here automatically.</p>"
      }</section>`;
  }
  const { html, notes } = docToHtml(e.chapter.content, { mode: "web", sceneBreak: sceneBreakGlyph(theme), notePrefix: `n-${e.chapter.id}` });
  if (e.kind.id === "copyright") return `<section class="copyright">${html}</section>`;
  if (e.kind.id === "dedication" || e.kind.id === "epigraph") return `<section class="centered dedication">${html}</section>`;
  if (e.kind.id === "part")
    return `<section class="part-page"><header class="chapter-head"><span class="chapter-label">${escapeHtml(e.label)}</span><h1>${escapeHtml(e.title)}</h1></header>${html}</section>`;
  return `<section><header class="chapter-head">${e.label ? `<span class="chapter-label">${escapeHtml(e.label)}</span>` : ""}<h1>${escapeHtml(e.title)}${
    e.subtitle ? `<span class="chapter-subtitle">${escapeHtml(e.subtitle)}</span>` : ""
  }</h1></header>${html}${notes}</section>`;
}
