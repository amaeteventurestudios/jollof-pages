import type { BookElement, ExportInput, ResolvedBackground } from "./book-model";
import { authorName, elementBackground, tocText } from "./book-model";
import { docToHtml, escapeHtml } from "./doc/html";
import { paletteOf } from "./theme-css";
import { sceneBreakGlyph, type InteriorTheme } from "./themes";
import { subheads } from "./doc/types";
import { bookFormat } from "./types";
import { getOrnament, ornamentSvg, svgDataUri } from "./ornaments";
import { backgroundArt, textOverBackground } from "./backgrounds";
import { isLibraryBackground, libraryId } from "./background-ref";

/**
 * A scene break as (X)HTML. `ornamentSrc` maps an ornament id to where its SVG lives in this output
 * (an EPUB file, or a data URI); typographic breaks are text.
 */
export function ornamentHtml(theme: InteriorTheme, own: string | undefined, epub: boolean, ornamentSrc?: (id: string) => string | null): string {
  const o = getOrnament(own ?? theme.ornament);
  const close = epub ? "/>" : ">";
  switch (o.kind) {
    case "text":
      return `<p class="scene-break" role="separator">${escapeHtml(o.glyph ?? "* * *")}</p>`;
    case "rule":
      return `<hr class="scene-break"${close}`;
    case "double":
      return `<hr class="scene-break double"${close}`;
    case "space":
      return `<p class="scene-break space" role="separator">&#160;</p>`;
    default: {
      const src = ornamentSrc ? ornamentSrc(o.id) : webOrnamentSrc(o.id, theme.accent);
      return src ? `<p class="scene-break" role="separator"><img class="ornament" src="${escapeHtml(src)}" alt=""${close}</p>` : `<p class="scene-break" role="separator">* * *</p>`;
    }
  }
}

function webOrnamentSrc(id: string, color: string): string | null {
  const art = ornamentSvg(id, color);
  return art ? svgDataUri(art.svg) : null;
}

/**
 * Inline CSS for a background. `href` maps an uploaded image URL or a library background to where it
 * lives in this output; by default library backgrounds become data URIs and uploads stay URLs.
 */
export function backgroundStyle(bg: ResolvedBackground, href?: (src: string) => string | null): string {
  let url: string | null;
  let size = "cover";
  if (isLibraryBackground(bg.src)) {
    const art = backgroundArt(libraryId(bg.src), bg.strength);
    if (!art) return "";
    url = href ? href(bg.src) : svgDataUri(art.svg);
    if (art.mode === "tile") size = `${Math.round(art.width / 2)}px ${Math.round(art.height / 2)}px`;
    // a single screen page shows the painted side of a two-page spread
    if (art.mode === "spread") return `background-image: url('${(url ?? "").replace(/'/g, "%27")}'); background-size: cover; background-position: left center;`;
  } else url = href ? href(bg.src) : bg.src;
  if (!url) return "";
  // an uploaded photo is veiled with white so the text over it stays readable
  const a = (1 - bg.strength).toFixed(2);
  const veil = !isLibraryBackground(bg.src) && bg.strength < 1 ? `linear-gradient(rgba(255,255,255,${a}), rgba(255,255,255,${a})), ` : "";
  return `background-image: ${veil}url('${url.replace(/'/g, "%27")}'); background-size: ${veil ? `auto, ${size}` : size}; background-position: center top;`;
}

