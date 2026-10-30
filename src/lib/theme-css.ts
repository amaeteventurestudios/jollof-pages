import { textStyle, type InteriorTheme } from "./themes";
import { BOXES, boxFill, boxLabelColor, boxStyle, cleanPresets, isDark, paleTint, type BookBoxStyles, type BoxFont, type BoxStyle } from "./blocks";
import { fontCss, HAND_FONT, TYPEWRITER_FONT } from "./fonts";

export interface ThemeCssOptions {
  /** CSS selector the rules are scoped under (preview); empty for the EPUB stylesheet */
  scope?: string;
  dropCaps: boolean;
  fontSize?: number; // pt-equivalent for preview scaling; EPUB uses relative sizes
  lineHeight?: number;
  /** EPUB readers pick their own font size, so keep sizes relative */
  epub?: boolean;
}

/** One stylesheet for the EPUB, the studio preview and the public sample reader. */
export function themeCss(theme: InteriorTheme, o: ThemeCssOptions): string {
  const s = (sel: string) =>
    sel
      .split(",")
      .map((p) => (o.scope ? `${o.scope} ${p.trim()}` : p.trim()))
      .join(", ");
  const lh = o.lineHeight ?? 1.45;
  const rules: string[] = [];
  const add = (sel: string, body: string) => rules.push(`${s(sel)} { ${body} }`);

  if (o.scope) rules.push(`${o.scope} { font-family: ${theme.bodyCss}; line-height: ${lh}; }`);
  else rules.push(`body { font-family: ${theme.bodyCss}; line-height: ${lh}; margin: 0 5%; }`);
  const ts = textStyle(theme);
  const justify = ts.justify ?? theme.indent;
  const hy = ts.hyphenate ? "auto" : "manual";
  add(
    "p",
    theme.indent
      ? `margin: 0 0 ${ts.paraSpacing ?? 0}em; text-indent: ${ts.indentSize ?? 1.5}em; text-align: ${justify ? "justify" : "left"}; hyphens: ${hy};`
      : `margin: 0 0 ${ts.paraSpacing ?? 0.8}em; text-indent: 0; text-align: ${justify ? "justify" : "left"}; hyphens: ${hy};`,
  );
  add("p.first, h2 + p, h3 + p, h4 + p, .scene-break + p, hr + p, blockquote + p, .callout + p, figure + p, ul + p, ol + p", "text-indent: 0;");
  add("p.blank", "text-indent: 0;");
  add(".chapter-head", `text-align: ${theme.headingAlign}; margin: ${3 * ts.headingSpace}em 0 ${2.5 * ts.headingSpace}em; font-family: ${theme.headingCss};`);
  add(
    ".chapter-label",
    theme.labelStyle === "large"
      ? `display: block; font-size: 3em; line-height: 1; font-weight: ${theme.headingWeight}; margin-bottom: 0.3em; color: ${theme.accent};`
      : theme.labelStyle === "upper"
        ? "display: block; font-size: 0.8em; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 0.8em;"
        : "display: block; font-variant: small-caps; letter-spacing: 0.08em; font-size: 1.05em; margin-bottom: 0.8em;",
  );
  add(
    "h1",
    `font-family: ${theme.headingCss}; font-weight: ${theme.headingWeight}; font-style: ${theme.headingItalic ? "italic" : "normal"}; font-size: 1.9em; line-height: 1.15; margin: 0; text-align: ${theme.headingAlign}; hyphens: none;`,
  );
  add(".chapter-image", "margin: 0 0 1.6em; text-align: center;");
  add(".chapter-image img", "width: 100%; max-height: 40vh; object-fit: cover; display: block;");
  add(".chapter-image + .chapter-head", "margin-top: 0;");
  add(".chapter-head.small", "margin: 1.6em 0 1.4em;");
  add(".chapter-head.small h1", "font-size: 1.35em;");
  add(".chapter-head.small .chapter-label", theme.labelStyle === "large" ? "font-size: 1.8em;" : "font-size: 0.85em;");
  add(".chapter-head.inverted", "position: relative; margin-top: 0; color: #fff;");
  add(".chapter-head.inverted img", "width: 100%; height: 16em; object-fit: cover; display: block;");
  add(".chapter-head-text", "position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; padding: 1em 1.4em; background: rgba(0,0,0,0.38);");
  add(".chapter-head.inverted h1, .chapter-head.inverted .chapter-label", "color: #fff;");
  add(
    ".chapter-subtitle",
    `display: block; font-size: 1.1em; margin-top: 0.6em; font-weight: 400; ${ts.subtitleStyle === "italic" ? "font-style: italic;" : ts.subtitleStyle === "smallcaps" ? "font-style: normal; font-variant: small-caps; letter-spacing: 0.06em;" : "font-style: normal;"}`,
  );
  add("h2", `font-family: ${theme.headingCss}; font-size: 1.3em; line-height: 1.25; margin: 1.8em 0 0.6em; font-weight: 700; hyphens: none;`);
  add("h3", `font-family: ${theme.headingCss}; font-size: 1.12em; line-height: 1.3; margin: 1.5em 0 0.5em; font-weight: 700;`);
  add("h4", `font-family: ${theme.headingCss}; font-size: 1em; margin: 1.3em 0 0.4em; font-weight: 700; font-style: italic;`);
  add("blockquote", "margin: 1.2em 2em; font-style: italic;");
  add(".book-index ul.index", "list-style: none; padding: 0; margin: 0 0 1em; columns: 2; column-gap: 1.5em;");
  add(".book-index ul.index li", "margin: 0 0 0.2em; padding-left: 1em; text-indent: -1em; break-inside: avoid;");
  add(".book-index .index-letter", "font-size: 1.05em; margin: 1.2em 0 0.4em;");
  add("blockquote p", "text-indent: 0;");
  add(".callout", `margin: 1.4em 0; padding: 0.9em 1.1em; background: #f2efe8; border-left: 4px solid ${theme.accent};`);
  add(".callout p", "text-indent: 0; margin: 0 0 0.5em;");
  add("ul, ol", "margin: 0.8em 0 0.8em 1.6em; padding: 0;");
  add("li p", "text-indent: 0; margin: 0 0 0.3em;");
  add(".scene-break", "text-align: center; text-indent: 0; margin: 1.2em 0; letter-spacing: 0.2em;");
  add("hr.scene-break", "border: 0; height: 1px; width: 20%; margin: 1.6em auto; background: currentColor; opacity: 0.4;");
  add("figure", "margin: 1.4em 0; text-align: center;");
  add("figure img", "max-width: 100%; height: auto;");
  add("figcaption", "font-size: 0.85em; font-style: italic; margin-top: 0.4em;");
  add(".u", "text-decoration: underline;");
  add("a.noteref", "font-size: 0.75em; vertical-align: super; line-height: 0; text-decoration: none;");
  add(".footnotes", "margin-top: 2.5em; font-size: 0.85em;");
  add(".footnotes p, .footnotes li", "text-indent: 0; margin: 0 0 0.4em;");
  add(".centered p, .centered", "text-align: center; text-indent: 0;");
  add(".dedication", "margin-top: 30%; font-style: italic;");
  add(".title-page", "text-align: center; margin-top: 20%;");
  add(".title-page .tp-title", `font-family: ${theme.headingCss}; font-size: 2.2em; line-height: 1.1; font-weight: ${theme.headingWeight}; margin: 0 0 0.4em; text-indent: 0; text-align: center;`);
  add(".title-page .tp-subtitle", "font-size: 1.15em; font-style: italic; margin: 0 0 3em; text-indent: 0; text-align: center;");
  add(".title-page .tp-author", "font-size: 1.2em; letter-spacing: 0.06em; text-indent: 0; text-align: center;");
  add(".title-page .tp-imprint", "margin-top: 6em; font-size: 0.85em; text-indent: 0; text-align: center;");
  add(".copyright p", "text-indent: 0; font-size: 0.8em; margin-bottom: 0.8em; text-align: left;");
  add(".toc ol", "list-style: none; margin: 0; padding: 0;");
  add(".toc li", "margin: 0 0 0.5em;");
  add(".toc a", "text-decoration: none; color: inherit;");
  add(".toc ol ol", "margin: 0.35em 0 0 1.2em; font-size: 0.92em;");
  add(".toc ol ol li", "margin: 0 0 0.3em;");
  add(".part-page", "text-align: center; margin-top: 30%;");
  if (o.dropCaps && theme.dropCap !== "none") add("p.first::first-letter", dropCapCss(theme));
  add("p.lead-in::first-line", "font-variant: small-caps; letter-spacing: 0.04em;");
  if (theme.headingCase === "upper") add("h1", "text-transform: uppercase; letter-spacing: 0.06em;");
  if (theme.headingRule === "above" || theme.headingRule === "both") add(".chapter-head", `border-top: 1px solid ${theme.accent}; padding-top: 1.2em;`);
  if (theme.headingRule === "below" || theme.headingRule === "both") add(".chapter-head h1", `border-bottom: 1px solid ${theme.accent}; padding-bottom: 0.4em;`);
  if (theme.headingRule === "short") add(".chapter-head h1::after", `content: ""; display: block; width: 3em; height: 1px; background: ${theme.accent}; margin: 0.6em ${theme.headingAlign === "center" ? "auto" : "0"} 0;`);
  if (theme.labelFont) add(".chapter-label", `font-family: ${fontCss(theme.labelFont)}; font-variant: normal; text-transform: none; letter-spacing: 0; font-size: 1.9em; font-weight: 400; color: ${theme.accent};`);

  // ornaments, pages and layout blocks
  add("img.ornament", "height: 1.1em; width: auto; display: inline-block; vertical-align: middle;");
  add("hr.scene-break.double", "height: 4px; border-top: 1px solid currentColor; border-bottom: 1px solid currentColor; background: none;");
  add(".scene-break.space", "margin: 0.6em 0;");
  add(".page-break", "page-break-after: always; break-after: page; height: 0;");
  add(".spacer", "display: block;");
  add("figure.fig-left", "float: left; width: 42%; margin: 0.3em 1.2em 0.8em 0;");
  add("figure.fig-right", "float: right; width: 42%; margin: 0.3em 0 0.8em 1.2em;");
  add("figure.fig-small", "width: 50%; margin-left: auto; margin-right: auto;");
  add("figure.fig-full img", "width: 100%;");
  add(".cols", "display: flex; gap: 1.4em; margin: 1.2em 0;");
  add(".cols > .col", "flex: 1 1 0; min-width: 0;");
  add(".cols p", "text-indent: 0;");
  add("table.book-table", "width: 100%; border-collapse: collapse; margin: 1.3em 0; font-size: 0.92em;");
  add("table.book-table th, table.book-table td", "border: 1px solid #cfc8bb; padding: 0.35em 0.55em; text-align: left; vertical-align: top;");
  add("table.book-table th", `background: ${paleTint(theme.accent, 0.88)}; font-family: ${theme.headingCss};`);
  add("table.book-table p", "text-indent: 0; margin: 0;");
  add(".chat", "margin: 1.4em 0; display: flex; flex-direction: column; gap: 0.45em;");
  add(".msg", "max-width: 75%; text-indent: 0;");
  add(".msg p", "margin: 0; padding: 0.5em 0.85em; border-radius: 1.1em; text-indent: 0; text-align: left; line-height: 1.35; font-family: Inter, 'Helvetica Neue', Arial, sans-serif; font-size: 0.9em;");
  add(".msg-them", "align-self: flex-start;");
  add(".msg-them p", "background: #e9e9eb; color: #1c1c1e; border-bottom-left-radius: 0.3em;");
  add(".msg-me", "align-self: flex-end; margin-left: auto;");
  add(".msg-me p", `background: ${theme.accent}; color: #fff; border-bottom-right-radius: 0.3em;`);
  add(".msg-name", "display: block; font-family: Inter, 'Helvetica Neue', Arial, sans-serif; font-size: 0.7em; color: #6b6b70; margin: 0 0 0.15em 0.9em;");
  add(".msg-me .msg-name", "text-align: right; margin: 0 0.9em 0.15em 0;");
  add(".endnotes", "margin-top: 2.5em; font-size: 0.85em;");
  add(".endnotes h2", "font-size: 1.1em;");
  add(".endnotes p", "text-indent: 0;");
  for (const b of BOXES) {
    const st = boxStyle(b.id, theme);
    add(`.blk-${b.id}`, boxCss(st, paletteOf(theme)));
    if (st.align) add(`.blk-${b.id} p`, `text-align: ${st.align};`);
    if (st.labelColor) add(`.blk-${b.id} .blk-label`, `color: ${boxLabelColor(st, theme.accent)};`);
  }
  // named presets: a class per preset, so changing one restyles every block that uses it
  for (const p of cleanPresets(theme.boxPresets)) {
    const st = boxStyle(p.variant, theme, null, p.id);
    add(`.blk.blk-p-${p.id}`, boxCss(st, paletteOf(theme), true));
    add(`.blk.blk-p-${p.id} p`, "text-align: inherit;");
    add(`.blk.blk-p-${p.id} .blk-label`, `color: ${boxLabelColor(st, theme.accent)};`);
  }
  add(".blk", "margin: 1.4em 0; text-indent: 0;");
  // a restyled block sets its alignment on itself; its paragraphs follow it
  add(".blk.blk-own p", "text-align: inherit;");
  add(".blk p", "text-indent: 0;");
  add(".blk > p + p", "margin-top: 0.45em;");
  add(".blk-label", `font-family: ${theme.headingCss}; font-size: 0.72em; letter-spacing: 0.12em; text-transform: uppercase; font-style: normal; color: ${theme.accent}; margin: 0 0 0.5em;`);
  add(".blk-letter .blk-label, .blk-epigraph_quote .blk-label, .blk-scripture .blk-label", "text-transform: none; letter-spacing: 0; font-size: 0.9em; margin: 0.8em 0 0;");
  add(".blk-lines", "background-image: repeating-linear-gradient(transparent, transparent calc(1.9em - 1px), #b9b3a7 calc(1.9em - 1px), #b9b3a7 1.9em); margin-top: 0.6em;");
  add(".blk-checklist ul", "list-style: none; margin-left: 0.2em;");
  add(".blk-checklist li", "padding-left: 1.6em; position: relative;");
  add(".blk-checklist li::before", `content: ""; position: absolute; left: 0; top: 0.25em; width: 0.85em; height: 0.85em; border: 1.5px solid ${theme.accent}; border-radius: 0.15em;`);
  add(".blk-overlay", "background-size: cover; background-position: center; color: #fff; padding: 3em 1.4em; min-height: 8em; text-shadow: 0 1px 6px rgba(0,0,0,0.5);");
  add(".blk-overlay .blk-label, .blk-overlay p", "color: #fff;");
  add(".blk-stat > p:first-child, .blk-newspaper > p:nth-child(2), .blk-glossary_term > p:first-child", `font-family: ${theme.headingCss}; font-weight: 700;`);
  add(".blk-stat > p:first-child", `font-size: 3em; line-height: 1; color: ${theme.accent};`);
  add(".blk-newspaper > p:nth-child(2)", "font-size: 1.35em; line-height: 1.15;");
  add(".blk-newspaper > .blk-label", "text-align: center; border-bottom: 1px solid currentColor; padding-bottom: 0.3em; letter-spacing: 0.2em;");
  add(".blk-interview_qa strong", `color: ${theme.accent};`);

  // special pages
  add(".half-title", "text-align: center; margin-top: 35%;");
  add(".half-title .tp-title", `font-family: ${theme.headingCss}; font-size: 1.6em; text-indent: 0; text-align: center;`);
  add(".full-image", "margin: 0; padding: 0; text-align: center;");
  add(".full-image > img", "width: 100%; height: auto; display: block;");
  add(".centered-verse p", "text-align: center; text-indent: 0;");
  add(".has-bg:not(.bg-opener)", "padding: 1.6em 1.4em; border-radius: 0.2em;");
  add(".bg-opener", "position: relative; z-index: 0;");
  add(".bg-dark", "color: #f3ede2;");
  add(".bg-dark h1, .bg-dark h2, .bg-dark h3, .bg-dark .chapter-label", "color: #f3ede2;");
  add(".opener-bg", "position: absolute; left: 0; right: 0; top: 0; height: 18em; z-index: -1;");
  return rules.join("\n");
}

