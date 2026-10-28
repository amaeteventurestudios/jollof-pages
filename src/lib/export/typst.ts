import { authorName, orderedElements, tocText, type BookElement, type ExportInput } from "../book-model";
import { pageGeometry, type Binding } from "../kdp";
import { isSubhead, type DocMark, type DocNode } from "../doc/types";
import { getTheme, sceneBreakGlyph, type InteriorTheme } from "../themes";
import { bookFormat, printEdition, type BookFormat } from "../types";

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
    }
  }
  return out;
}

export function docToTypst(doc: DocNode | null | undefined, opts: { leadIn?: boolean; imagePath?: TypstOptions["imagePath"]; outlineSubheads?: boolean } = {}): string {
  let leadInPending = !!opts.leadIn;
  let firstPara = true;

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
        return `#footnote[#${str(String(n.attrs?.text ?? ""))}]`;
      case "image":
        return block(n);
      default:
        return inline(n.content);
    }
  }

  function paragraph(n: DocNode): string {
    const kids = n.content ?? [];
    if (!kids.length) return "#v(1em)";
    let body: string;
    const first = kids[0];
    if (leadInPending && first.type === "text" && !(first.marks ?? []).length) {
      const words = (first.text ?? "").split(/(\s+)/);
      // first three words in small caps, the rest as usual
      const lead = words.slice(0, 5).join("");
      const rest = words.slice(5).join("");
      body = `#sc[#${str(lead)}]` + (rest ? `#${str(rest)}` : "") + inline(kids.slice(1));
    } else body = inline(kids);
    leadInPending = false;
    // the opener is set in its own paragraph, so the first text paragraph must not indent
    if (firstPara) {
      firstPara = false;
      body = `#par(first-line-indent: 0em)[${body}]`;
    }
    const a = n.attrs?.textAlign;
    if (a === "center" || a === "right") return `#align(${a})[${body}]`;
    return body;
  }

  function blocks(nodes: DocNode[] | undefined): string {
    return (nodes ?? []).map(block).filter(Boolean).join("\n\n");
  }

  function block(n: DocNode): string {
    switch (n.type) {
      case "paragraph":
        return paragraph(n);
      case "heading": {
        const level = Math.min(Math.max(Number(n.attrs?.level ?? 2), 2), 4);
        leadInPending = false;
        // sub-chapters join the printed contents when the book asks for them
        return `#heading(level: ${level}, outlined: ${!!opts.outlineSubheads && isSubhead(n)})[${inline(n.content)}]`;
      }
      case "blockquote":
        return `#quote(block: true)[${blocks(n.content)}]`;
      case "callout":
        return `#callout[${blocks(n.content)}]`;
      case "bulletList":
        return `#list(${(n.content ?? []).map((li) => `[${blocks(li.content)}]`).join(", ")})`;
      case "orderedList":
        return `#enum(start: ${Number(n.attrs?.start ?? 1)}, ${(n.content ?? []).map((li) => `[${blocks(li.content)}]`).join(", ")})`;
      case "horizontalRule":
        return "#scene-break()";
      case "image": {
        const src = typeof n.attrs?.src === "string" ? n.attrs.src : "";
        const path = src && opts.imagePath ? opts.imagePath(src) : null;
        if (!path) return "";
        const caption = n.attrs?.title ? `, caption: [#${str(String(n.attrs.title))}]` : "";
        return `#figure(image(${str(path)}, width: 85%)${caption})`;
      }
      case "doc":
        return blocks(n.content);
      default:
        return inline(n.content);
    }
  }

  return block(doc ?? { type: "doc" });
}

function leading(lineHeight: number): string {
  return `${Math.max(0.45, lineHeight - 0.7).toFixed(2)}em`;
}

function sceneBreak(theme: InteriorTheme): string {
  const glyph = sceneBreakGlyph(theme);
  return glyph
    ? `#let scene-break() = block(above: 1.1em, below: 1.1em, width: 100%, align(center, text(tracking: 0.2em)[#${str(glyph)}]))`
    : `#let scene-break() = block(above: 1.3em, below: 1.3em, width: 100%, align(center, line(length: 18%, stroke: 0.5pt)))`;
}

