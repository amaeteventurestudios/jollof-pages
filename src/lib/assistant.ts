/** The writing assistant's providers and the requests it understands, shared by the Desk and the server. */

export type Provider = "anthropic" | "openai" | "openrouter";

export const PROVIDERS: Record<Provider, { label: string; company: string; keyUrl: string; keyHint: string; keyPattern: RegExp; defaultModel: string; memoryModel: string }> = {
  anthropic: {
    label: "Claude",
    company: "Anthropic",
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyHint: "starts with sk-ant-",
    keyPattern: /^sk-ant-[\w-]{20,}$/,
    defaultModel: "claude-sonnet-5-5",
    memoryModel: "claude-haiku-5-5",
  },
  openai: {
    label: "ChatGPT",
    company: "OpenAI",
    keyUrl: "https://platform.openai.com/api-keys",
    keyHint: "starts with sk-",
    keyPattern: /^sk-[\w-]{20,}$/,
    defaultModel: "gpt-5",
    memoryModel: "gpt-5-mini",
  },
  openrouter: {
    label: "OpenRouter",
    company: "OpenRouter",
    keyUrl: "https://openrouter.ai/settings/keys",
    keyHint: "starts with sk-or-",
    keyPattern: /^sk-or-[\w-]{20,}$/,
    // OpenRouter picks a suitable model per request unless the writer chooses one
    defaultModel: "openrouter/auto",
    memoryModel: "openrouter/auto",
  },
};

export const PROVIDER_IDS = Object.keys(PROVIDERS) as Provider[];

/** What the Desk is told about a person's setup. Keys never leave the server; only their last four characters do. */
export interface AssistantSetup {
  provider: Provider | null;
  models: Partial<Record<Provider, string>>;
  /** last four characters of each saved key, or "server" when the publisher's own key is used */
  keys: Partial<Record<Provider, string>>;
  memory: boolean;
  /** this account may use the publisher's keys */
  serverKeys: Provider[];
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Ready-made requests shown as buttons. "selection" ones need selected text. */
export const QUICK_ASKS: { id: string; label: string; needs?: "selection"; prompt: string }[] = [
  { id: "continue", label: "Continue writing", prompt: "Continue this chapter from where it stops, in my voice. Write about 250 words of new prose only, with no commentary." },
  {
    id: "rewrite",
    label: "Rewrite selection",
    needs: "selection",
    prompt: "Rewrite the selected passage so it reads more clearly and vividly, keeping my voice and meaning. Give only the new passage.",
  },
  { id: "shorter", label: "Tighten selection", needs: "selection", prompt: "Tighten the selected passage: cut what is not needed, keep the meaning and voice. Give only the new passage." },
  { id: "ideas", label: "Brainstorm next", prompt: "Give me five distinct ideas for what could happen or be covered next, one or two sentences each." },
  {
    id: "check",
    label: "Check consistency",
    prompt: "Read this chapter against what you know about the book and point out any inconsistencies in names, facts, timeline or tone. Be specific and brief.",
  },
  { id: "outline", label: "Outline chapter", prompt: "Suggest an outline for this chapter: the main sections or scenes in order, one line each, building on what is already written." },
  { id: "summary", label: "Summarize chapter", prompt: "Summarize this chapter in five bullet points." },
];

/** The chapter text sent along with a request, trimmed to keep requests affordable. */
export const CHAPTER_CHARS = 24000;

/**
 * One-click suggestions around the Desk (new book, details, cover, outline). Each asks for a short
 * list the writer picks from; nothing is changed until they pick.
 */
export type SuggestKind = "title" | "subtitle" | "penname" | "pitch" | "description" | "keywords" | "categories" | "cover" | "outline";

export const SUGGEST: Record<SuggestKind, { label: string; count: number; ask: string }> = {
  title: { label: "titles", count: 6, ask: "Suggest 6 distinct, memorable book titles. Each under 8 words, no subtitle." },
  subtitle: {
    label: "subtitles",
    count: 5,
    ask: "Suggest 5 subtitles. For non-fiction, say who it is for and the result it promises, using words readers search for. For fiction, a short evocative tagline. Under 15 words each.",
  },
  penname: {
    label: "pen names",
    count: 6,
    ask: "Suggest 6 pen names that suit this book's genre and audience. Believable first and last names, easy to spell and search, not names of famous authors.",
  },
  pitch: { label: "hooks", count: 4, ask: "Write 4 one-line hooks for this book, about 20 words each, that make a browser want to read it." },
  description: {
    label: "descriptions",
    count: 2,
    ask: "Write 2 different book descriptions (blurbs) for the store page, 150 to 220 words each. Open with a strong hook, keep paragraphs short, end with a call to read. Separate paragraphs with a blank line. Plain text, no headings or markdown.",
  },
  keywords: {
    label: "keywords",
    count: 7,
    ask: "Suggest 7 Amazon KDP keyword phrases (2 to 5 words each, under 50 characters) that real readers would type to find this book. Don't repeat words from the title, don't use other authors' names or brand names.",
  },
  categories: { label: "categories", count: 3, ask: "Suggest 3 Amazon book categories that fit, each written as a path like 'Business & Money > Entrepreneurship'." },
  cover: {
    label: "cover ideas",
    count: 3,
    ask: "Suggest 3 different ideas for the front cover picture. In one or two sentences each, describe the scene or subject, the mood and the composition, the way a cover designer would brief an illustrator. No text or lettering in the picture.",
  },
  outline: { label: "chapter titles", count: 12, ask: "Suggest a chapter outline: 12 chapter titles in reading order that build on each other. Titles only, without numbers." },
};

/** The list in a model's answer: a JSON array when it gave one, otherwise one item per line. */
export function parseList(text: string, count: number): string[] {
  const clean = (s: string) =>
    s
      .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")
      .replace(/^["“]([\s\S]*)["”]$/, "$1")
      .trim();
  const m = text.match(/\[[\s\S]*\]/);
  if (m) {
    try {
      const arr = JSON.parse(m[0]) as unknown[];
      const items = arr.map((x) => clean(String(x))).filter(Boolean);
      if (items.length) return items.slice(0, count);
    } catch {
      // not JSON after all: fall through to lines
    }
  }
  return text
    .split("\n")
    .map(clean)
    .filter((l) => l && !/^```/.test(l))
    .slice(0, count);
}