function dropCapCss(t: InteriorTheme): string {
  const base = `float: left; font-family: ${t.headingCss}; line-height: 0.85; padding: 0.06em 0.08em 0 0;`;
  switch (t.dropCap) {
    case "classic":
      return `${base} font-size: 3.4em;`;
    case "tall":
      return `${base} font-size: 4.6em; line-height: 0.8; color: ${t.accent};`;
    case "boxed":
      return `float: left; font-family: ${t.headingCss}; font-size: 2.7em; line-height: 1; background: ${t.accent}; color: #fff; padding: 0.08em 0.18em; margin: 0.08em 0.14em 0 0;`;
    case "outline":
      return `float: left; font-family: ${t.headingCss}; font-size: 2.7em; line-height: 1; color: ${t.accent}; border: 2px solid ${t.accent}; padding: 0.04em 0.16em; margin: 0.08em 0.14em 0 0;`;
    case "circle":
      return `float: left; font-family: ${t.headingCss}; font-size: 2.4em; line-height: 1.25; width: 1.25em; text-align: center; border-radius: 50%; background: ${t.accent}; color: #fff; margin: 0.06em 0.16em 0 0;`;
    case "script":
      return `float: left; font-family: ${t.labelFont ? `'${t.labelFont}', cursive` : t.headingCss}; font-size: 4.2em; line-height: 0.85; color: ${t.accent}; padding: 0 0.08em 0 0;`;
    default:
      return `${base} font-size: 3.4em; color: ${t.accent};`;
  }
}

