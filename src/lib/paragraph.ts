/**
 * Settings an author can give one paragraph from its handle: where the drop cap goes, indents,
 * letter spacing and the first-line style. The editor stores them as paragraph attributes; the
 * EPUB, website and print PDF all read them through this module.
 */

export interface ParaFormat {
  /** this paragraph opens the chapter: drop cap, lead-in and no indent move here from the first */
  first?: boolean;
  /** a drop cap on this paragraph as well, wherever it is */
  dropCap?: boolean;
  /** no first-line indent */
  noIndent?: boolean;
  /** the first line in small capitals */
  leadIn?: boolean;
  /** letter spacing in em, -0.05 to 0.3 */
  tracking?: number;
  /** first-line indent in em (overrides the theme's) */
  indent?: number;
  /** left indent of the whole paragraph in em */
  left?: number;
}

export const PARA_KEYS = ["first", "dropCap", "noIndent", "leadIn", "tracking", "indent", "left"] as const;

const num = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.round(Math.min(max, Math.max(min, v)) * 1000) / 1000 : undefined);

/** Only valid values, so stored JSON can never inject CSS or Typst. */
export function paraFormat(attrs: Record<string, unknown> | null | undefined): ParaFormat {
  if (!attrs) return {};
  const out: ParaFormat = {};
  for (const k of ["first", "dropCap", "noIndent", "leadIn"] as const) if (attrs[k] === true) out[k] = true;
  const t = num(attrs.tracking, -0.05, 0.3);
  if (t) out.tracking = t;
  const i = num(attrs.indent, 0, 6);
  if (i !== undefined && attrs.indent !== null) out.indent = i;
  const l = num(attrs.left, 0, 10);
  if (l) out.left = l;
  return out;
}

/** Inline CSS for a paragraph's own spacing and indents. */
export function paraCss(p: ParaFormat): string {
  const out: string[] = [];
  if (p.tracking) out.push(`letter-spacing: ${p.tracking}em`);
  if (p.noIndent) out.push("text-indent: 0");
  else if (p.indent !== undefined) out.push(`text-indent: ${p.indent}em`);
  if (p.left) out.push(`margin-left: ${p.left}em`);
  return out.join("; ");
}

/** Which top-level paragraph the author marked as the opener, or -1 when none is (the first one then opens as usual). */
export function openingParagraph(content: { type: string; attrs?: Record<string, unknown> | null }[] | undefined): number {
  const list = content ?? [];
  const marked = list.findIndex((n) => n.type === "paragraph" && n.attrs?.first === true);
  return marked;
}

/** Plain-English help for each setting, shown beside it in the handle menu. */
export const PARA_HELP: Record<"first" | "dropCap" | "noIndent" | "leadIn" | "tracking" | "indent" | "left", { title: string; text: string }> = {
  first: {
    title: "Set as first paragraph",
    text: "A chapter's drop cap and first-line style go on its very first paragraph. Turn this on to give them to this paragraph instead, for example after an epigraph or a short note. If several paragraphs have it, the first one wins.",
  },
  dropCap: { title: "Force drop cap", text: "Adds a drop cap to this paragraph even if it is not the first, for example to open a new part of a chapter." },
  noIndent: { title: "No indent", text: "Starts this paragraph flush left, without the first-line indent, like the paragraph after a heading." },
  leadIn: { title: "First line style", text: "Sets the opening words in small capitals, the way books often begin a chapter or a new section." },
  tracking: { title: "Letter spacing", text: "Opens up or tightens the space between letters in this paragraph. Small changes are best; 0 is normal." },
  indent: { title: "First-line indent", text: "How far the first line of this paragraph is pushed in, in ems (the width of the letter M at this size)." },
  left: { title: "Left indent", text: "Moves the whole paragraph in from the left, for a set-off passage. Measured in ems." },
};
