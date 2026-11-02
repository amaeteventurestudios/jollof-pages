import {
  AlignmentType,
  Document,
  ExternalHyperlink,
  FootnoteReferenceRun,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  PageBreak,
  PageNumber,
  BorderStyle,
  SimpleField,
  Tab,
  TabStopType,
  Paragraph,
  TableOfContents,
  TextRun,
  type IRunOptions,
  type ParagraphChild,
} from "docx";
import { authorName, orderedElements, type ExportInput } from "../book-model";
import type { DocMark, DocNode } from "../doc/types";
import { pageGeometry } from "../kdp";
import { themeFor, sceneBreakGlyph } from "../themes";
import { boxDef } from "../blocks";
import { bookFormat } from "../types";
import { pictureAlign, pictureWidth } from "../picture";
import { runningHeads, type HeadContent, type RunningHeads } from "../running-heads";

export interface DocxImage {
  bytes: Uint8Array;
  mediaType: string;
  width?: number;
  height?: number;
}

const TWIP = 1440;

function runOptions(marks: DocMark[] | undefined): Partial<IRunOptions> {
  const o: { bold?: boolean; italics?: boolean; underline?: object; strike?: boolean } = {};
  for (const m of marks ?? []) {
    if (m.type === "bold") o.bold = true;
    if (m.type === "italic") o.italics = true;
    if (m.type === "underline") o.underline = {};
    if (m.type === "strike") o.strike = true;
  }
  return o as Partial<IRunOptions>;
}