/** The theme values a box needs; the editor passes CSS variables so one node style fits every theme. */
export interface BoxPalette {
  accent: string;
  tint: string;
  headingCss: string;
  bodyCss: string;
  /** the book's styles for each kind of block and its named presets */
  book?: BookBoxStyles;
}

export function paletteOf(t: InteriorTheme): BoxPalette {
  return { accent: t.accent, tint: paleTint(t.accent), headingCss: t.headingCss, bodyCss: t.bodyCss, book: { boxes: t.boxes, boxPresets: t.boxPresets } };
}

/** For styles written into the editor's HTML: editorBlockCss sets these variables from the theme. */
export const EDITOR_PALETTE: BoxPalette = { accent: "var(--jp-accent)", tint: "var(--jp-tint)", headingCss: "var(--jp-head)", bodyCss: "var(--jp-body)" };

const BOX_FONT: Record<BoxFont, (t: BoxPalette) => string> = {
  body: (t) => t.bodyCss,
  heading: (t) => t.headingCss,
  hand: () => fontCss(HAND_FONT),
  mono: () => fontCss(TYPEWRITER_FONT),
  sans: () => "Inter, 'Helvetica Neue', Arial, sans-serif",
};

/**
 * CSS for a box. With `full`, every property is set (padding, border, font, colour…), so the
 * result can sit in a block's own style attribute and override its kind's rules completely.
 */
