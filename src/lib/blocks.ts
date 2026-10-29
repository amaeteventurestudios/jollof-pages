/**
 * Special blocks: everything an author can drop into a chapter besides plain paragraphs. Most are
 * a styled "box" (one ProseMirror node with a variant), so one serializer per output covers them;
 * the rest are their own nodes (conversations, columns, tables, breaks, images, notes).
 * The catalog drives the editor's Insert menu, the EPUB/web CSS and the Typst print rules.
 */
import type { DocNode } from "./doc/types";

export type BlockGroup = "Callouts" | "Teaching" | "Story and voice" | "Quotes" | "Layout" | "Reference" | "Ebook and print" | "Text and notes";

export const BLOCK_GROUPS: BlockGroup[] = ["Callouts", "Teaching", "Story and voice", "Quotes", "Layout", "Reference", "Ebook and print", "Text and notes"];

export type BoxFont = "body" | "heading" | "hand" | "mono" | "sans";

export interface BoxStyle {
  /** small heading inside the box; the author can rename it per block */
  label?: string;
  /** background tint; "accent" uses a pale version of the theme colour */
  fill?: string;
  border?: "left" | "box" | "rules" | "dashed" | "double" | "top" | "none";
  /** use the theme accent for the border */
  accent?: boolean;
  font?: BoxFont;
  italic?: boolean;
  align?: "left" | "center" | "right";
  /** text size relative to the body */
  size?: number;
  /** writing lines after the text, for prompts and worksheets */
  lines?: number;
  /** checkbox markers on the list inside */
  checklist?: boolean;
  /** a bold, large first line (stat boxes, headlines) */
  lead?: boolean;
  /** dimmed, dashed frame shown only in the editor (ebook-only / print-only) */
  only?: "ebook" | "print";
  /** the label sits at the end, like a signature or an attribution */
  labelAtEnd?: boolean;
}

export interface BlockDef {
  id: string;
  label: string;
  group: BlockGroup;
  description: string;
  /** a lucide-react icon name for the Insert menu */
  icon: string;
  kind: "box" | "chat" | "columns" | "table" | "pageBreak" | "ornament" | "spacer" | "image" | "blockquote" | "bulletList" | "orderedList" | "footnote" | "endnote" | "emoji" | "link";
  box?: BoxStyle;
}

const P = (text = ""): DocNode => (text ? { type: "paragraph", content: [{ type: "text", text }] } : { type: "paragraph" });

const box = (id: string, label: string, group: BlockGroup, description: string, icon: string, style: BoxStyle): BlockDef => ({ id, label, group, description, icon, kind: "box", box: style });