/** One element as web HTML, for the studio preview and the public sample reader. */
export function elementHtml(e: BookElement, input: Pick<ExportInput, "book" | "author" | "alsoBy">, all: BookElement[], theme: InteriorTheme): string {
  const { book } = input;
  const format = bookFormat(book);
  const bg = elementBackground(e, format, theme);
  const bgStyle = bg ? backgroundStyle(bg) : "";
  const wrap = (cls: string, inner: string) => {
    const c = [cls, bg && "has-bg", bg?.openerOnly && "bg-opener", bg && !bg.openerOnly && textOverBackground(bg.src) && "bg-dark"].filter(Boolean).join(" ");
    if (!bg) return `<section${c ? ` class="${c}"` : ""}>${inner}</section>`;
    // opener-only backgrounds sit behind the heading; full ones behind the whole section
    return bg.openerOnly ? `<section class="${c}"><div class="opener-bg" style="${bgStyle}"></div>${inner}</section>` : `<section class="${c}" style="${bgStyle}">${inner}</section>`;
  };
  switch (e.kind.id) {
    case "title_page":
      return wrap(
        "title-page",
        `<p class="tp-title">${escapeHtml(book.title)}</p>${book.subtitle ? `<p class="tp-subtitle">${escapeHtml(book.subtitle)}</p>` : ""}<p class="tp-author">${escapeHtml(authorName(input))}</p>${book.imprint ? `<p class="tp-imprint">${escapeHtml(book.imprint)}</p>` : ""}`,
      );
    case "half_title":
      return wrap("half-title", `<p class="tp-title">${escapeHtml(book.title)}</p>`);
    case "contents":
      return wrap(
        "toc",
        `<header class="chapter-head"><h1>${escapeHtml(e.title)}</h1></header><ol>${all
          .filter((x) => x.inToc)
          .map((x) => {
            const subs = format.tocSubheads && x.kind.id !== "part" ? subheads(x.chapter.content) : [];
            return `<li>${escapeHtml(tocText(x))}${subs.length ? `<ol>${subs.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ol>` : ""}</li>`;
          })
          .join("")}</ol>`,
      );
    case "also_by":
    case "also_by_front":
      return wrap(
        "",
        `<header class="chapter-head"><h1>${escapeHtml(e.title)}</h1></header>${
          input.alsoBy.length ? input.alsoBy.map((b) => `<p class="first">${escapeHtml(b.title)}</p>`).join("") : "<p>Other published books by this author are listed here automatically.</p>"
        }`,
      );
  }
  const { html, notes } = docToHtml(e.chapter.content, {
    mode: "web",
    sceneBreak: sceneBreakGlyph(theme),
    palette: paletteOf(theme),
    notePrefix: `n-${e.chapter.id}`,
    ornament: (own) => ornamentHtml(theme, own, false),
  });
  if (e.kind.id === "copyright") return wrap("copyright", html);
  if (e.kind.id === "dedication" || e.kind.id === "epigraph") return wrap("centered dedication", html);
  if (e.kind.layout === "full_image") return wrap("full-image", `${e.image ? `<img src="${escapeHtml(e.image)}" alt=""/>` : ""}${html}`);
  if (e.kind.id === "part" || e.kind.id === "act")
    return wrap(
      "part-page",
      `<header class="chapter-head"><span class="chapter-label">${escapeHtml(e.label)}</span><h1>${escapeHtml(e.title)}${e.subtitle ? `<span class="chapter-subtitle">${escapeHtml(e.subtitle)}</span>` : ""}</h1></header>${html}`,
    );
  const cls = e.kind.layout === "centered" ? "centered-verse" : e.kind.layout === "lined" ? "lined-pages" : "";
  return wrap(cls, `${chapterHeadHtml(e, e.image)}${html}${e.kind.layout === "lined" ? '<div class="blk-lines" style="height:24em"></div>' : ""}${notes}`);
}

/**
 * The opening of a chapter: its image, label, title and subtitle, following the chapter's options.
 * `imageSrc` is where the chapter image lives in this output (a URL, or a path inside the EPUB).
 */
export function chapterHeadHtml(e: BookElement, imageSrc: string | null): string {
  const o = e.options;
  const img = imageSrc ? `<img src="${escapeHtml(imageSrc)}" alt=""/>` : "";
  if (o.hideHeading) return img ? `<figure class="chapter-image">${img}</figure>` : "";
  const inverted = !!(img && o.invert);
  const cls = ["chapter-head", o.smallTitle && "small", inverted && "inverted"].filter(Boolean).join(" ");
  const head = `${e.label ? `<span class="chapter-label">${escapeHtml(e.label)}</span>` : ""}<h1>${escapeHtml(e.title)}${
    e.subtitle ? `<span class="chapter-subtitle">${escapeHtml(e.subtitle)}</span>` : ""
  }</h1>`;
  if (inverted) return `<header class="${cls}">${img}<div class="chapter-head-text">${head}</div></header>`;
  return `${img ? `<figure class="chapter-image">${img}</figure>` : ""}<header class="${cls}">${head}</header>`;
}
