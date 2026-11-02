import { authorName, elementBackground, forEdition, orderedElements, tocText, type BookElement, type ExportInput, type ResolvedBackground } from "../book-model";
import { pageGeometry, type Binding } from "../kdp";
import { isSubhead, type DocMark, type DocNode } from "../doc/types";
import { textStyle, themeFor, type InteriorTheme } from "../themes";
import { boxDef, boxStyle, isDark, paleTint, type BookBoxStyles, type BoxFont, type BoxStyle } from "../blocks";
import { HAND_FONT, TYPEWRITER_FONT } from "../fonts";
import { openingParagraph, paraFormat } from "../paragraph";
import { getOrnament, ornamentSvg } from "../ornaments";
import { backgroundArt, textOverBackground } from "../backgrounds";
import { headTitles, runningHeads, type HeadContent } from "../running-heads";
import { isLibraryBackground, libraryId } from "../background-ref";
import { bookFormat, printEdition, type BookFormat } from "../types";
import { pictureAlign, pictureWidth } from "../picture";

/**
 * Print interior as Typst source. Typst (Apache-2.0) turns this into a press-ready PDF with
 * mirrored margins, running heads, a real table of contents with page numbers and footnotes.
 */

export interface TypstOptions {
  /** page count used to pick KDP's gutter; pass the last real count, or an estimate */
  pageCount: number;
  /** image src -> path relative to the .typ file */
  imagePath?: (src: string) => string | null;
  /** hardcover uses its own trim and a wider gutter; paperback by default */
  binding?: Binding;
}

export function typstString(s: string): string {
  return '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ") + '"';
}

const str = typstString;

function marked(text: string, marks: DocMark[] | undefined): string {
  let out = `#${str(text)}`;
  for (const m of marks ?? []) {
    switch (m.type) {
      case "bold":
        out = `#strong[${out}]`;
        break;
      case "italic":
        out = `#emph[${out}]`;
        break;
      case "underline":
        out = `#underline[${out}]`;
        break;
      case "strike":
        out = `#strike[${out}]`;
        break;
      case "code":
        out = `#raw(${str(text)})`;
        break;
      case "link": {
        const href = m.attrs?.href;
        if (typeof href === "string" && /^(https?:|mailto:)/i.test(href)) out = `#link(${str(href)})[${out}]`;
        break;
      }
      case "indexTerm": {
        const term = String(m.attrs?.term ?? "").trim() || text.trim();
        if (term) out = `#jp-ix(${str(term.slice(0, 120))})[${out}]`;
        break;
      }
    }
  }
  return out;
}

export interface DocTypstOptions {
  leadIn?: boolean;
  imagePath?: TypstOptions["imagePath"];
  outlineSubheads?: boolean;
  /** Typst for a scene break, given the break's own ornament id (undefined: the theme's) */
  ornament?: (id: string | undefined) => string;
  /** the author's block styles (the theme's `boxes` and `boxPresets`) */
  book?: BookBoxStyles;
  /** endnotes go to the book's Notes page instead of the chapter's end */
  endnotesOut?: string[];
}

const BOX_FONTS: Record<BoxFont, string> = {
  body: "auto",
  heading: "head-font",
  hand: `(${str(HAND_FONT)}, "Libertinus Serif", "Noto Emoji")`,
  mono: `(${str(TYPEWRITER_FONT)}, "DejaVu Sans Mono")`,
  sans: `("Inter", "Libertinus Serif", "Noto Emoji")`,
};

/** Arguments for the preamble's jp-box function, from the block catalog. */
function boxArgs(st: BoxStyle, label: string): string {
  const colour = (v: string) => (v === "accent" ? "accent" : `rgb(${str(v)})`);
  const c = st.line ? colour(st.line) : st.accent ? "accent" : "rgb(207, 200, 187)";
  const fill = st.fill && st.fill !== "none" ? (st.fill === "accent" ? "accent-tint" : `rgb(${str(st.fill)})`) : "none";
  const w = st.weight ?? 1;
  const pt = (n: number) => `${+(n * w).toFixed(2)}pt`;
  const stroke =
    {
      left: `(left: ${pt(3)} + ${c})`,
      box: `${pt(0.6)} + ${c}`,
      rules: `(top: ${pt(0.6)} + ${c}, bottom: ${pt(0.6)} + ${c})`,
      dashed: `(paint: ${c}, thickness: ${pt(0.8)}, dash: "dashed")`,
      double: `${pt(2)} + ${c}`,
      top: `(top: ${pt(2.4)} + ${c})`,
      none: "none",
    }[st.border ?? "none"] ?? "none";
  const framed = ((st.fill && st.fill !== "none") || (st.border && st.border !== "none")) && st.border !== "rules";
  const inset = framed ? "(x: 1em, y: 0.85em)" : st.border === "rules" ? "(x: 0em, y: 0.7em)" : "0pt";
  const args = [
    `fill: ${fill}`,
    `stroke: ${stroke}`,
    `inset: ${inset}`,
    `font: ${st.fontFamily ? `(${str(st.fontFamily)}, "Libertinus Serif", "Noto Emoji")` : BOX_FONTS[st.font ?? "body"]}`,
    `italic: ${!!st.italic}`,
    `align-to: ${st.align ?? "left"}`,
    `size: ${st.size ?? 1}em`,
    `lines: ${st.lines ?? 0}`,
    `checklist: ${!!st.checklist}`,
  ];
  if (st.leading) args.push(`leading: ${leading(st.leading)}`);
  if (st.bold) args.push("bold: true");
  if (st.corners !== undefined) args.push(`radius: ${["0pt", "2pt", "7pt"][st.corners] ?? "2pt"}`);
  if (st.text) args.push(`ink: ${colour(st.text)}`);
  else if (st.fill && st.fill.startsWith("#") && isDark(st.fill)) args.push(`ink: rgb("#f6f2ea")`);
  if (st.labelColor) args.push(`label-fill: ${colour(st.labelColor)}`);
  if (label) args.push(`label: ${str(label)}`, `label-end: ${!!st.labelAtEnd}`);
  return args.join(", ");
}

