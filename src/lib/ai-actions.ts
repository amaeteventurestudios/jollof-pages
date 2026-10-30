/**
 * The AI writing tools in the editor's menus. Each one is a short instruction sent with the selected
 * words (or the text before the cursor) to the writer's own model. Nothing reaches the book until
 * the writer accepts the suggestion. Shared by the studio and the server, which builds the prompt.
 */
import type { DocNode } from "@/lib/doc/types";

export type AiGroup = "write" | "fiction" | "nonfiction" | "explain" | "chapter";

/**
 * replace: swaps the selected words. after: goes after the paragraph. block: a special block after
 * the paragraph (or in place of the selection with `swap`). note: an answer to read, nothing inserted.
 */
export type AiOutput = "replace" | "after" | "block" | "note";

export interface AiAction {
  id: string;
  label: string;
  group: AiGroup;
  /** selection: needs selected words. cursor: works from the text before the cursor. chapter: the whole chapter */
  needs: "selection" | "cursor" | "chapter";
  output: AiOutput;
  /** the special block a "block" action fills */
  block?: string;
  /** the instruction; {option} is replaced with the writer's choice */
  prompt: string;
  /** a choice the writer makes first (tone, point of view…) */
  options?: string[];
}

export const AI_GROUPS: Record<AiGroup, string> = {
  write: "AI writing",
  fiction: "Fiction",
  nonfiction: "Nonfiction and teaching",
  explain: "Understand",
  chapter: "Chapter",
};

