/**
 * The Insert menu and slash commands sort blocks by what the author wants to do, and find them
 * by everyday words ("/reader activity" finds the exercise).
 */
import { BLOCKS, type BlockDef } from "@/lib/blocks";

export type Intent = "popular" | "highlight" | "teach" | "story" | "design" | "references";

export const INTENTS: { id: Intent; label: string; blocks: string[] }[] = [
  { id: "popular", label: "Popular", blocks: ["note", "tip", "pull_quote", "exercise", "checklist", "ornament", "image_full", "letter", "chat", "key_idea", "table", "footnote"] },
  { id: "highlight", label: "Highlight something", blocks: ["note", "tip", "important", "warning", "key_idea", "did_you_know", "pull_quote", "stat", "takeaway", "summary_box", "sidebar", "fact_box"] },
  { id: "teach", label: "Teach your reader", blocks: ["exercise", "reflection", "journal_prompt", "checklist", "writing_lines", "quiz", "case_box", "action_step", "example", "definition", "summary_box", "takeaway"] },
  { id: "story", label: "Tell a story", blocks: ["chat", "group_chat", "letter", "email", "diary", "handwritten", "newspaper", "telegram", "poem", "lyrics", "script", "interview_qa", "social_post", "profile"] },
  { id: "design", label: "Design the page", blocks: ["ornament", "page_break", "spacer", "columns2", "columns3", "image_full", "image_left", "image_right", "overlay", "table", "ebook_only", "print_only"] },
  { id: "references", label: "References", blocks: ["footnote", "endnote", "link", "epigraph_quote", "blockquote", "scripture", "proverb", "glossary_term", "timeline_box", "recipe_card", "definition"] },
];

/** Everyday words for each block, beyond its name and description. */
const WORDS: Record<string, string> = {
  exercise: "reader activity practice task homework try this worksheet apply",
  reflection: "think ponder questions consider reader questions",
  journal_prompt: "write prompt journaling reader writing",
  checklist: "to do todo tick boxes steps list of actions",
  writing_lines: "blank lines fill in workbook handwriting space",
  quiz: "test questions answers check understanding",
  case_box: "story real example client case study",
  action_step: "do this next step call to action homework",
  note: "aside side note remark",
  tip: "hint advice pro tip trick",
  important: "must know key attention",
  warning: "caution danger careful alert",
  key_idea: "main point big idea core lesson",
  did_you_know: "fun fact trivia",
  definition: "meaning define term vocabulary",
  example: "for instance sample illustration",
  summary_box: "recap in short tldr summary",
  takeaway: "lesson remember key takeaway",
  pull_quote: "big quote highlight line callout quote",
  epigraph_quote: "quotation source attribution citation epigraph",
  proverb: "saying wisdom african proverb",
  scripture: "bible verse quran psalm",
  blockquote: "quote quotation indented",
  chat: "sms texting whatsapp imessage conversation phone",
  group_chat: "group whatsapp friends family chat",
  letter: "dear signed note correspondence",
  email: "inbox message mail",
  diary: "journal entry dated handwriting",
  handwritten: "note scribble handwriting sticky",
  newspaper: "news article headline clipping press",
  telegram: "stop urgent message old",
  poem: "verse poetry stanza",
  lyrics: "song music chorus",
  script: "screenplay play dialogue lines",
  interview_qa: "interview q and a questions answers",
  social_post: "tweet instagram post social media",
  profile: "character sheet bio person who",
  ornament: "scene break divider asterisks section break",
  page_break: "new page next page",
  spacer: "gap space blank breathing room",
  columns2: "side by side two columns layout",
  columns3: "three columns grid layout",
  table: "grid rows columns data spreadsheet",
  image_full: "photo picture image full width",
  image_left: "photo picture image beside text",
  image_right: "photo picture image beside text",
  overlay: "picture behind text banner hero",
  stat: "number statistic percent figure",
  timeline_box: "dates history chronology events",
  recipe_card: "ingredients method cooking food",
  glossary_term: "glossary term word meaning",
  sidebar: "box aside extra",
  fact_box: "facts figures at a glance",
  ebook_only: "kindle digital only link",
  print_only: "paperback printed only qr",
  footnote: "note reference source citation bottom",
  endnote: "note reference source citation end",
  link: "url web website store",
  emoji: "smiley icon face",
  bullets: "bullet list points",
  numbers: "numbered list steps order",
};

/** Blocks matching what the author typed, best first. Empty text gives the popular ones. */
export function searchBlocks(text: string, limit = 50): BlockDef[] {
  const q = text.trim().toLowerCase();
  const popular = INTENTS[0].blocks;
  if (!q) return popular.map((id) => BLOCKS.find((b) => b.id === id)).filter((b): b is BlockDef => !!b);
  const terms = q.split(/\s+/);
  const scored: { b: BlockDef; s: number }[] = [];
  for (const b of BLOCKS) {
    const label = b.label.toLowerCase();
    const hay = `${label} ${b.description.toLowerCase()} ${b.group.toLowerCase()} ${WORDS[b.id] ?? ""} ${b.id.replace(/_/g, " ")}`;
    let s = 0;
    for (const t of terms) {
      if (label.startsWith(t)) s += 6;
      else if (label.includes(t)) s += 4;
      else if (new RegExp(`\\b${t.replace(/[^\w]/g, "")}`).test(hay)) s += 2;
      else if (t.length > 2 && hay.includes(t)) s += 1;
    }
    // every word should count for something
    if (s && terms.every((t) => hay.includes(t))) s += 3;
    if (s) scored.push({ b, s: s + (popular.includes(b.id) ? 0.5 : 0) });
  }
  return scored
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.b);
}