export function docToTypst(doc: DocNode | null | undefined, opts: DocTypstOptions = {}): string {
  let leadInPending = !!opts.leadIn;
  let firstPara = true;
  let depth = 0;
  const endnotes: string[] = [];

  function inline(nodes: DocNode[] | undefined): string {
    return (nodes ?? []).map(inlineNode).join("");
  }

  function inlineNode(n: DocNode): string {
    switch (n.type) {
      case "text":
        return marked(n.text ?? "", n.marks);
      case "hardBreak":
        return "#linebreak()";
      case "footnote":
        if (n.attrs?.endnote) {
          endnotes.push(String(n.attrs?.text ?? ""));
          return `#super[${endnotes.length}]`;
        }
        return `#footnote[#${str(String(n.attrs?.text ?? ""))}]`;
      case "image":
        return block(n);
      default:
        return inline(n.content);
    }
  }

  // an author can move the chapter's opening (lead-in, no indent) to a later paragraph
  const markedIdx = doc?.type === "doc" ? openingParagraph(doc.content) : -1;
  const opener = markedIdx >= 0 ? doc!.content![markedIdx] : null;

  function paragraph(n: DocNode): string {
    const kids = n.content ?? [];
    if (!kids.length) return "#v(1em)";
    const pf = paraFormat(n.attrs);
    const opening = depth === 0 && (opener ? n === opener : firstPara);
    let body: string;
    const first = kids[0];
    // print has no drop caps yet, so a forced drop cap opens with small capitals instead
    const lead = (opening && leadInPending) || pf.leadIn || pf.dropCap;
    if (lead && first.type === "text" && !(first.marks ?? []).length) {
      const words = (first.text ?? "").split(/(\s+)/);
      // first three words in small caps, the rest as usual
      const head = words.slice(0, 5).join("");
      const rest = words.slice(5).join("");
      body = `#sc[#${str(head)}]` + (rest ? `#${str(rest)}` : "") + inline(kids.slice(1));
    } else body = inline(kids);
    if (opening) leadInPending = false;
    if (pf.tracking) body = `#text(tracking: ${pf.tracking}em)[${body}]`;
    // the opener is set in its own paragraph, so the first text paragraph must not indent
    if (opening) firstPara = false;
    const indent = opening || pf.noIndent || pf.dropCap ? "0em" : pf.indent !== undefined ? `${pf.indent}em` : null;
    if (indent) body = `#par(first-line-indent: ${indent})[${body}]`;
    if (pf.left) body = `#pad(left: ${pf.left}em)[${body}]`;
    const a = n.attrs?.textAlign;
    if (a === "center" || a === "right") return `#align(${a})[${body}]`;
    return body;
  }

  function blocks(nodes: DocNode[] | undefined): string {
    return (nodes ?? []).map(block).filter(Boolean).join("\n\n");
  }

  function nested(nodes: DocNode[] | undefined): string {
    depth++;
    try {
      return blocks(nodes);
    } finally {
      depth--;
    }
  }

  function imagePath(src: unknown): string | null {
    return typeof src === "string" && src && opts.imagePath ? opts.imagePath(src) : null;
  }

  function block(n: DocNode): string {
    switch (n.type) {
      case "paragraph":
        return paragraph(n);
      case "heading": {
        const level = Math.min(Math.max(Number(n.attrs?.level ?? 2), 2), 4);
        if (!opener) leadInPending = false;
        // sub-chapters join the printed contents when the book asks for them
        return `#heading(level: ${level}, outlined: ${depth === 0 && !!opts.outlineSubheads && isSubhead(n)})[${inline(n.content)}]`;
      }
      case "blockquote":
        return `#quote(block: true)[${nested(n.content)}]`;
      case "callout":
        return `#callout[${nested(n.content)}]`;
      case "box": {
        const def = boxDef(String(n.attrs?.variant ?? ""));
        const st = boxStyle(def.id, opts.book, n.attrs?.look, n.attrs?.preset);
        if (st.only === "ebook") return "";
        // print-only blocks are plain text in print; their dashed frame is an editor hint
        if (st.only) return nested(n.content);
        const label = n.attrs?.label != null ? String(n.attrs.label) : (st.label ?? "");
        let kids = n.content ?? [];
        let lead = "";
        if (st.lead && kids[0]?.type === "paragraph") {
          depth++;
          lead = `#block(below: 0.5em, text(size: ${def.id === "stat" ? "2.6em" : "1.35em"}, weight: 700, font: head-font, fill: ${def.id === "stat" ? "accent" : "black"})[${inline(kids[0].content)}])\n\n`;
          depth--;
          kids = kids.slice(1);
        }
        if (def.id === "overlay") {
          const path = imagePath(n.attrs?.src);
          const inner = nested(kids);
          if (!path) return `#jp-box(${boxArgs({ ...st, fill: "#333333" }, "")})[#text(fill: white)[${inner}]]`;
          return `#jp-overlay(${str(path)})[${inner}]`;
        }
        return `#jp-box(${boxArgs(st, label)})[${lead}${nested(kids)}]`;
      }
      case "chat":
        return `#block(above: 1.3em, below: 1.3em, width: 100%)[${(n.content ?? [])
          .map((m) => `#jp-msg(me: ${m.attrs?.from === "me"}, name: ${str(n.attrs?.group ? String(m.attrs?.name ?? "") : "")})[${inline(m.content)}]`)
          .join("\n")}]`;
      case "columns": {
        const cols = n.content ?? [];
        return `#grid(columns: (${cols.map(() => "1fr").join(", ")}), column-gutter: 1.2em, ${cols.map((c) => `[${nested(c.content)}]`).join(", ")})`;
      }
      case "table": {
        const rows = n.content ?? [];
        const width = Math.max(1, ...rows.map((r) => r.content?.length ?? 0));
        const cell = (c: DocNode) => `[${nested(c.content)}]`;
        const head = rows[0]?.content?.every((c) => c.type === "tableHeader") ? rows[0] : null;
        const body = head ? rows.slice(1) : rows;
        const pad = (r: DocNode) => [...(r.content ?? []).map(cell), ...Array(width - (r.content?.length ?? 0)).fill("[]")];
        return `#jp-table(${width}, ${head ? `table.header(${pad(head).join(", ")}), ` : ""}${body.map((r) => pad(r).join(", ")).join(", ")})`;
      }
      case "pageBreak":
        return "#pagebreak(weak: true)";
      case "spacer":
        return `#v(${(Math.min(Math.max(Number(n.attrs?.size) || 2, 1), 8) * 1.4).toFixed(1)}em)`;
      case "bulletList":
        return `#list(${(n.content ?? []).map((li) => `[${nested(li.content)}]`).join(", ")})`;
      case "orderedList":
        return `#enum(start: ${Number(n.attrs?.start ?? 1)}, ${(n.content ?? []).map((li) => `[${nested(li.content)}]`).join(", ")})`;
      case "horizontalRule": {
        const own = typeof n.attrs?.ornament === "string" && n.attrs.ornament ? n.attrs.ornament : undefined;
        return opts.ornament ? opts.ornament(own) : "#scene-break()";
      }
      case "image": {
        const path = imagePath(n.attrs?.src);
        if (!path) return "";
        const caption = n.attrs?.title ? `, caption: [#${str(String(n.attrs.title))}]` : "";
        const align = pictureAlign(n.attrs?.layout);
        const fig = `figure(image(${str(path)}, width: ${pictureWidth(n.attrs)}%)${caption})`;
        return align === "left" || align === "right" ? `#align(${align}, ${fig})` : `#${fig}`;
      }
      case "doc": {
        const out = blocks(n.content);
        if (endnotes.length && opts.endnotesOut) {
          opts.endnotesOut.push(...endnotes);
          return out;
        }
        return endnotes.length ? `${out}\n\n#jp-endnotes((${endnotes.map((t) => `[#${str(t)}]`).join(", ")},))` : out;
      }
      default:
        return inline(n.content);
    }
  }

  return block(doc ?? { type: "doc" });
}

