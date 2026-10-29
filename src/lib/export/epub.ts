import JSZip from "jszip";
import { backgroundStyle, chapterHeadHtml, ornamentHtml } from "../render-element";
import { authorName, bookImages, elementBackground, forEdition, orderedElements, tocText, type BookElement, type ExportInput } from "../book-model";
import { docToHtml, escapeHtml } from "../doc/html";
import { collectOrnaments, subheads } from "../doc/types";
import { paletteOf, themeCss } from "../theme-css";
import { sceneBreakGlyph, themeFor } from "../themes";
import { bookFormat } from "../types";
import { ornamentSvg } from "../ornaments";
import { backgroundArt, textOverBackground } from "../backgrounds";
import { isLibraryBackground, libraryId } from "../background-ref";

export interface BinaryAsset {
  bytes: Uint8Array;
  mediaType: string;
}

export interface EpubAssets {
  cover?: BinaryAsset | null;
  /** image src (as stored in the manuscript) -> bytes */
  images?: Map<string, BinaryAsset>;
}

const EPUB_TYPE: Record<string, string> = {
  title_page: "frontmatter titlepage",
  copyright: "frontmatter copyright-page",
  dedication: "frontmatter dedication",
  epigraph: "frontmatter epigraph",
  contents: "frontmatter toc",
  foreword: "frontmatter foreword",
  preface: "frontmatter preface",
  introduction: "frontmatter introduction",
  part: "bodymatter part",
  chapter: "bodymatter chapter",
  conclusion: "backmatter conclusion",
  afterword: "backmatter afterword",
  acknowledgments: "backmatter acknowledgments",
  resources: "backmatter appendix",
  notes: "backmatter endnotes",
  bibliography: "backmatter bibliography",
  glossary: "backmatter glossary",
  about_author: "backmatter",
  also_by: "backmatter",
  review_request: "backmatter",
  half_title: "frontmatter halftitlepage",
  frontispiece: "frontmatter",
  praise: "frontmatter",
  also_by_front: "frontmatter",
  illustrations: "frontmatter loi",
  tables_list: "frontmatter lot",
  abbreviations: "frontmatter",
  cast: "frontmatter dramatis-personae",
  prologue: "bodymatter prologue",
  epilogue: "bodymatter epilogue",
  appendix: "backmatter appendix",
  index: "backmatter index",
  references: "backmatter bibliography",
  colophon: "backmatter colophon",
  contributors: "backmatter contributors",
};

const SECTION_TYPE = { front: "frontmatter", body: "bodymatter", back: "backmatter" } as const;

function ext(mediaType: string): string {
  if (mediaType.includes("png")) return "png";
  if (mediaType.includes("gif")) return "gif";
  if (mediaType.includes("webp")) return "webp";
  if (mediaType.includes("svg")) return "svg";
  return "jpg";
}

