/** A chapter as Markdown, for the chapter menu's export, and the numbers behind Chapter stats. */
import { boxDef } from "@/lib/blocks";
import { countWords, plainText, type DocNode } from "./types";

function inline(nodes: DocNode[] | undefined, notes: string[]): string {
  return (nodes ?? [])
    .map((n) => {
      if (n.type === "hardBreak") return "  \n";
      if (n.type === "footnote") {
        notes.push(String(n.attrs?.text ?? ""));
        return `[^${notes.length}]`;
      }
      if (n.type !== "text") return inline(n.content, notes);
      let t = (n.text ?? "").replace(/([*_`\\[\]])/g, "\\$1");
      for (const m of n.marks ?? []) {
        if (m.type === "bold") t = `**${t}**`;
        else if (m.type === "italic") t = `*${t}*`;
        else if (m.type === "strike") t = `~~${t}~~`;
        else if (m.type === "link" && typeof m.attrs?.href === "string") t = `[${t}](${m.attrs.href})`;
      }
      return t;
    })
    .join("");
}

function block(n: DocNode, notes: string[], indent = ""): string {
  const kids = (list: DocNode[] | undefined) => (list ?? []).map((c) => block(c, notes, indent)).filter(Boolean).join("\n\n");
  switch (n.type) {
    case "paragraph":
      return indent + inline(n.content, notes);
    case "heading":
      return `${"#".repeat(Math.min(6, Number(n.attrs?.level ?? 2)))} ${inline(n.content, notes)}`;
    case "blockquote":
    case "callout":
      return kids(n.content)
        .split("\n")
        .map((l) => `> ${l}`)
        .join("\n");
    case "box": {
      const label = (n.attrs?.label as string | null) ?? boxDef(String(n.attrs?.variant)).box?.label;
      const body = kids(n.content);
      return (label ? `**${label}**\n\n${body}` : body)
        .split("\n")
        .map((l) => `> ${l}`)
        .join("\n");
    }
    case "bulletList":
    case "orderedList":
      return (n.content ?? [])
        .map((li, i) => {
          const mark = n.type === "orderedList" ? `${i + 1}.` : "-";
          const [first, ...rest] = li.content ?? [];
          const head = `${indent}${mark} ${first ? inline(first.content, notes) : ""}`;
          return [head, ...rest.map((r) => block(r, notes, indent + "   "))].join("\n");
        })
        .join("\n");
    case "horizontalRule":
      return "* * *";
    case "image":
      return `![${String(n.attrs?.alt ?? "")}](${String(n.attrs?.src ?? "")})`;
    case "chat":
      return (n.content ?? []).map((m) => `> **${m.attrs?.from === "me" ? "Me" : String(m.attrs?.name || "Them")}:** ${inline(m.content, notes)}`).join("\n>\n");
    case "table":
      return (n.content ?? [])
        .map((row, i) => {
          const cells = (row.content ?? []).map((c) => plainText(c).trim().replace(/\|/g, "\\|"));
          const line = `| ${cells.join(" | ")} |`;
          return i === 0 ? `${line}\n|${cells.map(() => " --- ").join("|")}|` : line;
        })
        .join("\n");
    case "pageBreak":
    case "spacer":
      return "";
    default:
      return kids(n.content);
  }
}

export function docToMarkdown(doc: DocNode | null | undefined, title?: string): string {
  const notes: string[] = [];
  const body = (doc?.content ?? []).map((n) => block(n, notes)).filter(Boolean).join("\n\n");
  const head = title ? `# ${title}\n\n` : "";
  const foot = notes.length ? `\n\n${notes.map((t, i) => `[^${i + 1}]: ${t}`).join("\n")}` : "";
  return `${head}${body}${foot}\n`;
}

export interface ChapterStats {
  words: number;
  characters: number;
  paragraphs: number;
  sentences: number;
  /** minutes at 250 words a minute */
  minutes: number;
  wordsPerSentence: number;
  /** share of words inside quotation marks */
  dialogue: number;
}

export function chapterStats(doc: DocNode | null | undefined): ChapterStats {
  const text = plainText(doc, "\n").trim();
  const words = countWords(doc);
  const paragraphs = text ? text.split(/\n+/).filter((p) => p.trim()).length : 0;
  const sentences = (text.match(/[^.!?…]+[.!?…]+/g) ?? []).length || (text ? 1 : 0);
  const quoted = (text.match(/[“"][^”"]*[”"]/g) ?? []).join(" ");
  const quotedWords = quoted.trim() ? quoted.trim().split(/\s+/).length : 0;
  return {
    words,
    characters: text.replace(/\n/g, "").length,
    paragraphs,
    sentences,
    minutes: Math.max(words ? 1 : 0, Math.round(words / 250)),
    wordsPerSentence: sentences ? Math.round((words / sentences) * 10) / 10 : 0,
    dialogue: words ? Math.round((quotedWords / words) * 100) : 0,
  };
}

/** Splits a chapter before top-level block `at`. A heading that starts the second half becomes its title. */
export function splitDoc(doc: DocNode, at: number): { first: DocNode; second: DocNode; title: string | null } {
  const all = doc.content ?? [];
  const head = all.slice(0, at);
  let tail = all.slice(at);
  let title: string | null = null;
  if (tail[0]?.type === "heading") {
    title = plainText(tail[0]).trim() || null;
    tail = tail.slice(1);
  }
  const fill = (c: DocNode[]): DocNode => ({ type: "doc", content: c.length ? c : [{ type: "paragraph" }] });
  return { first: fill(head), second: fill(tail), title };
}