function leading(lineHeight: number): string {
  return `${Math.max(0.45, lineHeight - 0.7).toFixed(2)}em`;
}

/** A scene-break ornament as a Typst expression (no leading #). */
export function ornamentTypst(id: string | undefined, theme: InteriorTheme): string {
  const o = getOrnament(id ?? theme.ornament);
  const wrap = (inner: string, gap = "1.1em") => `block(above: ${gap}, below: ${gap}, width: 100%, align(center, ${inner}))`;
  switch (o.kind) {
    case "text":
      return wrap(`text(tracking: 0.2em)[#${str(o.glyph ?? "* * *")}]`);
    case "double":
      return wrap(`stack(spacing: 2pt, line(length: 18%, stroke: 0.5pt), line(length: 18%, stroke: 0.5pt))`, "1.3em");
    case "space":
      return "v(1.6em)";
    case "drawn": {
      const art = ornamentSvg(o.id, theme.accent);
      if (art) return wrap(`image(bytes(${str(art.svg)}), format: "svg", height: 0.95em)`, "1.2em");
      return wrap("line(length: 18%, stroke: 0.5pt)", "1.3em");
    }
    default:
      return wrap("line(length: 18%, stroke: 0.5pt)", "1.3em");
  }
}

function sceneBreak(theme: InteriorTheme): string {
  return `#let scene-break() = ${ornamentTypst(theme.ornament, theme)}`;
}

/** A background as Typst content filling the page. */
/**
 * What goes behind a page. Spreads are drawn two pages wide: a left-hand page shows the left half
 * and a right-hand page the right half, so the picture runs across the open book. `inset` keeps a
 * full-page picture that many inches clear of the binding.
 */
