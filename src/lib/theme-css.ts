import type { InteriorTheme } from "./themes";

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
  add("p", theme.indent ? "margin: 0; text-indent: 1.5em; text-align: justify; hyphens: auto;" : "margin: 0 0 0.8em; text-indent: 0; text-align: left;");
  add("p.first, h2 + p, h3 + p, h4 + p, .scene-break + p, hr + p, blockquote + p, .callout + p, figure + p, ul + p, ol + p", "text-indent: 0;");
  add("p.blank", "text-indent: 0;");
  add(
    ".chapter-head",
    `text-align: ${theme.headingAlign}; margin: 3em 0 2.5em; font-family: ${theme.headingCss};`,
  );
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
  add(".chapter-subtitle", "display: block; font-style: italic; font-size: 1.1em; margin-top: 0.6em; font-weight: 400;");
  add("h2", `font-family: ${theme.headingCss}; font-size: 1.3em; line-height: 1.25; margin: 1.8em 0 0.6em; font-weight: 700; hyphens: none;`);
  add("h3", `font-family: ${theme.headingCss}; font-size: 1.12em; line-height: 1.3; margin: 1.5em 0 0.5em; font-weight: 700;`);
  add("h4", `font-family: ${theme.headingCss}; font-size: 1em; margin: 1.3em 0 0.4em; font-weight: 700; font-style: italic;`);
  add("blockquote", "margin: 1.2em 2em; font-style: italic;");
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
  add(".part-page", "text-align: center; margin-top: 30%;");
  if (o.dropCaps) {
    add(
      "p.first::first-letter",
      `float: left; font-family: ${theme.headingCss}; font-size: 3.4em; line-height: 0.85; padding: 0.06em 0.08em 0 0; color: ${theme.accent};`,
    );
  }
  return rules.join("\n");
}