export const BLOCKS: BlockDef[] = [
  // callouts
  box("note", "Note", "Callouts", "A shaded box for a side note.", "StickyNote", { label: "Note", fill: "#f2efe8", border: "left", accent: true }),
  box("tip", "Tip", "Callouts", "A helpful hint, in green.", "Lightbulb", { label: "Tip", fill: "#e8f3ea", border: "left" }),
  box("important", "Important", "Callouts", "Something the reader must not miss.", "CircleAlert", { label: "Important", fill: "accent", border: "box", accent: true }),
  box("warning", "Warning", "Callouts", "A caution in amber.", "TriangleAlert", { label: "Warning", fill: "#fdf1dc", border: "left" }),
  box("key_idea", "Key idea", "Callouts", "The big idea of a section.", "KeyRound", { label: "Key idea", fill: "accent", border: "top", accent: true, size: 1.05 }),
  box("did_you_know", "Did you know?", "Callouts", "A fun fact.", "Sparkles", { label: "Did you know?", fill: "#eef2fb", border: "box" }),
  box("definition", "Definition", "Callouts", "A term and what it means.", "BookA", { label: "Definition", border: "rules", accent: true }),
  box("example", "Example", "Callouts", "A worked example.", "FlaskConical", { label: "Example", fill: "#f4f4f2", border: "dashed" }),
  box("summary_box", "In short", "Callouts", "A short summary of the section.", "ListCollapse", { label: "In short", fill: "accent", border: "none" }),
  box("takeaway", "Takeaway", "Callouts", "What to remember.", "Target", { label: "Takeaway", border: "double", accent: true }),
  // teaching
  box("exercise", "Exercise", "Teaching", "An activity for the reader.", "Dumbbell", { label: "Exercise", fill: "#f2efe8", border: "box", accent: true }),
  box("reflection", "Reflection", "Teaching", "A question to think about.", "MessageCircleQuestion", { label: "Reflect", border: "left", accent: true, italic: true }),
  box("journal_prompt", "Journal prompt", "Teaching", "A prompt with lines to write on.", "NotebookPen", { label: "Write about it", border: "box", lines: 5 }),
  box("checklist", "Checklist", "Teaching", "A list with tick boxes.", "ListChecks", { label: "Checklist", fill: "#f4f4f2", border: "none", checklist: true }),
  box("writing_lines", "Writing lines", "Teaching", "Ruled lines for the reader to fill in.", "Rows3", { border: "none", lines: 10 }),
  box("quiz", "Quiz", "Teaching", "Quick questions to check understanding.", "CircleHelp", { label: "Quiz", fill: "#eef2fb", border: "left" }),
  box("case_box", "Case study", "Teaching", "A real story that teaches a point.", "Briefcase", { label: "Case study", fill: "#f4f4f2", border: "top", accent: true }),
  box("action_step", "Action step", "Teaching", "One thing to do today.", "Footprints", { label: "Your next step", fill: "accent", border: "left", accent: true }),
  // story and voice
  { id: "chat", label: "Text messages", group: "Story and voice", description: "A phone conversation in bubbles.", icon: "MessagesSquare", kind: "chat" },
  { id: "group_chat", label: "Group chat", group: "Story and voice", description: "Bubbles with each sender's name.", icon: "Users", kind: "chat" },
  box("email", "Email", "Story and voice", "An email with From and Subject lines.", "Mail", { label: "From: … · Subject: …", fill: "#f7f7f5", border: "box", font: "sans", size: 0.92 }),
  box("letter", "Letter", "Story and voice", "A letter, signed at the end.", "Mails", { label: "With love,", border: "none", italic: true, labelAtEnd: true }),
  box("diary", "Diary entry", "Story and voice", "A dated entry in handwriting.", "BookHeart", { label: "Monday", font: "hand", size: 1.25, border: "none" }),
  box("newspaper", "Newspaper clipping", "Story and voice", "A headline and a column of news.", "Newspaper", { label: "THE DAILY TIMES", fill: "#f1ede4", border: "rules", font: "heading", lead: true, size: 0.95 }),
  box("telegram", "Telegram", "Story and voice", "A typewritten message.", "Send", { label: "TELEGRAM", fill: "#f5efe1", border: "box", font: "mono", size: 0.95 }),
  box("handwritten", "Handwritten note", "Story and voice", "A note in handwriting.", "PenLine", { font: "hand", size: 1.35, fill: "#fff8d6", border: "none" }),
  box("poem", "Poem", "Story and voice", "Lines of verse, centred.", "Feather", { border: "none", italic: true, align: "center" }),
  box("lyrics", "Song lyrics", "Story and voice", "A verse and chorus.", "Music", { label: "♪", border: "none", italic: true, align: "center", size: 0.95 }),
  box("script", "Script", "Story and voice", "Play or screenplay dialogue.", "Clapperboard", { border: "none", font: "mono", size: 0.92 }),
  box("interview_qa", "Questions and answers", "Story and voice", "Interview questions in bold.", "Mic", { border: "left", accent: true }),
  box("social_post", "Social post", "Story and voice", "A post with a name and handle.", "AtSign", { label: "@yourname", fill: "#ffffff", border: "box", font: "sans", size: 0.92 }),
  // quotes
  { id: "blockquote", label: "Block quote", group: "Quotes", description: "A longer quotation, indented.", icon: "Quote", kind: "blockquote" },
  box("pull_quote", "Pull quote", "Quotes", "A line from the text, set large.", "TextQuote", { border: "rules", accent: true, align: "center", size: 1.3, italic: true, font: "heading" }),
  box("epigraph_quote", "Quotation with source", "Quotes", "A quote and who said it.", "Quote", { label: "— Source", border: "none", italic: true, align: "right", labelAtEnd: true }),
  box("proverb", "Proverb", "Quotes", "A proverb or saying, framed.", "Sprout", { label: "Proverb", fill: "accent", border: "double", accent: true, align: "center", italic: true }),
  box("scripture", "Scripture", "Quotes", "A verse with its reference.", "BookOpen", { label: "Reference", border: "left", accent: true, italic: true, labelAtEnd: true }),
  // layout
  { id: "columns2", label: "Two columns", group: "Layout", description: "Text side by side.", icon: "Columns2", kind: "columns" },
  { id: "columns3", label: "Three columns", group: "Layout", description: "Three narrow columns.", icon: "Columns3", kind: "columns" },
  { id: "table", label: "Table", group: "Layout", description: "Rows and columns, with a header row.", icon: "Table", kind: "table" },
  { id: "page_break", label: "Page break", group: "Layout", description: "Start a new page here (print and ebook).", icon: "SeparatorHorizontal", kind: "pageBreak" },
  { id: "ornament", label: "Scene break", group: "Layout", description: "An ornament between scenes.", icon: "Asterisk", kind: "ornament" },
  { id: "spacer", label: "Blank space", group: "Layout", description: "Extra space between blocks.", icon: "MoveVertical", kind: "spacer" },
  { id: "image_left", label: "Picture, left", group: "Layout", description: "A small picture on the left.", icon: "PanelLeft", kind: "image" },
  { id: "image_right", label: "Picture, right", group: "Layout", description: "A small picture on the right.", icon: "PanelRight", kind: "image" },
  { id: "image_full", label: "Full-width picture", group: "Layout", description: "A picture across the whole text width.", icon: "Image", kind: "image" },
  box("overlay", "Text over a picture", "Layout", "Words set over a darkened picture.", "ImageUp", { border: "none", align: "center", size: 1.15 }),
  // reference
  box("sidebar", "Sidebar", "Reference", "Extra detail beside the main story.", "PanelRightOpen", { label: "Sidebar", fill: "#f4f4f2", border: "box", size: 0.92, font: "sans" }),
  box("fact_box", "Fact box", "Reference", "Key facts and figures.", "Info", { label: "Fast facts", fill: "accent", border: "none", font: "sans", size: 0.92 }),
  box("stat", "Big number", "Reference", "A statistic, set large.", "ChartNoAxesColumn", { border: "none", align: "center", lead: true, font: "heading" }),
  box("timeline_box", "Timeline", "Reference", "Dates and events in order.", "History", { label: "Timeline", border: "left", accent: true, font: "sans", size: 0.92 }),
  box("profile", "Character profile", "Reference", "A person at a glance.", "Contact", { label: "Profile", fill: "#f2efe8", border: "box", size: 0.95 }),
  box("recipe_card", "Recipe card", "Reference", "Ingredients and steps.", "CookingPot", { label: "Recipe", fill: "#fbf3e4", border: "box", accent: true }),
  box("glossary_term", "Glossary term", "Reference", "A word and its meaning.", "Library", { border: "none", lead: true }),
  // ebook and print
  box("ebook_only", "Ebook only", "Ebook and print", "Shown in the ebook, left out of print (links, buttons).", "Tablet", { label: "Ebook only", border: "dashed", only: "ebook" }),
  box("print_only", "Print only", "Ebook and print", "In the printed book only (page references, a QR code).", "Printer", { label: "Print only", border: "dashed", only: "print" }),
  // text and notes
  { id: "bullets", label: "Bulleted list", group: "Text and notes", description: "A list with bullets.", icon: "List", kind: "bulletList" },
  { id: "numbers", label: "Numbered list", group: "Text and notes", description: "A list with numbers.", icon: "ListOrdered", kind: "orderedList" },
  { id: "footnote", label: "Footnote", group: "Text and notes", description: "A note at the foot of the page.", icon: "NotebookPen", kind: "footnote" },
  { id: "endnote", label: "Endnote", group: "Text and notes", description: "A note collected at the end of the chapter.", icon: "NotebookText", kind: "endnote" },
  { id: "emoji", label: "Emoji", group: "Text and notes", description: "Pick from every emoji.", icon: "Smile", kind: "emoji" },
  { id: "link", label: "Link", group: "Text and notes", description: "A web link, or a link to a store.", icon: "Link2", kind: "link" },
];