/** Word manuscript: the trim size, one section per element, real footnotes and a contents field. */
export async function buildDocx(input: ExportInput, images: Map<string, DocxImage> = new Map()): Promise<Blob> {
  const { book } = input;
  const format = bookFormat(input.book);
  const theme = themeFor(format);
  const g = pageGeometry(format.trim, input.book.page_count || 200, false, "paperback", format.margins);
  const elements = orderedElements(input.chapters, theme);
  const footnotes: Record<number, { children: Paragraph[] }> = {};
  let noteNo = 0;
  const maxImgWidth = (g.pageWidth - g.margins.inside - g.margins.outside) * 96;

  function inline(nodes: DocNode[] | undefined, extra: Partial<IRunOptions> = {}): ParagraphChild[] {
    const out: ParagraphChild[] = [];
    for (const n of nodes ?? []) {
      if (n.type === "text") {
        const link = n.marks?.find((m) => m.type === "link");
        const run = new TextRun({ text: n.text ?? "", ...runOptions(n.marks), ...extra, ...(link ? { style: "Hyperlink" } : {}) });
        const href = link?.attrs?.href;
        out.push(typeof href === "string" && /^(https?:|mailto:)/.test(href) ? new ExternalHyperlink({ link: href, children: [run] }) : run);
      } else if (n.type === "hardBreak") out.push(new TextRun({ break: 1 }));
      else if (n.type === "footnote") {
        noteNo++;
        footnotes[noteNo] = { children: [new Paragraph({ children: [new TextRun(String(n.attrs?.text ?? ""))] })] };
        out.push(new FootnoteReferenceRun(noteNo));
      }
    }
    return out;
  }

  function align(n: DocNode) {
    const a = n.attrs?.textAlign;
    return a === "center" ? AlignmentType.CENTER : a === "right" ? AlignmentType.RIGHT : a === "justify" ? AlignmentType.JUSTIFIED : undefined;
  }

  function blocks(nodes: DocNode[] | undefined, ctx: { style?: string; list?: { ref: string; level: number } } = {}): Paragraph[] {
    const out: Paragraph[] = [];
    let first = true;
    for (const n of nodes ?? []) {
      switch (n.type) {
        case "paragraph":
          out.push(
            new Paragraph({
              children: inline(n.content),
              alignment: align(n),
              style: ctx.style ?? (first ? "FirstParagraph" : undefined),
              ...(ctx.list ? { numbering: { reference: ctx.list.ref, level: ctx.list.level } } : {}),
            }),
          );
          first = false;
          break;
        case "heading": {
          const level = Number(n.attrs?.level ?? 2);
          out.push(new Paragraph({ children: inline(n.content), heading: level === 2 ? HeadingLevel.HEADING_2 : level === 3 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_4 }));
          first = true;
          break;
        }
        case "blockquote":
          out.push(...blocks(n.content, { style: "Quote" }));
          break;
        case "callout":
          out.push(...blocks(n.content, { style: "Callout" }));
          break;
        case "box": {
          // a Word manuscript keeps the words; the styling is the theme's job at export
          const def = boxDef(String(n.attrs?.variant ?? ""));
          const label = n.attrs?.label != null ? String(n.attrs.label) : (def.box?.label ?? "");
          if (label && !def.box?.only) out.push(new Paragraph({ style: "Callout", children: [new TextRun({ text: label, bold: true })] }));
          out.push(...blocks(n.content, { style: "Callout" }));
          break;
        }
        case "chat":
          for (const m of n.content ?? []) {
            const name = n.attrs?.group && m.attrs?.name ? `${String(m.attrs.name)}: ` : "";
            out.push(new Paragraph({ alignment: m.attrs?.from === "me" ? AlignmentType.RIGHT : AlignmentType.LEFT, children: [new TextRun({ text: name, bold: true }), ...inline(m.content)] }));
          }
          break;
        case "columns":
          for (const col of n.content ?? []) out.push(...blocks(col.content));
          break;
        case "table":
          for (const row of n.content ?? [])
            out.push(new Paragraph({ children: (row.content ?? []).flatMap((cell, j) => [...(j ? [new TextRun("  |  ")] : []), ...inline((cell.content ?? []).flatMap((p) => p.content ?? []))]) }));
          break;
        case "pageBreak":
          out.push(new Paragraph({ children: [new PageBreak()] }));
          break;
        case "spacer":
          out.push(new Paragraph({ children: [] }));
          break;
        case "bulletList":
        case "orderedList":
          for (const li of n.content ?? []) out.push(...blocks(li.content, { list: { ref: n.type === "bulletList" ? "bullets" : "numbers", level: 0 } }));
          break;
        case "horizontalRule":
          out.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(sceneBreakGlyph(theme) || "* * *")] }));
          first = true;
          break;
        case "image": {
          const img = typeof n.attrs?.src === "string" ? images.get(n.attrs.src) : undefined;
          if (!img) break;
          const type = img.mediaType.includes("png") ? "png" : img.mediaType.includes("gif") ? "gif" : "jpg";
          const w = img.width ?? 600;
          const h = img.height ?? 400;
          // the picture's width is a share of the text column, as in the editor
          const scale = Math.min(1, (maxImgWidth * pictureWidth(n.attrs)) / 100 / w);
          const align = pictureAlign(n.attrs?.layout);
          const alignment = align === "left" ? AlignmentType.LEFT : align === "right" ? AlignmentType.RIGHT : AlignmentType.CENTER;
          out.push(new Paragraph({ alignment, children: [new ImageRun({ type, data: img.bytes, transformation: { width: w * scale, height: h * scale } })] }));
          if (n.attrs?.title) out.push(new Paragraph({ style: "Caption", children: [new TextRun(String(n.attrs.title))] }));
          break;
        }
      }
    }
    return out;
  }

  const children: Paragraph[] = [];
  elements.forEach((e, i) => {
    const brk = i > 0 ? [new PageBreak()] : [];
    switch (e.kind.id) {
      case "title_page":
        children.push(
          new Paragraph({ children: [...brk], spacing: { before: 2400 } }),
          new Paragraph({ style: "Title", children: [new TextRun(book.title)] }),
          ...(book.subtitle ? [new Paragraph({ style: "Subtitle", children: [new TextRun(book.subtitle)] })] : []),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 720 }, children: [new TextRun({ text: authorName(input), size: 28 })] }),
        );
        return;
      case "contents":
        children.push(new Paragraph({ children: brk }), new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(e.title)] }));
        children.push(new TableOfContents(e.title, { hyperlink: true, headingStyleRange: "1-1" }) as unknown as Paragraph);
        return;
      case "also_by":
        children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [...brk, new TextRun(e.title)] }), ...input.alsoBy.map((b) => new Paragraph({ children: [new TextRun(b.title)] })));
        return;
    }
    // a hidden heading stays in the file, invisible, so Word's table of contents still finds it
    const hidden = e.kind.hideTitle || e.options.hideHeading;
    const label = hidden ? "" : e.label;
    if (label) children.push(new Paragraph({ style: "ChapterLabel", children: [...brk, new TextRun(label)] }));
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [...(label ? [] : brk), new TextRun(e.title)],
        ...(hidden ? { style: "HiddenTitle" } : {}),
      }),
    );
    if (e.subtitle && !hidden) children.push(new Paragraph({ style: "Subtitle", children: [new TextRun(e.subtitle)] }));
    children.push(...blocks(e.chapter.content?.content));
  });

  const font = theme.bodyFont;
  const doc = new Document({
    evenAndOddHeaderAndFooters: true,
    creator: authorName(input),
    title: book.title,
    description: book.description?.slice(0, 500),
    features: { updateFields: true },
    footnotes,
    styles: {
      default: { document: { run: { font, size: format.fontSize * 2 }, paragraph: { spacing: { line: Math.round(240 * format.lineHeight) } } } },
      paragraphStyles: [
        { id: "Normal", name: "Normal", run: { font, size: format.fontSize * 2 }, paragraph: { indent: theme.indent ? { firstLine: 0.3 * TWIP } : undefined, spacing: { after: theme.indent ? 0 : 160 }, alignment: AlignmentType.JUSTIFIED } },
        { id: "FirstParagraph", name: "First Paragraph", basedOn: "Normal", next: "Normal", paragraph: { indent: { firstLine: 0 } } },
        { id: "Title", name: "Title", basedOn: "Normal", run: { font: theme.headingFont, size: 56 }, paragraph: { alignment: AlignmentType.CENTER, indent: { firstLine: 0 }, spacing: { after: 240 } } },
        { id: "Subtitle", name: "Subtitle", basedOn: "Normal", run: { italics: true, size: 28 }, paragraph: { alignment: AlignmentType.CENTER, indent: { firstLine: 0 }, spacing: { after: 480 } } },
        { id: "ChapterLabel", name: "Chapter Label", basedOn: "Normal", run: { font: theme.headingFont, size: 22, allCaps: true, characterSpacing: 40 }, paragraph: { alignment: theme.headingAlign === "center" ? AlignmentType.CENTER : AlignmentType.LEFT, indent: { firstLine: 0 }, spacing: { before: 1800, after: 120 } } },
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "FirstParagraph", run: { font: theme.headingFont, size: 40, italics: theme.headingItalic, bold: theme.headingWeight >= 600 }, paragraph: { alignment: theme.headingAlign === "center" ? AlignmentType.CENTER : AlignmentType.LEFT, indent: { firstLine: 0 }, spacing: { after: 720 } } },
        { id: "HiddenTitle", name: "Hidden Title", basedOn: "Heading1", run: { size: 2, color: "FFFFFF" } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "FirstParagraph", run: { font: theme.headingFont, size: 28, bold: true }, paragraph: { indent: { firstLine: 0 }, alignment: AlignmentType.LEFT, spacing: { before: 360, after: 120 }, keepNext: true } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "FirstParagraph", run: { font: theme.headingFont, size: 24, bold: true }, paragraph: { indent: { firstLine: 0 }, alignment: AlignmentType.LEFT, spacing: { before: 280, after: 100 }, keepNext: true } },
        { id: "Heading4", name: "Heading 4", basedOn: "Normal", next: "FirstParagraph", run: { font: theme.headingFont, size: 22, bold: true, italics: true }, paragraph: { indent: { firstLine: 0 }, alignment: AlignmentType.LEFT, spacing: { before: 240, after: 80 }, keepNext: true } },
        { id: "Quote", name: "Quote", basedOn: "Normal", run: { italics: true }, paragraph: { indent: { left: 0.4 * TWIP, right: 0.4 * TWIP, firstLine: 0 }, spacing: { before: 120, after: 120 } } },
        { id: "Callout", name: "Callout", basedOn: "Normal", paragraph: { indent: { left: 0.2 * TWIP, right: 0.2 * TWIP, firstLine: 0 }, shading: { fill: "EFEBE8" }, spacing: { before: 60, after: 60 } } },
        { id: "Caption", name: "Caption", basedOn: "Normal", run: { italics: true, size: 18 }, paragraph: { alignment: AlignmentType.CENTER, indent: { firstLine: 0 } } },
      ],
    },
    numbering: {
      config: [
        { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 0.35 * TWIP, hanging: 0.2 * TWIP, firstLine: 0 } } } }] },
        { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 0.35 * TWIP, hanging: 0.25 * TWIP, firstLine: 0 } } } }] },
      ],
    },
    sections: [
      {
        properties: {
          titlePage: true,
          page: {
            size: { width: Math.round(g.pageWidth * TWIP), height: Math.round(g.pageHeight * TWIP) },
            margin: {
              top: Math.round(g.margins.top * TWIP),
              bottom: Math.round(g.margins.bottom * TWIP),
              left: Math.round(g.margins.inside * TWIP),
              right: Math.round(g.margins.outside * TWIP),
            },
          },
        },
        ...wordChrome(runningHeads(format), { book: book.title, author: authorName(input), width: Math.round((g.pageWidth - g.margins.inside - g.margins.outside) * TWIP) }),
        children,
      },
    ],
  });
  return Packer.toBlob(doc);
}

