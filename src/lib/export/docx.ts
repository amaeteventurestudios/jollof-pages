import {
  AlignmentType,
  Document,
  ExternalHyperlink,
  FootnoteReferenceRun,
  Footer,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  TableOfContents,
  TextRun,
  type IRunOptions,
  type ParagraphChild,
} from "docx";
import { authorName, orderedElements, type ExportInput } from "../book-model";
import type { DocMark, DocNode } from "../doc/types";
import { pageGeometry } from "../kdp";
import { getTheme, sceneBreakGlyph } from "../themes";
import { bookFormat } from "../types";

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
  const theme = getTheme(format.theme);
  const g = pageGeometry(format.trim, input.book.page_count || 200, false);
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
          const scale = Math.min(1, maxImgWidth / w);
          out.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type, data: img.bytes, transformation: { width: w * scale, height: h * scale } })] }));
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
    if (e.label) children.push(new Paragraph({ style: "ChapterLabel", children: [...brk, new TextRun(e.label)] }));
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [...(e.label ? [] : brk), new TextRun(e.title)],
        ...(e.kind.hideTitle ? { style: "HiddenTitle" } : {}),
      }),
    );
    if (e.subtitle) children.push(new Paragraph({ style: "Subtitle", children: [new TextRun(e.subtitle)] }));
    children.push(...blocks(e.chapter.content?.content));
  });

  const font = theme.bodyFont;
  const doc = new Document({
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
        footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18 })] })] }) },
        children,
      },
    ],
  });
  return Packer.toBlob(doc);
}