export const BOXES = BLOCKS.filter((b) => b.kind === "box");

export function boxDef(variant: string | undefined): BlockDef {
  return BOXES.find((b) => b.id === variant) ?? BOXES[0];
}

const BOX_PROMPTS: Record<string, string> = {
  diary: "Dear diary, today…",
  handwritten: "Meet me at the market at noon.",
  poem: "Write the first line of the poem",
  lyrics: "Sing the first line here",
  pull_quote: "A line worth repeating, set large.",
  epigraph_quote: "The quotation goes here.",
  proverb: "Until the lion learns to write, every story will glorify the hunter.",
  scripture: "The verse goes here.",
  ebook_only: "Tap here to join my readers' club.",
  print_only: "Scan the code on the next page to join my readers' club.",
  telegram: "ARRIVING LAGOS TUESDAY STOP BRING THE LETTERS STOP",
  social_post: "Just finished chapter three. Wow.",
  writing_lines: "",
};

/** The content a block starts with when inserted, so the author sees how to use it. */
export function blockTemplate(id: string): DocNode | null {
  const b = BLOCKS.find((x) => x.id === id);
  if (!b) return null;
  switch (b.kind) {
    case "box": {
      const starter: Record<string, DocNode[]> = {
        checklist: [{ type: "bulletList", content: ["First thing", "Second thing", "Third thing"].map((t) => ({ type: "listItem", content: [P(t)] })) }],
        email: [P("Hi,"), P("Write the email here."), P("Best,")],
        letter: [P("Dear …,"), P("Write the letter here.")],
        newspaper: [P("Headline goes here"), P("The story, in a column of news.")],
        stat: [P("72%"), P("of readers finish a book with a strong first chapter.")],
        glossary_term: [P("Term"), P("What it means.")],
        script: [P("AMA: (softly) Are you sure?"), P("KOFI: I have never been more sure of anything.")],
        interview_qa: [{ type: "paragraph", content: [{ type: "text", text: "Q: ", marks: [{ type: "bold" }] }, { type: "text", text: "Your question?" }] }, P("A: The answer.")],
        timeline_box: [P("1957: Ghana becomes independent."), P("1960: Nigeria becomes independent.")],
        recipe_card: [P("Ingredients"), { type: "bulletList", content: ["2 cups rice", "4 tomatoes"].map((t) => ({ type: "listItem", content: [P(t)] })) }, P("Method"), { type: "orderedList", content: ["Blend the tomatoes.", "Simmer, then add the rice."].map((t) => ({ type: "listItem", content: [P(t)] })) }],
        overlay: [P("Words over a picture")],
      };
      return { type: "box", attrs: { variant: b.id }, content: starter[b.id] ?? [P(BOX_PROMPTS[b.id] ?? "Type here.")] };
    }
    case "chat":
      return {
        type: "chat",
        attrs: { group: b.id === "group_chat" },
        content: [
          { type: "chatMessage", attrs: { from: "them", name: b.id === "group_chat" ? "Ada" : "" }, content: [{ type: "text", text: "Are you coming tonight?" }] },
          { type: "chatMessage", attrs: { from: "me", name: "" }, content: [{ type: "text", text: "On my way!" }] },
        ],
      };
    case "columns": {
      const n = b.id === "columns3" ? 3 : 2;
      return { type: "columns", attrs: { count: n }, content: Array.from({ length: n }, (_, i) => ({ type: "column", content: [P(`Column ${i + 1}`)] })) };
    }
    case "table": {
      const row = (cell: "tableHeader" | "tableCell", texts: string[]) => ({ type: "tableRow", content: texts.map((t) => ({ type: cell, content: [P(t)] })) });
      return { type: "table", content: [row("tableHeader", ["Heading", "Heading", "Heading"]), row("tableCell", ["", "", ""]), row("tableCell", ["", "", ""])] };
    }
    case "pageBreak":
      return { type: "pageBreak" };
    case "spacer":
      return { type: "spacer", attrs: { size: 2 } };
    case "ornament":
      return { type: "horizontalRule" };
    default:
      return null;
  }
}

/** A pale tint of a hex colour, for "accent" fills. */
export function paleTint(hex: string, mix = 0.9): string {
  const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return "#f2efe8";
  const c = [m[1], m[2], m[3]].map((x) => Math.round(parseInt(x, 16) * (1 - mix) + 255 * mix));
  return `#${c.map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

export function boxFill(style: BoxStyle, accent: string): string | null {
  if (!style.fill) return null;
  return style.fill === "accent" ? paleTint(accent) : style.fill;
}