export function boxCss(st: BoxStyle, t: BoxPalette, full = false): string {
  const out: string[] = [];
  const fill = !st.fill || st.fill === "none" ? null : st.fill === "accent" ? t.tint : st.fill;
  const line = st.line ? (st.line === "accent" ? t.accent : st.line) : st.accent ? t.accent : "#cfc8bb";
  const w = st.weight ?? 1;
  const radius = st.corners === 2 ? "0.9em" : st.corners === 0 ? "0" : "0.3em";
  if (fill) out.push(`background-color: ${fill};`);
  else if (full) out.push("background-color: transparent;");
  const framed = fill || (st.border && st.border !== "none" && st.border !== "rules");
  if (framed) out.push("padding: 0.9em 1.1em;");
  else if (full) out.push("padding: 0;");
  if (full) out.push("border: 0;");
  switch (st.border) {
    case "left":
      out.push(`border-left: ${4 * w}px solid ${line};`);
      break;
    case "box":
      out.push(`border: ${w}px solid ${line};`);
      break;
    case "rules":
      out.push(`border-top: ${w}px solid ${line}; border-bottom: ${w}px solid ${line}; padding: 0.8em ${fill ? "1.1em" : "0"};`);
      break;
    case "dashed":
      out.push(`border: ${1.5 * w}px dashed ${line};`);
      break;
    case "double":
      out.push(`border: ${3 * w}px double ${line};`);
      break;
    case "top":
      out.push(`border-top: ${3 * w}px solid ${line};`);
      break;
  }
  // the catalog rounds framed boxes slightly; an author's choice of corners applies to any box
  if (st.corners !== undefined) out.push(`border-radius: ${radius};`);
  else if (st.border === "box" || st.border === "dashed") out.push("border-radius: 0.3em;");
  else if (full) out.push("border-radius: 0;");
  if (st.fontFamily) out.push(`font-family: ${fontCss(st.fontFamily)};`);
  else if (st.font && st.font !== "body") out.push(`font-family: ${BOX_FONT[st.font](t)};`);
  else if (full) out.push(`font-family: ${t.bodyCss};`);
  if (st.bold) out.push("font-weight: 700;");
  if (st.leading) out.push(`line-height: ${st.leading};`);
  if (st.italic) out.push("font-style: italic;");
  else if (full) out.push("font-style: normal;");
  if (st.align) out.push(`text-align: ${st.align}; hyphens: none;`);
  else if (full) out.push("text-align: left;");
  if (st.size && st.size !== 1) out.push(`font-size: ${st.size}em;`);
  else if (full) out.push("font-size: 1em;");
  if (st.text) out.push(`color: ${st.text};`);
  else if (fill && !fill.startsWith("var(") && isDark(fill)) out.push("color: #f6f2ea;");
  if (full) out.push(`--blk-label: ${st.labelColor ? (st.labelColor === "accent" ? t.accent : st.labelColor) : t.accent};`);
  return out.join(" ");
}