/**
 * Word's headers and footers from the book's settings. A Word file is one long section, so the
 * chapter title comes from a STYLEREF field (Word fills in the latest chapter heading on each
 * page); part heads use the same field. The title page carries neither.
 */
function wordChrome(h: RunningHeads, o: { book: string; author: string; width: number }) {
  const size = 18;
  const runOpts = { size, smallCaps: h.style === "smallcaps", italics: h.style === "italic" };
  const head = (what: HeadContent): ParagraphChild[] => {
    if (what === "none") return [];
    if (what === "book") return [new TextRun({ text: o.book, ...runOpts })];
    if (what === "author") return [new TextRun({ text: o.author, ...runOpts })];
    return [new SimpleField('STYLEREF "Heading 1"')];
  };
  const folio = (): ParagraphChild[] => {
    if (h.folio === "none") return [];
    const pre = h.folioStyle === "dashes" ? "– " : h.folioStyle === "word" ? "Page " : "";
    const post = h.folioStyle === "dashes" ? " –" : "";
    return [new TextRun({ children: [pre, PageNumber.CURRENT, post], size })];
  };
  const rule = h.rule ? { border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "8C8C8C", space: 2 } } } : {};
  const headPara = (recto: boolean) => {
    const text = head(recto ? h.right : h.left);
    if (h.folio === "top-outside") {
      const n = folio();
      // the number sits on the outside edge, the head across from it
      const children = recto ? [...text, new TextRun({ children: [new Tab()], size }), ...n] : [...n, new TextRun({ children: [new Tab()], size }), ...text];
      return new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: o.width }], children, ...rule });
    }
    const alignment = h.align === "center" ? AlignmentType.CENTER : recto ? AlignmentType.RIGHT : AlignmentType.LEFT;
    return new Paragraph({ alignment, children: text, ...(text.length ? rule : {}) });
  };
  const footPara = (recto: boolean) => {
    if (h.folio === "top-outside" || h.folio === "none") return new Paragraph({ children: [] });
    const alignment = h.folio === "bottom-center" ? AlignmentType.CENTER : recto ? AlignmentType.RIGHT : AlignmentType.LEFT;
    return new Paragraph({ alignment, children: folio() });
  };
  const blank = () => new Paragraph({ children: [] });
  return {
    headers: { default: new Header({ children: [headPara(true)] }), even: new Header({ children: [headPara(false)] }), first: new Header({ children: [blank()] }) },
    footers: { default: new Footer({ children: [footPara(true)] }), even: new Footer({ children: [footPara(false)] }), first: new Footer({ children: [blank()] }) },
  };
}