function backgroundTypst(bg: ResolvedBackground, imagePath: TypstOptions["imagePath"], inset = 0): string | null {
  if (isLibraryBackground(bg.src)) {
    const art = backgroundArt(libraryId(bg.src), bg.strength);
    if (!art) return null;
    const svg = `bytes(${str(art.svg)})`;
    if (art.mode === "spread") return `context place(top + left, dx: if calc.even(here().page()) { 0pt } else { -page.width }, image(${svg}, format: "svg", width: 2 * page.width, height: page.height, fit: "cover"))`;
    if (art.mode === "cover") return `image(${svg}, format: "svg", width: 100%, height: 100%, fit: "cover")`;
    const w = (art.width * 0.5).toFixed(1);
    const h = (art.height * 0.5).toFixed(1);
    return `rect(width: 100%, height: 100%, fill: tiling(size: (${w}pt, ${h}pt), image(${svg}, format: "svg", width: ${w}pt, height: ${h}pt)))`;
  }
  const path = imagePath ? imagePath(bg.src) : null;
  if (!path) return null;
  const veil = bg.strength < 1 ? `\n  place(top + left, rect(width: 100%, height: 100%, fill: white.transparentize(${Math.round(bg.strength * 100)}%)))` : "";
  if (inset > 0)
    return `context {\n  let g = ${inset}in\n  place(top + if calc.odd(here().page()) { right } else { left }, image(${str(path)}, width: page.width - g, height: 100%, fit: "cover"))${veil}\n}`;
  return `{\n  image(${str(path)}, width: 100%, height: 100%, fit: "cover")${veil}\n}`;
}