/**
 * Styles for special blocks inside the editor, so a chapter looks close to its printed page while
 * you write. Filled boxes keep dark text on their pale paper colour, also in dark mode.
 */
export function editorBlockCss(theme: InteriorTheme, scope = ".manuscript .ProseMirror"): string {
  const r: string[] = [];
  const add = (sel: string, body: string) => r.push(`${sel.split(",").map((p) => `${scope} ${p.trim()}`).join(", ")} { ${body} }`);
  r.push(`${scope} { --jp-accent: ${theme.accent}; --jp-tint: ${paleTint(theme.accent)}; --jp-head: ${theme.headingCss}; --jp-body: ${theme.bodyCss}; }`);
  for (const b of BOXES) {
    const st = boxStyle(b.id, theme);
    let css = boxCss(st, paletteOf(theme));
    if (st.only) css = "border: 1.5px dashed var(--paper-3); border-radius: 6px; padding: 0.9em 1.1em;";
    const fill = boxFill(st, theme.accent);
    if (fill && !st.text && !isDark(fill)) css += " color: #1c1a17;";
    css += ` --blk-label: ${boxLabelColor(st, theme.accent)};`;
    add(`.blk-${b.id}`, css);
  }
  for (const p of cleanPresets(theme.boxPresets)) {
    const st = boxStyle(p.variant, theme, null, p.id);
    const fill = boxFill(st, theme.accent);
    add(`.blk.blk-p-${p.id}`, boxCss(st, paletteOf(theme), true) + (fill && !st.text && !isDark(fill) ? " color: #1c1a17;" : ""));
    add(`.blk.blk-p-${p.id} p`, "text-align: inherit;");
  }
  add(".blk", "position: relative; margin: 1.4em 0;");
  add(".blk.blk-own p", "text-align: inherit;");
  add("p[data-lead-in]::first-line", "font-variant: small-caps; letter-spacing: 0.04em;");
  add("p[data-first]::first-letter, p[data-drop-cap]::first-letter", `float: left; font-family: ${theme.headingCss}; font-size: 3.1em; line-height: 0.85; padding: 0.06em 0.08em 0 0; color: ${theme.accent};`);
  add("p[data-first], p[data-drop-cap]", "text-indent: 0;");
  add(".blk > * + *", "margin-top: 0.5em;");
  add(".blk::before", `content: attr(data-shown-label); display: block; font-family: ${theme.headingCss}; font-size: 0.7em; letter-spacing: 0.12em; text-transform: uppercase; font-style: normal; color: var(--blk-label, ${theme.accent}); margin-bottom: 0.4em;`);
  add(".blk[data-shown-label='']::before", "display: none;");
  add(".blk-label-end::before", "display: none;");
  add(".blk-label-end::after", "content: attr(data-shown-label); display: block; font-style: italic; margin-top: 0.6em; font-size: 0.95em;");
  add(".blk-overlay", "background-size: cover; background-position: center; background-color: #3b3b3b; color: #fff; padding: 2.4em 1.2em; border-radius: 6px; text-align: center;");
  add(".blk-writing_lines, .blk-journal_prompt", "padding-bottom: 7em; background-image: repeating-linear-gradient(transparent, transparent calc(1.9em - 1px), #b9b3a7 calc(1.9em - 1px), #b9b3a7 1.9em); background-position: 0 bottom; background-size: 100% 6.5em; background-repeat: no-repeat;");
  add(".blk-checklist ul", "list-style: '☐  ';");
  add(".blk-stat > p:first-child", `font-family: ${theme.headingCss}; font-size: 2.6em; font-weight: 700; line-height: 1; color: ${theme.accent};`);
  add(".chat", "display: flex; flex-direction: column; gap: 0.4em; margin: 1.4em 0;");
  add(".chat > .msg", "max-width: 75%; margin: 0; padding: 0.5em 0.85em; border-radius: 1.1em; font-family: Inter, 'Helvetica Neue', Arial, sans-serif; font-size: 0.88em; line-height: 1.35; text-indent: 0;");
  add(".chat > .msg-them", "align-self: flex-start; background: #e9e9eb; color: #1c1c1e; border-bottom-left-radius: 0.3em;");
  add(".chat > .msg-me", `align-self: flex-end; background: ${theme.accent}; color: #fff; border-bottom-right-radius: 0.3em;`);
  add(".chat[data-group] > .msg[data-name]:not([data-name=''])::before", "content: attr(data-name); display: block; font-size: 0.75em; opacity: 0.7;");
  add(".cols", "display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 1.2em; margin: 1.2em 0;");
  add(".col", "border: 1px dashed var(--paper-3); border-radius: 4px; padding: 0.5em 0.7em; min-width: 0;");
  add(".col > * + *", "margin-top: 0.6em;");
  add("table", "width: 100%; border-collapse: collapse; margin: 1.2em 0; table-layout: fixed;");
  add("th, td", "border: 1px solid var(--paper-3); padding: 0.35em 0.55em; vertical-align: top; text-align: left;");
  add("th", `background: color-mix(in srgb, ${theme.accent} 12%, transparent); font-weight: 600;`);
  add("td p, th p", "margin: 0;");
  add(".selectedCell", "background: color-mix(in srgb, var(--primary) 15%, transparent);");
  add(".page-break", "border-top: 1.5px dashed var(--paper-3); height: 1.4em; margin: 1.6em 0; position: relative;");
  add(".page-break::after", "content: 'Page break'; position: absolute; top: -0.75em; left: 50%; transform: translateX(-50%); background: var(--background); padding: 0 0.6em; font-size: 0.75em; color: var(--soft); font-family: ui-sans-serif, sans-serif;");
  add(".spacer", "border: 1px dotted var(--paper-3); border-radius: 4px;");
  add(".ProseMirror-selectednode.page-break, .ProseMirror-selectednode.spacer", "outline: 2px solid var(--primary);");
  add("img[data-layout='left']", "float: left; width: 42%; margin: 0.3em 1.2em 0.8em 0;");
  add("img[data-layout='right']", "float: right; width: 42%; margin: 0.3em 0 0.8em 1.2em;");
  add("img[data-layout='small']", "width: 50%;");
  add("img[data-layout='full']", "width: 100%;");
  add(".endnote-ref::before", "content: '[endnote]';");
  add("hr[data-ornament]::after", "content: '✦ ' attr(data-ornament);");
  return r.join("\n");
}
