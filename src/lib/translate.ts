import type { DocNode } from "./doc/types";

/**
 * "Translate this book": a copy of the book in another language, made chapter by chapter with the
 * writer's own AI model. The chapter's structure (headings, lists, bold, links, footnotes, images)
 * stays exactly as it was; only the words change. Each paragraph goes to the model as one string,
 * with its differently styled runs wrapped in numbered tags so the styling can be put back.
 */

export const LANGUAGES: { code: string; name: string }[] = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "pt", name: "Portuguese" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" },
  { code: "ro", name: "Romanian" },
  { code: "sv", name: "Swedish" },
  { code: "da", name: "Danish" },
  { code: "no", name: "Norwegian" },
  { code: "fi", name: "Finnish" },
  { code: "cs", name: "Czech" },
  { code: "el", name: "Greek" },
  { code: "tr", name: "Turkish" },
  { code: "ru", name: "Russian" },
  { code: "uk", name: "Ukrainian" },
  { code: "ar", name: "Arabic" },
  { code: "he", name: "Hebrew" },
  { code: "hi", name: "Hindi" },
  { code: "zh", name: "Chinese (Simplified)" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "id", name: "Indonesian" },
  { code: "vi", name: "Vietnamese" },
  { code: "tl", name: "Tagalog (Filipino)" },
  { code: "sw", name: "Swahili" },
  { code: "yo", name: "Yoruba" },
  { code: "ig", name: "Igbo" },
  { code: "ha", name: "Hausa" },
  { code: "am", name: "Amharic" },
  { code: "zu", name: "Zulu" },
  { code: "af", name: "Afrikaans" },
];

export const languageName = (code: string) => LANGUAGES.find((l) => l.code === code)?.name ?? code;

/** One piece of text to translate: a paragraph's text runs, or a footnote or caption held in an attribute. */
interface Unit {
  nodes?: DocNode[];
  attr?: { node: DocNode; key: string };
}

const isTextblock = (n: DocNode) => (n.content ?? []).some((c) => c.type === "text");

function collect(n: DocNode, out: Unit[]) {
  if (n.type === "footnote" && typeof n.attrs?.text === "string" && n.attrs.text.trim()) out.push({ attr: { node: n, key: "text" } });
  if (n.type === "image" && typeof n.attrs?.title === "string" && n.attrs.title.trim()) out.push({ attr: { node: n, key: "title" } });
  if (n.type === "image" && typeof n.attrs?.alt === "string" && n.attrs.alt.trim()) out.push({ attr: { node: n, key: "alt" } });
  if (isTextblock(n)) {
    const texts = (n.content ?? []).filter((c) => c.type === "text" && (c.text ?? "").length > 0);
    if (texts.some((t) => /\p{L}/u.test(t.text ?? ""))) out.push({ nodes: texts });
  }
  for (const c of n.content ?? []) if (c.type !== "text") collect(c, out);
}

/** The words of a unit as the model sees them: plain text, or numbered tags round each styled run. */
function source(u: Unit): string {
  if (u.attr) return String(u.attr.node.attrs![u.attr.key]);
  const nodes = u.nodes!;
  if (nodes.length === 1) return nodes[0].text!;
  return nodes.map((t, i) => `<${i + 1}>${t.text}</${i + 1}>`).join("");
}

/** Puts a translation back: each tagged run into its own text node, or all of it into the first when the tags got lost. */
function apply(u: Unit, text: string) {
  if (u.attr) {
    u.attr.node.attrs = { ...u.attr.node.attrs, [u.attr.key]: text };
    return;
  }
  const nodes = u.nodes!;
  if (nodes.length === 1) {
    nodes[0].text = text;
    return;
  }
  const runs = nodes.map((_, i) => text.match(new RegExp(`<${i + 1}>([\\s\\S]*?)</${i + 1}>`))?.[1]);
  if (runs.every((r) => r !== undefined)) runs.forEach((r, i) => (nodes[i].text = r!));
  else {
    nodes[0].text = text.replace(/<\s*\/?\s*\d+\s*>/g, "");
    for (let i = 1; i < nodes.length; i++) nodes[i].text = "";
  }
}

export interface TranslationJob {
  /** a deep copy of the chapter to fill in */
  doc: DocNode;
  /** groups of strings, each small enough for one request */
  batches: string[][];
  /** call with every batch's answers, in order, to finish the copy */
  finish: (answers: string[][]) => DocNode;
}

/** Splits a chapter into batches of about `size` characters. */
export function planTranslation(doc: DocNode, size = 5000): TranslationJob {
  const copy = JSON.parse(JSON.stringify(doc)) as DocNode;
  const units: Unit[] = [];
  collect(copy, units);
  const batches: string[][] = [];
  const owners: Unit[][] = [];
  let cur: string[] = [];
  let curUnits: Unit[] = [];
  let len = 0;
  for (const u of units) {
    const s = source(u);
    if (cur.length && len + s.length > size) {
      batches.push(cur);
      owners.push(curUnits);
      cur = [];
      curUnits = [];
      len = 0;
    }
    cur.push(s);
    curUnits.push(u);
    len += s.length;
  }
  if (cur.length) {
    batches.push(cur);
    owners.push(curUnits);
  }
  return {
    doc: copy,
    batches,
    finish(answers) {
      owners.forEach((us, b) => us.forEach((u, i) => apply(u, answers[b]?.[i] ?? source(u))));
      // drop runs emptied when the tags got lost
      const prune = (n: DocNode) => {
        if (n.content) n.content = n.content.filter((c) => c.type !== "text" || (c.text ?? "") !== "").map((c) => (prune(c), c));
      };
      prune(copy);
      return copy;
    },
  };
}

/** The model's instructions for one batch. */
export function translationPrompt(language: string, book: { title: string }): string {
  return [
    `You translate a book called "${book.title}" into ${language} for publication.`,
    "You get a JSON array of strings: the paragraphs, headings and notes of one chapter, in order. Translate each one.",
    `Answer with only a JSON array of the same length, string i being the ${language} translation of string i. No commentary, no code fences.`,
    "Some strings wrap parts in numbered tags like <1>…</1><2>…</2>, marking bold, italic or links. Keep every tag, in order, round the matching translated words.",
    "Translate as a skilled literary translator: natural, fluent and faithful to the author's meaning, tone and register. Keep names of people and places unless they have an established form in the target language. Keep scripture, quotations and titles in their standard published translation when one exists.",
  ].join("\n");
}

/** Reads the model's answer as an array of strings, the same length as what was sent; null when it isn't one. */
export function parseTranslation(answer: string, expected: number): string[] | null {
  const start = answer.indexOf("[");
  const end = answer.lastIndexOf("]");
  if (start < 0 || end <= start) return null;
  try {
    const list = JSON.parse(answer.slice(start, end + 1)) as unknown;
    if (!Array.isArray(list) || list.length !== expected || !list.every((s) => typeof s === "string")) return null;
    return list as string[];
  } catch {
    return null;
  }
}