function preamble(input: ExportInput, format: BookFormat, theme: InteriorTheme, pageCount: number, binding: Binding, backgrounds: Map<string, string>): string {
  const { book } = input;
  const g = pageGeometry(format.trim, pageCount, format.bleed, binding, format.margins);
  const size = format.largePrint ? 16 : format.fontSize;
  const lh = format.largePrint ? Math.max(format.lineHeight, 1.5) : format.lineHeight;
  const bodyFont = `(${str(theme.bodyFont)}, "Libertinus Serif", "Noto Emoji")`;
  const headFont = `(${str(theme.headingFont)}, ${str(theme.bodyFont)}, "Libertinus Serif", "Noto Emoji")`;
  const scale = g.trim.width >= 7 ? 1.15 : g.trim.width <= 5.25 ? 0.9 : 1;
  const ts = textStyle(theme);
  const opener = `${(g.trim.height * 0.16 * ts.headingSpace).toFixed(2)}in`;
  const subtitle = (v: string) => (ts.subtitleStyle === "smallcaps" ? `text(size: 1.1em, sc(${v}))` : `text(size: 1.1em${ts.subtitleStyle === "italic" ? ', style: "italic"' : ""}, ${v})`);
  const rh = runningHeads(format);
  // what a head says, as Typst: the book's, or the section's own (from its <jp-start> metadata)
  const slot = (c: HeadContent) => ({ none: "none", book: "book-title", author: "book-author", chapter: 'cur.value.at("htitle", default: cur.value.title)', part: 'cur.value.at("part", default: "")' })[c];
  const headStyle = rh.style === "smallcaps" ? "sc(t)" : rh.style === "italic" ? "emph(t)" : "t";
  const folio = rh.folioStyle === "dashes" ? '[– #n –]' : rh.folioStyle === "word" ? "[Page #n]" : "n";
  return `// Generated by Jollof Pages. Compile with: typst compile --font-path fonts book.typ
#let book-title = ${str(book.title)}
#let book-author = ${str(authorName(input))}
#let accent = rgb(${str(theme.accent)})
#let accent-tint = rgb(${str(paleTint(theme.accent))})
#let head-font = ${headFont}
#let label-font = ${theme.labelFont ? `(${str(theme.labelFont)}, ${str(theme.headingFont)})` : "head-font"}
// synthesized small caps: the static OFL font files do not all carry the smcp feature
#let sc(body) = text(size: 0.82em, tracking: 0.06em, upper(body))

#set document(title: book-title, author: book-author)
#set text(font: ${bodyFont}, size: ${size}pt, lang: ${str((book.language || "en").slice(0, 2))}, hyphenate: ${ts.hyphenate}, number-type: "old-style"${ts.widows === "normal" ? "" : `, costs: (widow: ${ts.widows === "strict" ? "1000%" : "0%"}, orphan: ${ts.widows === "strict" ? "1000%" : "0%"})`})
#set par(justify: ${ts.justify ?? true}, leading: ${leading(lh)}, spacing: ${theme.indent ? (ts.paraSpacing ? `${leading(lh)} + ${ts.paraSpacing}em` : leading(lh)) : `${ts.paraSpacing ?? 0.9}em`}, first-line-indent: ${theme.indent ? `${ts.indentSize ?? 1.4}em` : "0em"})
#show heading: set text(font: head-font, hyphenate: false)
#show heading.where(level: 1): none
#show heading.where(level: 2): it => block(above: 1.7em, below: 0.75em, sticky: true, text(size: 1.22em, weight: 700, it.body))
#show heading.where(level: 3): it => block(above: 1.4em, below: 0.6em, sticky: true, text(size: 1.08em, weight: 700, it.body))
#show heading.where(level: 4): it => block(above: 1.2em, below: 0.5em, sticky: true, text(size: 1em, weight: 700, style: "italic", it.body))
#show quote.where(block: true): it => pad(left: 1.6em, right: 1.6em, text(style: "italic", it.body))
#show figure.caption: set text(size: 0.85em, style: "italic")
#show footnote.entry: set text(size: 0.8em)
#show outline.entry.where(level: 1): it => block(above: 0.9em, it)
#show outline.entry.where(level: 2): it => block(above: 0.45em, text(size: 0.92em, it))
#show list: set block(above: 0.9em, below: 0.9em)
#show enum: set block(above: 0.9em, below: 0.9em)
#set list(indent: 0.6em, spacing: 0.5em)
#set enum(indent: 0.6em, spacing: 0.5em)
#let callout(body) = block(above: 1.3em, below: 1.3em, width: 100%, inset: (x: 1em, y: 0.85em), fill: luma(238), stroke: (left: 2.5pt + accent), {
  set par(first-line-indent: 0em, justify: false)
  body
})
${sceneBreak(theme)}

// special blocks (src/lib/blocks.ts)
#let jp-box(fill: none, stroke: none, inset: 0pt, font: auto, italic: false, align-to: left, size: 1em, lines: 0, checklist: false, radius: 2pt, ink: auto, label-fill: accent, leading: auto, bold: false, label: none, label-end: false, body) = block(above: 1.3em, below: 1.3em, width: 100%, inset: inset, fill: fill, stroke: stroke, radius: radius, breakable: true, {
  set par(first-line-indent: 0em, justify: false)
  set text(size: size, style: if italic { "italic" } else { "normal" })
  set text(fill: ink) if ink != auto
  set text(weight: 700) if bold
  set par(leading: leading) if leading != auto
  set text(font: font) if font != auto
  set align(align-to)
  set list(marker: box(width: 0.65em, height: 0.65em, stroke: 0.6pt + accent, radius: 1pt)) if checklist
  if label != none and not label-end { block(below: 0.55em, text(font: head-font, size: 0.72em, tracking: 0.12em, style: "normal", fill: label-fill, upper(label))) }
  body
  if lines > 0 { for i in range(lines) { v(1.35em); line(length: 100%, stroke: 0.4pt + luma(165)) } }
  if label != none and label-end { v(0.6em); text(style: "italic", label) }
})
#let jp-overlay(src, body) = block(above: 1.3em, below: 1.3em, width: 100%, height: 2.4in, clip: true, radius: 2pt, {
  image(src, width: 100%, height: 100%, fit: "cover")
  place(top + left, rect(width: 100%, height: 100%, fill: black.transparentize(50%)))
  place(horizon + center, pad(x: 1.4em, { set par(first-line-indent: 0em, justify: false); set align(center); text(fill: white, size: 1.15em, body) }))
})
#let jp-msg(me: false, name: "", body) = block(above: 0.35em, below: 0.35em, width: 100%, align(if me { right } else { left }, block(width: 72%, align(if me { right } else { left }, {
  if name != "" { text(font: ("Inter", "Libertinus Serif"), size: 0.66em, fill: luma(110), name); linebreak() }
  box(fill: if me { accent } else { luma(232) }, inset: (x: 0.75em, y: 0.5em), radius: 0.9em, {
    set par(first-line-indent: 0em, justify: false)
    text(font: ("Inter", "Libertinus Serif", "Noto Emoji"), size: 0.82em, fill: if me { white } else { black }, body)
  })
}))))
#let jp-table(n, ..cells) = block(above: 1.2em, below: 1.2em, {
  set par(first-line-indent: 0em, justify: false)
  set text(size: 0.9em)
  table(columns: (1fr,) * n, inset: 0.45em, stroke: 0.5pt + luma(185), fill: (x, y) => if y == 0 { accent-tint }, ..cells)
})
// index entries: the words, plus a marker the Index page finds with its page number
#let jp-ix(term, body) = [#body#metadata((ix: term))<jp-ix>]
#let jp-index() = context {
  let pages = (:)
  for m in query(<jp-ix>) {
    let loc = m.location()
    let fmt = if loc.page-numbering() == none { "1" } else { loc.page-numbering() }
    let n = numbering(fmt, ..counter(page).at(loc))
    let have = pages.at(m.value.ix, default: ())
    if n not in have { have.push(n) }
    pages.insert(m.value.ix, have)
  }
  set par(first-line-indent: 0em, justify: false, hanging-indent: 1em, spacing: 0.35em)
  set text(size: 0.9em)
  let letter = ""
  columns(2, gutter: 1.6em, {
    for k in pages.keys().sorted(key: k => lower(k)) {
      let l = upper(k.clusters().first())
      if l != letter {
        letter = l
        v(0.7em)
        text(font: head-font, weight: 700, l)
        parbreak()
      }
      [#k, #pages.at(k).join(", ")]
      parbreak()
    }
  })
}
// the book's Notes page: each chapter's endnotes under its title
#let jp-note-group(title, notes) = {
  v(1.2em)
  text(font: head-font, weight: 700, title)
  v(0.3em)
  set text(size: 0.9em)
  set par(first-line-indent: 0em)
  enum(..notes)
}
#let jp-endnotes(notes) = {
  v(2em)
  text(font: head-font, weight: 700)[Notes]
  set text(size: 0.85em)
  set par(first-line-indent: 0em)
  enum(..notes)
}
#let jp-lines(n) = for i in range(n) { v(1.5em); line(length: 100%, stroke: 0.4pt + luma(165)) }

// backgrounds by key, drawn behind the pages of the elements that use them
#let jp-bg = ${backgrounds.size ? `(\n${[...backgrounds].map(([k, v]) => `  ${k}: ${v},`).join("\n")}\n)` : "(:)"}
// markers: <jp-start> opens an element, <jp-end> closes it. Headers use them to skip
// opening pages and the blank pages that keep chapters on the right.
#let page-state() = {
  let p = here().page()
  let on-page = query(<jp-start>).filter(m => m.location().page() == p)
  if on-page.len() > 0 { return (kind: "opener", value: on-page.first().value) }
  let before = query(selector.or(<jp-start>, <jp-end>).before(here()))
  if before.len() == 0 { return (kind: "blank", value: none) }
  let last = before.last()
  if last.value.at("end", default: false) {
    // an element that ended on an earlier page leaves this one blank
    if last.location().page() < p { return (kind: "blank", value: none) }
    let starts = query(selector(<jp-start>).before(here()))
    return (kind: "text", value: starts.last().value)
  }
  (kind: "text", value: last.value)
}

#set page(
  width: ${g.pageWidth}in,
  height: ${g.pageHeight}in,
  binding: left,
  margin: (inside: ${g.margins.inside}in, outside: ${g.margins.outside}in, top: ${g.margins.top}in, bottom: ${g.margins.bottom}in),
  header-ascent: 35%,
  numbering: "${format.countFrontMatter ? "1" : "i"}",
  background: context {
    let cur = page-state()
    if cur.kind == "blank" or cur.value == none { return }
    let key = cur.value.at("bg", default: none)
    if key == none { return }
    if cur.value.at("bgo", default: false) and cur.kind != "opener" { return }
    jp-bg.at(key)
  },
  header: context {
    let cur = page-state()
    if cur.kind != "text" or cur.value == none { return }
    let recto = calc.odd(here().page())
    let t = none
    if cur.value.section != "front" and cur.value.at("head", default: true) {
      t = if recto { ${slot(rh.right)} } else { ${slot(rh.left)} }
      if t == "" { t = none }
    }
    let n = if cur.value.numbers { counter(page).display() } else { none }
    let num = ${rh.folio === "top-outside" ? `if n != none { ${folio} } else { none }` : "none"}
    if t == none and num == none { return }
    let head = if t != none { text(size: 0.78em, tracking: 0.04em, ${headStyle}) } else { [] }
    let outside = if recto { right } else { left }
    ${
      rh.folio === "top-outside"
        ? `let line-up = if recto { (${rh.align === "center" ? "align(center, head)" : "align(left, head)"}, align(right, text(size: 0.85em, num))) } else { (align(left, text(size: 0.85em, num)), ${rh.align === "center" ? "align(center, head)" : "align(right, head)"}) }
    grid(columns: if recto { (1fr, auto) } else { (auto, 1fr) }, column-gutter: 1em, ..line-up)`
        : `align(${rh.align === "center" ? "center" : "outside"}, head)`
    }${rh.rule ? `
    v(-0.45em)
    line(length: 100%, stroke: 0.4pt + luma(140))` : ""}
  },
  footer: context {
    let cur = page-state()
    if cur.kind == "blank" or cur.value == none or not cur.value.numbers { return }
    ${rh.folio === "top-outside" || rh.folio === "none" ? "return" : `${rh.openerFolio ? "" : 'if cur.kind == "opener" { return }\n    '}let n = counter(page).display()
    let outside = if calc.odd(here().page()) { right } else { left }
    align(${rh.folio === "bottom-center" ? "center" : "outside"}, text(size: 0.85em, ${folio}))`}
  },
)

// opening of a chapter. small: a compact title block; img: a picture above the title, or behind
// it when invert is on (white type over a darkened image)
#let opener(label, title, subtitle, small: false, img: none, invert: false) = {
  set par(first-line-indent: 0em, justify: false)
  let s = if small { 0.62 } else { 1 }
  let inverted = invert and img != none
  let label-fill = if inverted { white } else { accent }
  let head = align(${theme.headingAlign}, {
    ${
      theme.labelFont
        ? `if label != "" { text(font: label-font, size: 2em * s, fill: label-fill, label); v(0.35em * s) }`
        : theme.labelStyle === "large"
        ? `if label != "" { text(font: head-font, size: ${(3 * scale).toFixed(2)}em * s, weight: ${theme.headingWeight}, fill: label-fill, label); v(0.3em) }`
        : theme.labelStyle === "upper"
          ? `if label != "" { text(font: head-font, size: 0.8em, tracking: 0.16em, upper(label)); v(0.7em * s) }`
          : `if label != "" { text(font: head-font, size: 1.05em, tracking: 0.08em, sc(label)); v(0.7em * s) }`
    }
    ${theme.headingRule === "above" || theme.headingRule === "both" ? `line(length: 100%, stroke: 0.6pt + accent); v(0.8em * s)` : ""}
    text(font: head-font, size: ${(theme.headingSize * scale).toFixed(1)}pt * s, weight: ${theme.headingWeight}, style: ${theme.headingItalic ? '"italic"' : '"normal"'}${theme.headingCase === "upper" ? ", tracking: 0.06em" : ""}, ${theme.headingCase === "upper" ? "upper(title)" : "title"})
    ${
      theme.headingRule === "below" || theme.headingRule === "both"
        ? `v(0.5em * s); line(length: 100%, stroke: 0.6pt + accent)`
        : theme.headingRule === "short"
          ? `v(0.55em * s); line(length: 3em, stroke: 0.6pt + accent)`
          : ""
    }
    if subtitle != "" { v(0.5em * s); ${subtitle("subtitle")} }
  })
  if inverted {
    block(width: 100%, height: ${(g.trim.height * 0.32).toFixed(2)}in, clip: true, {
      image(img, width: 100%, height: 100%, fit: "cover")
      place(top + left, rect(width: 100%, height: 100%, fill: black.transparentize(60%)))
      place(horizon + left, pad(x: 1.2em, text(fill: white, head)))
    })
  } else {
    if img != none {
      image(img, width: 100%, height: ${(g.trim.height * 0.28).toFixed(2)}in, fit: "cover")
      v(1.4em * s)
    } else { v(${opener} * s) }
    head
  }
  v(${(g.trim.height * 0.07 * ts.headingSpace).toFixed(2)}in * s)
}
`;
}