function xhtml(title: string, lang: string, body: string, bodyType = ""): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${lang}" xml:lang="${lang}">
<head>
<meta charset="UTF-8"/>
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" type="text/css" href="../styles.css"/>
</head>
<body${bodyType ? ` epub:type="${bodyType}"` : ""}>
${body}
</body>
</html>
`;
}

export function epubFileName(e: BookElement, i: number): string {
  return `e${String(i + 1).padStart(3, "0")}-${e.kind.id}.xhtml`;
}

/** Build an EPUB 3 package (with an EPUB 2 NCX for older readers). Returns the zip bytes. */
export async function buildEpub(input: ExportInput, assets: EpubAssets = {}): Promise<Uint8Array> {
  const { book } = input;
  const format = bookFormat(book);
  const theme = themeFor(format);
  const lang = book.language || "en";
  const author = authorName(input);
  const elements = forEdition(orderedElements(input.chapters, theme), "ebook");
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>
`,
  );
  zip.file("OEBPS/styles.css", themeCss(theme, { dropCaps: format.dropCaps, lineHeight: format.lineHeight, epub: true }));

  // images used in the manuscript and chapter openings
  const imageHref = new Map<string, string>();
  const manifestImages: string[] = [];
  let imgNo = 0;
  for (const src of bookImages(input.chapters, format)) {
    const asset = assets.images?.get(src);
    if (!asset) continue;
    const name = `img-${++imgNo}.${ext(asset.mediaType)}`;
    zip.file(`OEBPS/images/${name}`, asset.bytes);
    imageHref.set(src, `../images/${name}`);
    manifestImages.push(`<item id="img${imgNo}" href="images/${name}" media-type="${asset.mediaType}"/>`);
  }

  // drawn ornaments and library backgrounds, as SVG files
  const ornamentHref = new Map<string, string>();
  const ornamentIds = new Set([theme.ornament]);
  for (const e of elements) collectOrnaments(e.chapter.content, ornamentIds);
  for (const id of ornamentIds) {
    const art = ornamentSvg(id, theme.accent);
    if (!art) continue;
    zip.file(`OEBPS/images/orn-${id}.svg`, art.svg);
    ornamentHref.set(id, `../images/orn-${id}.svg`);
    manifestImages.push(`<item id="orn-${id}" href="images/orn-${id}.svg" media-type="image/svg+xml"/>`);
  }
  const backgroundHref = (src: string, strength: number): string | null => {
    if (!isLibraryBackground(src)) return imageHref.get(src) ?? null;
    const id = libraryId(src);
    const key = `bg-${id}-${Math.round(strength * 100)}`;
    if (!imageHref.has(key)) {
      const art = backgroundArt(id, strength);
      if (!art) return null;
      zip.file(`OEBPS/images/${key}.svg`, art.svg);
      imageHref.set(key, `../images/${key}.svg`);
      manifestImages.push(`<item id="${key}" href="images/${key}.svg" media-type="image/svg+xml"/>`);
    }
    return imageHref.get(key)!;
  };

  const files = elements.map((e, i) => epubFileName(e, i));
  // with sub-chapters on, each chapter lists its headings under it
  const tocEntries = elements.map((e, i) => ({ e, file: files[i], subs: format.tocSubheads && e.kind.id !== "part" ? subheads(e.chapter.content) : [] })).filter(({ e }) => e.inToc);
  const subList = (file: string, subs: string[], prefix = "") =>
    subs.length ? `<ol>${subs.map((t, j) => `<li><a href="${prefix}${file}#sub-${j + 1}">${escapeHtml(t)}</a></li>`).join("")}</ol>` : "";

  elements.forEach((e, i) => {
    const c = e.chapter;
    let body: string;
    switch (e.kind.id) {
      case "title_page":
        body = `<section class="title-page" epub:type="titlepage">
<p class="tp-title">${escapeHtml(book.title)}</p>
${book.subtitle ? `<p class="tp-subtitle">${escapeHtml(book.subtitle)}</p>` : ""}
<p class="tp-author">${escapeHtml(author)}</p>
${book.imprint ? `<p class="tp-imprint">${escapeHtml(book.imprint)}</p>` : ""}
</section>`;
        break;
      case "contents":
        body = `<section class="toc"><h1>${escapeHtml(e.title)}</h1>
<ol>${tocEntries.map(({ e: t, file, subs }) => `<li><a href="${file}">${escapeHtml(tocText(t))}</a>${subList(file, subs)}</li>`).join("")}</ol></section>`;
        break;
      case "half_title":
        body = `<section class="half-title"><p class="tp-title">${escapeHtml(book.title)}</p></section>`;
        break;
      case "also_by":
      case "also_by_front":
        body = `<section><header class="chapter-head"><h1>${escapeHtml(e.title)}</h1></header>
${input.alsoBy.length ? input.alsoBy.map((b) => `<p class="first">${escapeHtml(b.title)}${b.subtitle ? `: <em>${escapeHtml(b.subtitle)}</em>` : ""}</p>`).join("\n") : "<p>More books coming soon.</p>"}</section>`;
        break;
      default: {
        const { html, notes } = docToHtml(c.content, {
          mode: "epub",
          imageHref: (src) => imageHref.get(src) ?? src,
          sceneBreak: sceneBreakGlyph(theme),
          palette: paletteOf(theme),
          notePrefix: `n${i + 1}`,
          ornament: (own) => ornamentHtml(theme, own, true, (id) => ornamentHref.get(id) ?? null),
          target: "ebook",
        });
        if (e.kind.id === "copyright") body = `<section class="copyright">${html}</section>`;
        else if (e.kind.id === "dedication" || e.kind.id === "epigraph") body = `<section class="centered dedication">${html}</section>`;
        else if (e.kind.layout === "full_image") body = `<section class="full-image">${e.image ? `<img src="${escapeHtml(imageHref.get(e.image) ?? e.image)}" alt=""/>` : ""}${html}</section>`;
        else if (e.kind.id === "part" || e.kind.id === "act")
          body = `<section class="part-page"><header class="chapter-head"><span class="chapter-label">${escapeHtml(e.label)}</span><h1>${escapeHtml(e.title)}${e.subtitle ? `<span class="chapter-subtitle">${escapeHtml(e.subtitle)}</span>` : ""}</h1></header>${html}</section>`;
        else {
          const cls = e.kind.layout === "centered" ? ' class="centered-verse"' : "";
          body = `<section${cls}>${chapterHeadHtml(e, e.image ? (imageHref.get(e.image) ?? null) : null)}
${html}${e.kind.layout === "lined" ? '<div class="blk-lines" style="height:24em"></div>' : ""}${notes}</section>`;
        }
      }
    }
    // a background wraps the section: behind all of it, or only behind its opening
    const bg = elementBackground(e, format, theme);
    const style = bg ? backgroundStyle(bg, (src) => backgroundHref(src, bg.strength)) : "";
    if (style) body = bg!.openerOnly ? `<div class="has-bg bg-opener"><div class="opener-bg" style="${escapeHtml(style)}"></div>${body}</div>` : `<div class="has-bg${textOverBackground(bg!.src) ? " bg-dark" : ""}" style="${escapeHtml(style)}">${body}</div>`;
    zip.file(`OEBPS/text/${files[i]}`, xhtml(e.title, lang, body, EPUB_TYPE[e.kind.id] ?? SECTION_TYPE[e.section]));
  });

  let coverItem = "";
  let coverSpine = "";
  if (assets.cover) {
    const name = `cover.${ext(assets.cover.mediaType)}`;
    zip.file(`OEBPS/images/${name}`, assets.cover.bytes);
    zip.file(
      "OEBPS/text/cover.xhtml",
      xhtml(
        "Cover",
        lang,
        `<section epub:type="cover" style="text-align:center;margin:0;padding:0"><img src="../images/${name}" alt="${escapeHtml(book.title)}" style="max-width:100%;max-height:100%"/></section>`,
      ),
    );
    coverItem = `<item id="cover-image" href="images/${name}" media-type="${assets.cover.mediaType}" properties="cover-image"/>
    <item id="cover" href="text/cover.xhtml" media-type="application/xhtml+xml"/>`;
    coverSpine = `<itemref idref="cover" linear="yes"/>`;
  }

  const firstBody = elements.findIndex((e) => e.section === "body");
  const tocIndex = elements.findIndex((e) => e.kind.id === "contents");
  zip.file(
    "OEBPS/nav.xhtml",
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${lang}" xml:lang="${lang}">
<head><meta charset="UTF-8"/><title>Contents</title><link rel="stylesheet" type="text/css" href="styles.css"/></head>
<body>
<nav epub:type="toc" id="toc" class="toc"><h1>Contents</h1>
<ol>
${tocEntries.map(({ e, file, subs }) => `<li><a href="text/${file}">${escapeHtml(tocText(e))}</a>${subList(file, subs, "text/")}</li>`).join("\n")}
</ol>
</nav>
<nav epub:type="landmarks" hidden="hidden"><h2>Guide</h2>
<ol>
${assets.cover ? `<li><a epub:type="cover" href="text/cover.xhtml">Cover</a></li>` : ""}
${tocIndex >= 0 ? `<li><a epub:type="toc" href="text/${files[tocIndex]}">Contents</a></li>` : ""}
${firstBody >= 0 ? `<li><a epub:type="bodymatter" href="text/${files[firstBody]}">Start reading</a></li>` : ""}
</ol>
</nav>
</body>
</html>
`,
  );

  const uid = book.isbn_ebook ? `urn:isbn:${book.isbn_ebook.replace(/[^0-9Xx]/g, "")}` : `urn:jollofpages:book:${book.id}`;
  zip.file(
    "OEBPS/toc.ncx",
    `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="${lang}">
<head><meta name="dtb:uid" content="${escapeHtml(uid)}"/><meta name="dtb:depth" content="${tocEntries.some((t) => t.subs.length) ? 2 : 1}"/><meta name="dtb:totalPageCount" content="0"/><meta name="dtb:maxPageNumber" content="0"/></head>
<docTitle><text>${escapeHtml(book.title)}</text></docTitle>
<navMap>
${ncxPoints(tocEntries)}
</navMap>
</ncx>
`,
  );

  const modified = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const subjects = (book.categories ?? []).map((s) => `<dc:subject>${escapeHtml(s)}</dc:subject>`).join("\n    ");
  zip.file(
    "OEBPS/content.opf",
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="${lang}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${escapeHtml(uid)}</dc:identifier>
    <dc:title>${escapeHtml(book.title)}</dc:title>
    <dc:creator id="creator">${escapeHtml(author)}</dc:creator>
    <meta refines="#creator" property="role" scheme="marc:relators">aut</meta>
    <dc:language>${escapeHtml(lang)}</dc:language>
    ${book.imprint ? `<dc:publisher>${escapeHtml(book.imprint)}</dc:publisher>` : ""}
    ${book.description ? `<dc:description>${escapeHtml(book.description)}</dc:description>` : ""}
    ${book.publication_date ? `<dc:date>${escapeHtml(book.publication_date.slice(0, 10))}</dc:date>` : ""}
    ${subjects}
    <meta property="dcterms:modified">${modified}</meta>
    ${assets.cover ? '<meta name="cover" content="cover-image"/>' : ""}
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="styles.css" media-type="text/css"/>
    ${coverItem}
    ${manifestImages.join("\n    ")}
    ${files.map((f, i) => `<item id="e${i + 1}" href="text/${f}" media-type="application/xhtml+xml"/>`).join("\n    ")}
  </manifest>
  <spine toc="ncx">
    ${coverSpine}
    ${files.map((_, i) => `<itemref idref="e${i + 1}"/>`).join("\n    ")}
  </spine>
</package>
`,
  );

  return zip.generateAsync({ type: "uint8array", mimeType: "application/epub+zip", compression: "DEFLATE" });
}

/** The NCX nav points (older Kindles read these), with sub-chapters nested under their chapter. */
function ncxPoints(entries: { e: BookElement; file: string; subs: string[] }[]): string {
  let order = 0;
  return entries
    .map(({ e, file, subs }) => {
      const id = ++order;
      const kids = subs
        .map((t, j) => `<navPoint id="np${++order}" playOrder="${order}"><navLabel><text>${escapeHtml(t)}</text></navLabel><content src="text/${file}#sub-${j + 1}"/></navPoint>`)
        .join("");
      return `<navPoint id="np${id}" playOrder="${id}"><navLabel><text>${escapeHtml(tocText(e))}</text></navLabel><content src="text/${file}"/>${kids}</navPoint>`;
    })
    .join("\n");
}