function preamble(input: ExportInput, format: BookFormat, theme: InteriorTheme, pageCount: number, binding: Binding): string {
  const { book } = input;
  const g = pageGeometry(format.trim, pageCount, format.bleed, binding);
  const size = format.largePrint ? 16 : format.fontSize;
  const lh = format.largePrint ? Math.max(format.lineHeight, 1.5) : format.lineHeight;
  const bodyFont = `(${str(theme.bodyFont)}, "Libertinus Serif")`;
  const headFont = `(${str(theme.headingFont)}, ${str(theme.bodyFont)}, "Libertinus Serif")`;
  const scale = g.trim.width >= 7 ? 1.15 : g.trim.width <= 5.25 ? 0.9 : 1;
  const opener = `${(g.trim.height * 0.16).toFixed(2)}in`;
  const runningHead = format.runningHeads
    ? `
    if calc.even(p) { align(left, text(size: 0.78em, tracking: 0.06em, sc(book-title))) }
    else { align(right, text(size: 0.78em, tracking: 0.06em, sc(cur.value.title))) }`
    : "";
  return `// Generated by Jollof Pages. Compile with: typst compile --font-path fonts book.typ
#let book-title = ${str(book.title)}
#let book-author = ${str(authorName(input))}
#let accent = rgb(${str(theme.accent)})
#let head-font = ${headFont}
// synthesized small caps: the static OFL font files do not all carry the smcp feature
#let sc(body) = text(size: 0.82em, tracking: 0.06em, upper(body))

#set document(title: book-title, author: book-author)
#set text(font: ${bodyFont}, size: ${size}pt, lang: ${str((book.language || "en").slice(0, 2))}, hyphenate: true, number-type: "old-style")
#set par(justify: true, leading: ${leading(lh)}, spacing: ${theme.indent ? leading(lh) : "0.9em"}, first-line-indent: ${theme.indent ? "1.4em" : "0em"})
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
  numbering: "i",
  header: context {
    let cur = page-state()
    if cur.kind != "text" or cur.value.section == "front" or not cur.value.at("head", default: true) { return }
    let p = here().page()${runningHead}
  },
  footer: context {
    let cur = page-state()
    if cur.kind == "blank" or cur.value == none or not cur.value.numbers { return }
    align(center, text(size: 0.85em, counter(page).display()))
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
      theme.labelStyle === "large"
        ? `if label != "" { text(font: head-font, size: ${(3 * scale).toFixed(2)}em * s, weight: ${theme.headingWeight}, fill: label-fill, label); v(0.3em) }`
        : theme.labelStyle === "upper"
          ? `if label != "" { text(font: head-font, size: 0.8em, tracking: 0.16em, upper(label)); v(0.7em * s) }`
          : `if label != "" { text(font: head-font, size: 1.05em, tracking: 0.08em, sc(label)); v(0.7em * s) }`
    }
    text(font: head-font, size: ${(theme.headingSize * scale).toFixed(1)}pt * s, weight: ${theme.headingWeight}, style: ${theme.headingItalic ? '"italic"' : '"normal"'}, title)
    if subtitle != "" { v(0.5em * s); text(size: 1.1em, style: "italic", subtitle) }
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
  v(${(g.trim.height * 0.07).toFixed(2)}in * s)
}
`;
}

const LEAD_IN_KINDS = new Set(["chapter", "introduction", "foreword", "preface", "conclusion", "afterword"]);

function elementTypst(input: ExportInput, e: BookElement, format: BookFormat, theme: InteriorTheme, imagePath: TypstOptions["imagePath"]): string {
  const { book } = input;
  const o = e.options;
  const numbers = (e.section !== "front" || e.inToc) && !o.hidePageNumber;
  const meta = `#metadata((section: ${str(e.section)}, title: ${str(e.title)}, numbers: ${numbers}, head: ${!o.hideHeader})) <jp-start>`;
  const imgPath = e.image && imagePath ? imagePath(e.image) : null;
  const heading = `#heading(level: 1, outlined: ${e.inToc}, bookmarked: true)[#${str(tocText(e))}]`;
  const content = (lead = false) => docToTypst(e.chapter.content, { leadIn: lead, imagePath, outlineSubheads: format.tocSubheads && e.inToc && e.kind.id !== "part" });
  switch (e.kind.id) {
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
      return `${meta}
${heading}
${opening}
${content(theme.leadIn && format.dropCaps && LEAD_IN_KINDS.has(e.kind.id))}`;
    }
  }
}

/** Whole-book Typst source. */
export function buildTypst(input: ExportInput, opts: TypstOptions): string {
  const binding = opts.binding ?? "paperback";
  const base = bookFormat(input.book);
  const format = { ...base, ...printEdition(base, binding) };
  const theme = getTheme(format.theme);
  const elements = orderedElements(input.chapters, theme).filter((e) => format.printToc || e.kind.id !== "contents");
  const parts: string[] = [preamble(input, format, theme, opts.pageCount, binding)];
  let bodyStarted = false;
  elements.forEach((e, i) => {
    const out: string[] = [];
    if (i > 0) {
      const right = format.chaptersOnRight && e.kind.id !== "copyright";
      out.push(right ? `#pagebreak(to: "odd")` : "#pagebreak()");
    }
    if (!bodyStarted && e.section !== "front") {
      bodyStarted = true;
      out.push(`#set page(numbering: "1")\n#counter(page).update(1)`);
    }
    // each element sets its own paragraph rules inside a scope
    out.push(`#[\n${elementTypst(input, e, format, theme, opts.imagePath)}\n#metadata((end: true)) <jp-end>\n]`);
    parts.push(out.join("\n"));
  });
  return parts.join("\n\n") + "\n";
}
