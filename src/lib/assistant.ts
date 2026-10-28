/** The writing assistant's providers and the requests it understands, shared by the studio and the server. */

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

/** What the studio is told about a person's setup. Keys never leave the server; only their last four characters do. */
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
  { id: "summary", label: "Summarize chapter", prompt: "Summarize this chapter in five bullet points." },
];

/** The chapter text sent along with a request, trimmed to keep requests affordable. */
export const CHAPTER_CHARS = 24000;