const LEAD_IN_KINDS = new Set(["chapter", "introduction", "foreword", "preface", "conclusion", "afterword"]);

/** endnotes gathered for the book's Notes page: `out` collects a chapter's, `collected` is the Notes page's list */
interface BookNotes {
  out?: string[];
  collected?: string;
}

function elementTypst(
  input: ExportInput,
  e: BookElement,
  format: BookFormat,
  theme: InteriorTheme,
  imagePath: TypstOptions["imagePath"],
  bgKey: string | null,
  bgOpener: boolean,
  notes: BookNotes = {},
  head: { title: string; part: string } = { title: e.title, part: "" },
): string {
  const { book } = input;
  const o = e.options;
  const fullImage = e.kind.layout === "full_image";
  const numbers = (e.section !== "front" || e.inToc) && !o.hidePageNumber && !fullImage;
  const meta = `#metadata((section: ${str(e.section)}, title: ${str(e.title)}, htitle: ${str(head.title)}, part: ${str(head.part)}, numbers: ${numbers}, head: ${!o.hideHeader && !fullImage}, bg: ${bgKey ? str(bgKey) : "none"}, bgo: ${bgOpener})) <jp-start>`;
  const imgPath = e.image && imagePath ? imagePath(e.image) : null;
  const heading = `#heading(level: 1, outlined: ${e.inToc}, bookmarked: true)[#${str(tocText(e))}]`;
  const content = (lead = false) =>
    docToTypst(e.chapter.content, {
      leadIn: lead,
      imagePath,
      outlineSubheads: format.tocSubheads && e.inToc && e.kind.id !== "part",
      ornament: (own) => (own ? `#${ornamentTypst(own, theme)}` : "#scene-break()"),
      book: theme,
      endnotesOut: notes.out,
    });
  if (fullImage)
    // the picture is the page's background (see buildTypst); the box keeps the page from collapsing
    return `${meta}
${heading}
#box(width: 1pt, height: 1pt)
${content()}`;
  switch (e.kind.id) {
    case "half_title":
      return `${meta}
#set par(first-line-indent: 0em, justify: false)
#v(30%)
#align(center, text(font: head-font, size: 18pt, weight: ${theme.headingWeight}, book-title))`;
    case "title_page":
      return `${meta}
#set par(first-line-indent: 0em, justify: false)
#v(22%)
#align(center)[
  #text(font: head-font, size: 26pt, weight: ${theme.headingWeight}, book-title)
  ${book.subtitle ? `#v(0.6em)\n  #text(size: 13pt, style: "italic")[#${str(book.subtitle)}]` : ""}
  #v(3em)
  #text(size: 13pt, tracking: 0.06em, sc(book-author))
]
${book.imprint ? `#place(bottom + center, text(size: 10pt, tracking: 0.08em)[#${str(book.imprint)}])` : ""}`;
    case "copyright":
      return `${meta}
#set par(first-line-indent: 0em, justify: false, spacing: 0.9em)
#align(bottom, text(size: 0.8em)[${content()}])`;
    case "dedication":
    case "epigraph":
      return `${meta}
#set par(first-line-indent: 0em, justify: false)
#v(28%)
#align(center, text(style: "italic")[${content()}])`;
    case "contents":
      return `${meta}
#opener("", ${str(e.title)}, "")
#outline(title: none, depth: ${format.tocSubheads ? 2 : 1}, indent: ${format.tocSubheads ? "1.2em" : "0pt"})`;
    case "part":
    case "act":
      return `${meta}
${heading}
#v(30%)
#align(center)[
  #text(font: head-font, size: 1em, tracking: 0.16em, upper(${str(e.label)}))
  #v(0.8em)
  #text(font: head-font, size: 24pt, weight: ${theme.headingWeight})[#${str(e.title)}]${e.subtitle ? `\n  #v(0.6em)\n  #text(size: 1.1em, style: "italic")[#${str(e.subtitle)}]` : ""}
]
${content()}`;
    case "also_by":
    case "also_by_front":
      return `${meta}