export const AI_ACTIONS: AiAction[] = [
  { id: "rewrite", label: "Rewrite", group: "write", needs: "selection", output: "replace", prompt: "Rewrite this passage so it reads better, keeping its meaning, length and voice." },
  { id: "shorten", label: "Shorten", group: "write", needs: "selection", output: "replace", prompt: "Make this passage about a third shorter without losing anything important." },
  { id: "expand", label: "Expand", group: "write", needs: "selection", output: "replace", prompt: "Expand this passage with more detail and depth, roughly doubling it, in the same voice." },
  { id: "grammar", label: "Fix grammar and spelling", group: "write", needs: "selection", output: "replace", prompt: "Fix grammar, spelling and punctuation only. Change nothing else." },
  { id: "clarity", label: "Make it clearer", group: "write", needs: "selection", output: "replace", prompt: "Make this passage clearer and easier to follow, keeping the voice." },
  { id: "repetition", label: "Remove repetition", group: "write", needs: "selection", output: "replace", prompt: "Remove repeated words, phrases and ideas while keeping everything that matters." },
  { id: "transitions", label: "Smooth the transitions", group: "write", needs: "selection", output: "replace", prompt: "Improve the transitions between sentences and paragraphs so the passage flows." },
  { id: "tone", label: "Change tone", group: "write", needs: "selection", output: "replace", prompt: "Rewrite this passage in a {option} tone, keeping its meaning.", options: ["warmer", "more formal", "more casual", "more confident", "gentler", "more playful"] },
  { id: "level", label: "Reading level", group: "write", needs: "selection", output: "replace", prompt: "Rewrite this passage for {option}, keeping its meaning.", options: ["young readers (about age 10)", "teenagers", "a general adult reader", "experts in the field"] },
  { id: "pov", label: "Point of view", group: "write", needs: "selection", output: "replace", prompt: "Rewrite this passage in the {option} point of view. Change nothing else.", options: ["first person", "second person", "third person limited", "third person omniscient"] },
  { id: "tense", label: "Tense", group: "write", needs: "selection", output: "replace", prompt: "Rewrite this passage in the {option} tense. Change nothing else.", options: ["past", "present", "future"] },
  { id: "word", label: "Find a better word", group: "write", needs: "selection", output: "note", prompt: "Suggest five better words or short phrases for this selection in its context, one per line starting with '- ', each with a few words on why." },
  { id: "continue", label: "Continue writing", group: "write", needs: "cursor", output: "after", prompt: "Continue the text from where it stops, in the author's voice. Write about 200 words of new prose only." },

  { id: "dialogue", label: "Improve dialogue", group: "fiction", needs: "selection", output: "replace", prompt: "Make the dialogue in this passage sharper and more natural, true to each character." },
  { id: "show", label: "Show, don't tell", group: "fiction", needs: "selection", output: "replace", prompt: "Rewrite this passage to show through action, detail and dialogue what it currently tells." },
  { id: "senses", label: "Add sensory details", group: "fiction", needs: "selection", output: "replace", prompt: "Add a few vivid sensory details (sight, sound, smell, touch, taste) without slowing the pace." },
  { id: "voice", label: "Strengthen character voice", group: "fiction", needs: "selection", output: "replace", prompt: "Make the character's voice in this passage more distinct and consistent." },
  { id: "consistency", label: "Check character consistency", group: "fiction", needs: "selection", output: "note", prompt: "Check whether the characters in this passage act and speak consistently with the rest of the chapter." },
  { id: "continuity", label: "Check continuity", group: "fiction", needs: "selection", output: "note", prompt: "Check this passage for continuity problems against the chapter: names, times, places, objects and facts." },
  { id: "pacing", label: "Improve pacing", group: "fiction", needs: "selection", output: "replace", prompt: "Adjust the pacing of this passage: tighten slow parts and give key moments room." },
  { id: "to_dialogue", label: "Turn narration into dialogue", group: "fiction", needs: "selection", output: "replace", prompt: "Turn this narration into a scene told mostly through dialogue." },
  { id: "scene", label: "Describe the scene", group: "fiction", needs: "selection", output: "after", prompt: "Write a short description of the setting of this moment, about 80 words, to go after it." },
  { id: "emotion", label: "Deepen the emotion", group: "fiction", needs: "selection", output: "replace", prompt: "Deepen the emotional impact of this passage without melodrama." },

  { id: "argument", label: "Summarise the argument", group: "nonfiction", needs: "selection", output: "note", prompt: "Summarise the argument of this passage in two or three sentences, then name its main claim." },
  { id: "strengthen", label: "Strengthen the explanation", group: "nonfiction", needs: "selection", output: "replace", prompt: "Make this explanation stronger: clearer steps, a concrete example where it helps." },
  { id: "claims", label: "Find unsupported claims", group: "nonfiction", needs: "selection", output: "note", prompt: "List the claims in this passage that need a source, an example or evidence." },
  { id: "examples", label: "Add examples", group: "nonfiction", needs: "selection", output: "after", prompt: "Write one or two short, concrete examples that illustrate this passage, to go after it." },
  { id: "exercise", label: "Create an exercise", group: "nonfiction", needs: "selection", output: "block", block: "exercise", prompt: "Write a short practical exercise that helps the reader apply this passage." },
  { id: "reflect", label: "Reflection questions", group: "nonfiction", needs: "selection", output: "block", block: "reflection", prompt: "Write three reflection questions about this passage, one per line starting with '- '." },
  { id: "quiz", label: "Create a quiz", group: "nonfiction", needs: "selection", output: "block", block: "quiz", prompt: "Write a three-question quiz on this passage. Put each question on its own line, then its answer on the next line starting with 'Answer: '." },
  { id: "checklist", label: "Turn into a checklist", group: "nonfiction", needs: "selection", output: "block", block: "checklist", prompt: "Turn this passage into a checklist of actions, one per line starting with '- '." },
  { id: "takeaways", label: "Key takeaways", group: "nonfiction", needs: "selection", output: "block", block: "takeaway", prompt: "Write the three key takeaways of this passage, one per line starting with '- '." },
  { id: "glossary", label: "Glossary entry", group: "nonfiction", needs: "selection", output: "block", block: "glossary_term", prompt: "Write a glossary entry for the selected term: the term on the first line, a one or two sentence definition on the next." },
  { id: "transition", label: "Write a chapter transition", group: "nonfiction", needs: "cursor", output: "after", prompt: "Write a short paragraph that closes this chapter and leads the reader into the next one." },

  { id: "explain", label: "Explain this", group: "explain", needs: "selection", output: "note", prompt: "Explain this passage simply, as if to a curious reader." },

  { id: "chapter_outline", label: "Outline this chapter", group: "chapter", needs: "chapter", output: "note", prompt: "Outline this chapter as it stands: a numbered list of its parts in order, each with its main point in one line." },
  { id: "chapter_summary", label: "Summarise this chapter", group: "chapter", needs: "chapter", output: "note", prompt: "Summarise this chapter in one paragraph of about 80 words, for the author's own notes." },
  { id: "chapter_continuity", label: "Continuity review", group: "chapter", needs: "chapter", output: "note", prompt: "Review this chapter for continuity: names, ages, dates, places, objects and facts that contradict each other within it. For each problem, quote both places." },
];

export const aiAction = (id: string) => AI_ACTIONS.find((a) => a.id === id) ?? null;

/** The instruction for an action, or null when the id or option is not one we offer. */
export function aiInstruction(id: string, option?: string | null): string | null {
  const a = aiAction(id);
  if (!a) return null;
  if (a.options) {
    if (!option || !a.options.includes(option)) return null;
    return a.prompt.replace("{option}", option);
  }
  return a.prompt;
}

/** How the answer must be shaped, so it can go straight into the book. */
export function aiFormatRule(a: AiAction): string {
  if (a.output === "note")
    return "Answer briefly in plain text. Short lines starting with '- ' are fine. Only point to problems you can quote from the text, and if there are none, say so plainly. Never invent problems or facts.";
  return "Reply with the new text only, ready to paste: no preamble, no notes, no quotation marks around it, no headings. Separate paragraphs with a blank line. Use *italic* and **bold** only where the author would. Never invent facts about real people or events.";
}

/* ---------- turning the answer into the book's blocks ---------- */

function inline(text: string): DocNode[] {
  const out: DocNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push({ type: "text", text: text.slice(last, m.index) });
    const bold = m[0].startsWith("**");
    out.push({ type: "text", text: m[0].slice(bold ? 2 : 1, bold ? -2 : -1), marks: [{ type: bold ? "bold" : "italic" }] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out.filter((n) => n.text);
}

const para = (t: string): DocNode => ({ type: "paragraph", content: inline(t) });

/** Plain text from the model as paragraphs and lists. */
export function textToDoc(text: string): DocNode[] {
  const out: DocNode[] = [];
  const clean = text.replace(/\r/g, "").trim();
  for (const chunk of clean.split(/\n\s*\n/)) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    let i = 0;
    while (i < lines.length) {
      const bullet = /^[-*•]\s+/;
      const num = /^\d+[.)]\s+/;
      if (bullet.test(lines[i]) || num.test(lines[i])) {
        const kind = bullet.test(lines[i]) ? bullet : num;
        const items: DocNode[] = [];
        while (i < lines.length && kind.test(lines[i])) items.push({ type: "listItem", content: [para(lines[i++].replace(kind, ""))] });
        out.push({ type: kind === bullet ? "bulletList" : "orderedList", content: items });
      } else {
        const run: string[] = [];
        while (i < lines.length && !bullet.test(lines[i]) && !num.test(lines[i])) run.push(lines[i++]);
        out.push(para(run.join(" ")));
      }
    }
  }
  return out.filter((n) => n.type !== "paragraph" || n.content?.length);
}

/** The answer without its *italic* and **bold** markers, for reading in the review card. */
export function plainMarks(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*\s][^*]*)\*/g, "$1");
}

/* ---------- showing what changed ---------- */

export interface DiffPart {
  text: string;
  kind: "same" | "add" | "del";
}

/** Word-level differences between the original and the suggestion. */
export function wordDiff(a: string, b: string): DiffPart[] {
  const x = a.split(/(\s+)/).filter(Boolean);
  const y = b.split(/(\s+)/).filter(Boolean);
  // past this size the table gets slow; show it as one swap instead
  if (x.length * y.length > 4_000_000) return [{ text: a, kind: "del" }, { text: b, kind: "add" }];
  const n = x.length;
  const m = y.length;
  const t = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) t[i][j] = x[i] === y[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  const out: DiffPart[] = [];
  const push = (text: string, kind: DiffPart["kind"]) => {
    const prev = out[out.length - 1];
    if (prev && prev.kind === kind) prev.text += text;
    else out.push({ text, kind });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) {
      push(x[i], "same");
      i++;
      j++;
    } else if (t[i + 1][j] >= t[i][j + 1]) push(x[i++], "del");
    else push(y[j++], "add");
  }
  while (i < n) push(x[i++], "del");
  while (j < m) push(y[j++], "add");
  return out;
}