${heading}
#opener("", ${str(e.title)}, "")
#set par(first-line-indent: 0em)
${input.alsoBy.length ? input.alsoBy.map((b) => `#${str(b.title)}${b.subtitle ? `#": "#emph[#${str(b.subtitle)}]` : ""}`).join("\n\n") : '#"More books coming soon."'}`;
    default: {
      const opening = o.hideHeading
        ? imgPath
          ? `#image(${str(imgPath)}, width: 100%, height: 28%, fit: "cover")\n#v(1.4em)`
          : ""
        : `#opener(${str(e.label)}, ${str(e.title)}, ${str(e.subtitle)}, small: ${!!o.smallTitle}, img: ${imgPath ? str(imgPath) : "none"}, invert: ${!!o.invert})`;
      const body = content(theme.leadIn && format.dropCaps && LEAD_IN_KINDS.has(e.kind.id));
      return `${meta}
${heading}
${opening}
${e.kind.layout === "centered" ? `#[\n#set par(first-line-indent: 0em, justify: false)\n#set align(center)\n${body}\n]` : body}${e.kind.layout === "lined" ? "\n\n#jp-lines(16)" : ""}${notes.collected ? `\n\n${notes.collected}` : ""}`;
    }
  }
}

/** Whole-book Typst source. */
export function buildTypst(input: ExportInput, opts: TypstOptions): string {
  const binding = opts.binding ?? "paperback";
  const base = bookFormat(input.book);
  const format = { ...base, ...printEdition(base, binding) };
  const theme = themeFor(format);
  const elements = forEdition(orderedElements(input.chapters, theme), "print").filter((e) => format.printToc || e.kind.id !== "contents");
  const heads = headTitles(elements);
  // one Typst definition per distinct background, shared by the elements that use it
  const backgrounds = new Map<string, string>();
  const keyOf = new Map<string, string>();
  const bgFor = elements.map((e) => {
    const bg: ResolvedBackground | null =
      e.kind.layout === "full_image" && e.image ? { src: e.image, strength: 1, openerOnly: true } : elementBackground(e, format, theme);
    if (!bg) return null;
    const picture = e.kind.layout === "full_image" && !!e.image;
    const inset = picture ? (format.margins?.pictureGutter ?? 0) : 0;
    const id = `${bg.src}@${bg.strength}@${inset}`;
    let key = keyOf.get(id);
    if (!key) {
      const content = backgroundTypst(bg, opts.imagePath, inset);
      if (!content) return null;
      key = `b${keyOf.size + 1}`;
      keyOf.set(id, key);
      backgrounds.set(key, content);
    }
    return { key, opener: bg.openerOnly, ink: bg.openerOnly ? null : textOverBackground(bg.src) };
  });
  const parts: string[] = [preamble(input, format, theme, opts.pageCount, binding, backgrounds)];
  // with endnotes for the whole book, the chapters before the Notes page send theirs there
  const notesAt = textStyle(theme).endnotes === "book" ? elements.findIndex((e) => e.kind.id === "notes") : -1;
  const groups: { title: string; items: string[] }[] = [];
  let bodyStarted = false;
  const notesFor = (i: number): BookNotes => {
    if (i < notesAt) {
      const g = { title: tocText(elements[i]), items: [] as string[] };
      groups.push(g);
      return { out: g.items };
    }
    if (i !== notesAt) return {};
    const list = groups.filter((g) => g.items.length).map((g) => `#jp-note-group(${str(g.title)}, (${g.items.map((t) => `[#${str(t)}]`).join(", ")},))`);
    return list.length ? { collected: list.join("\n") } : {};
  };
  const indexed = elements.some((e) => hasMark(e.chapter.content, "indexTerm"));
  elements.forEach((e, i) => {
    const out: string[] = [];
    if (i > 0) {
      const firstBody = !bodyStarted && e.section !== "front";
      const right = (format.chaptersOnRight || (firstBody && format.firstChapterOnRight !== false)) && e.kind.id !== "copyright";
      out.push(right ? `#pagebreak(to: "odd")` : "#pagebreak()");
    }
    if (!bodyStarted && e.section !== "front") {
      bodyStarted = true;
      if (!format.countFrontMatter) out.push(`#set page(numbering: "1")\n#counter(page).update(1)`);
    }
    // each element sets its own paragraph rules inside a scope
    const ink = bgFor[i]?.ink;
    out.push(`#[\n${ink ? `#set text(fill: rgb(${str(ink)}))\n` : ""}${elementTypst(input, e, format, theme, opts.imagePath, bgFor[i]?.key ?? null, bgFor[i]?.opener ?? false, e.kind.id === "index" && indexed ? { collected: "#jp-index()" } : notesFor(i), heads[i])}\n#metadata((end: true)) <jp-end>\n]`);
    parts.push(out.join("\n"));
  });
  return parts.join("\n\n") + "\n";
}

function hasMark(n: DocNode | null | undefined, type: string): boolean {
  if (!n) return false;
  if (n.marks?.some((m) => m.type === type)) return true;
  return (n.content ?? []).some((c) => hasMark(c, type));
}
