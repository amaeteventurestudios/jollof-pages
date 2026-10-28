import "server-only";
import path from "node:path";
import type { Memory } from "mem0ai/oss";
import { adminPb, isFree, type Caller } from "./credits";
import { seal, unseal } from "./secret-box";
import { PROVIDERS, PROVIDER_IDS, type AssistantSetup, type ChatTurn, type Provider } from "../assistant";

/**
 * The writing assistant's server side: each writer's provider, model and key; streaming replies from
 * Claude, ChatGPT or OpenRouter; and long-term memory through Mem0 (mem0ai, Apache-2.0).
 *
 * Mem0 extracts lasting facts from each exchange with the writer's own model and keeps them in a
 * SQLite vector store under ASSISTANT_DIR. Embeddings are made locally with FastEmbed, so memory
 * works whichever provider the writer picked, Claude included (Anthropic has no embeddings API).
 *
 * The publisher's own keys (ANTHROPIC_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY) are used only for
 * accounts listed in COVER_AI_FREE_EMAILS; everyone else brings their own key.
 */

interface SettingsRec {
  id: string;
  owner: string;
  provider: Provider | "";
  models: Partial<Record<Provider, string>> | null;
  keys: Partial<Record<Provider, string>> | null;
  memory: boolean;
}

const ENV_KEYS: Record<Provider, string> = { anthropic: "ANTHROPIC_API_KEY", openai: "OPENAI_API_KEY", openrouter: "OPENROUTER_API_KEY" };

function serverKeysFor(who: Caller): Provider[] {
  if (!isFree(who.email)) return [];
  return PROVIDER_IDS.filter((p) => !!process.env[ENV_KEYS[p]]);
}

async function settingsOf(userId: string): Promise<SettingsRec | null> {
  const pb = await adminPb();
  return pb
    .collection("ai_settings")
    .getFirstListItem<SettingsRec>(pb.filter("owner = {:u}", { u: userId }))
    .catch(() => null);
}

export async function setupFor(who: Caller): Promise<AssistantSetup> {
  const rec = await settingsOf(who.id);
  const serverKeys = serverKeysFor(who);
  const keys: AssistantSetup["keys"] = {};
  for (const p of PROVIDER_IDS) {
    const plain = rec?.keys?.[p] ? unseal(rec.keys[p]!) : null;
    if (plain) keys[p] = plain.slice(-4);
    else if (serverKeys.includes(p)) keys[p] = "server";
  }
  const provider = rec?.provider || serverKeys[0] || (Object.keys(keys)[0] as Provider | undefined) || null;
  return { provider, models: rec?.models ?? {}, keys, memory: rec ? rec.memory : true, serverKeys };
}

export async function saveSetup(who: Caller, patch: { provider?: Provider; model?: string; key?: string | null; memory?: boolean }): Promise<AssistantSetup> {
  const pb = await adminPb();
  const rec = await settingsOf(who.id);
  const provider = patch.provider ?? (rec?.provider || "anthropic");
  const models = { ...(rec?.models ?? {}) };
  const keys = { ...(rec?.keys ?? {}) };
  if (patch.model !== undefined) {
    if (patch.model.trim()) models[provider] = patch.model.trim().slice(0, 200);
    else delete models[provider];
  }
  if (patch.key === null) delete keys[provider];
  else if (patch.key !== undefined) keys[provider] = seal(patch.key.trim());
  const data = { owner: who.id, provider, models, keys, memory: patch.memory ?? rec?.memory ?? true };
  if (rec) await pb.collection("ai_settings").update(rec.id, data);
  else await pb.collection("ai_settings").create(data);
  return setupFor(who);
}

export interface Resolved {
  provider: Provider;
  model: string;
  key: string;
  memory: boolean;
}

/** The provider, model and key a request runs with, or a message saying what is missing. */
export async function resolve(who: Caller, provider?: Provider): Promise<Resolved | string> {
  const rec = await settingsOf(who.id);
  const p = provider ?? (rec?.provider || serverKeysFor(who)[0]);
  if (!p || !PROVIDERS[p]) return "Choose Claude, ChatGPT or OpenRouter in the assistant's settings first.";
  const own = rec?.keys?.[p] ? unseal(rec.keys[p]!) : null;
  const key = own || (serverKeysFor(who).includes(p) ? process.env[ENV_KEYS[p]]! : null);
  if (!key) return `Add your ${PROVIDERS[p].company} API key in the assistant's settings.`;
  return { provider: p, model: rec?.models?.[p] || PROVIDERS[p].defaultModel, key, memory: rec ? rec.memory : true };
}

/* ---------- providers ---------- */

// ASSISTANT_*_URL move a provider elsewhere, for a proxy or a test double
const ANTHROPIC_BASE = (process.env.ASSISTANT_ANTHROPIC_URL || "https://api.anthropic.com").replace(/\/$/, "");
const OPENAI_BASE: Record<Exclude<Provider, "anthropic">, string> = {
  openai: (process.env.ASSISTANT_OPENAI_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
  openrouter: (process.env.ASSISTANT_OPENROUTER_URL || "https://openrouter.ai/api/v1").replace(/\/$/, ""),
};

function openaiHeaders(r: { provider: Provider; key: string }): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Bearer ${r.key}`, "Content-Type": "application/json" };
  if (r.provider === "openrouter") {
    h["HTTP-Referer"] = "https://jollofpages.com";
    h["X-Title"] = "Jollof Pages";
  }
  return h;
}

/** A provider's error as a sentence a writer can act on. */
async function providerError(res: Response, r: Resolved): Promise<string> {
  const body = await res.text().catch(() => "");
  let detail = "";
  try {
    const j = JSON.parse(body) as { error?: { message?: string } | string; message?: string };
    detail = typeof j.error === "string" ? j.error : j.error?.message || j.message || "";
  } catch {
    detail = body.slice(0, 200);
  }
  const who = PROVIDERS[r.provider].company;
  if (res.status === 401 || res.status === 403) return `${who} did not accept the API key. Check it in the assistant's settings.`;
  if (res.status === 402) return `Your ${who} account is out of credit. Add credit on ${who}'s site and try again.`;
  if (res.status === 404) return `${who} does not offer the model "${r.model}" to this key. Pick another model in the settings.`;
  if (res.status === 429) return `${who} says too many requests right now. Wait a moment and try again.`;
  return `${who} returned an error${detail ? `: ${detail}` : ` (${res.status})`}.`;
}

/** Reads a server-sent event stream, calling `onData` with each event's JSON. */
async function readEvents(body: ReadableStream<Uint8Array>, onData: (data: string) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut: number;
    while ((cut = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, cut).trim();
      buffer = buffer.slice(cut + 1);
      if (line.startsWith("data:")) onData(line.slice(5).trim());
    }
  }
}

/**
 * Streams a reply as plain text chunks. Errors before the first word are thrown; errors part way
 * through end the stream with a note.
 */
export async function streamReply(r: Resolved, system: string, turns: ChatTurn[], signal?: AbortSignal): Promise<ReadableStream<string>> {
  let res: Response;
  if (r.provider === "anthropic") {
    res = await fetch(`${ANTHROPIC_BASE}/v1/messages`, {
      method: "POST",
      signal,
      headers: { "x-api-key": r.key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: r.model, max_tokens: 4096, system, messages: turns, stream: true }),
    });
  } else {
    res = await fetch(`${OPENAI_BASE[r.provider]}/chat/completions`, {
      method: "POST",
      signal,
      headers: openaiHeaders(r),
      body: JSON.stringify({ model: r.model, messages: [{ role: "system", content: system }, ...turns], stream: true }),
    });
  }
  if (!res.ok || !res.body) throw new Error(await providerError(res, r));
  const body = res.body;
  return new ReadableStream<string>({
    async start(controller) {
      try {
        await readEvents(body, (data) => {
          if (data === "[DONE]") return;
          let j: Record<string, unknown>;
          try {
            j = JSON.parse(data);
          } catch {
            return;
          }
          if (r.provider === "anthropic") {
            const delta = j.delta as { type?: string; text?: string } | undefined;
            if (j.type === "content_block_delta" && delta?.type === "text_delta" && delta.text) controller.enqueue(delta.text);
            if (j.type === "error") controller.enqueue(`\n\n[${(j.error as { message?: string })?.message ?? "The reply stopped early."}]`);
          } else {
            const text = (j.choices as { delta?: { content?: string } }[] | undefined)?.[0]?.delta?.content;
            if (text) controller.enqueue(text);
            if (j.error) controller.enqueue(`\n\n[${(j.error as { message?: string }).message ?? "The reply stopped early."}]`);
          }
        });
      } catch (e) {
        if (!signal?.aborted) controller.enqueue(`\n\n[The connection dropped: ${e instanceof Error ? e.message : String(e)}]`);
      }
      controller.close();
    },
  });
}

export interface ModelChoice {
  id: string;
  name: string;
}

/** The models a key can use, newest first where the provider says. */
export async function listModels(r: Pick<Resolved, "provider" | "key">): Promise<ModelChoice[]> {
  if (r.provider === "anthropic") {
    const res = await fetch(`${ANTHROPIC_BASE}/v1/models?limit=100`, { headers: { "x-api-key": r.key, "anthropic-version": "2023-06-01" } });
    if (!res.ok) throw new Error(await providerError(res, { ...r, model: "", memory: false }));
    const j = (await res.json()) as { data: { id: string; display_name?: string }[] };
    return j.data.map((m) => ({ id: m.id, name: m.display_name || m.id }));
  }
  const res = await fetch(`${OPENAI_BASE[r.provider]}/models`, { headers: openaiHeaders(r) });
  if (!res.ok) throw new Error(await providerError(res, { ...r, model: "", memory: false }));
  const j = (await res.json()) as { data: { id: string; name?: string; created?: number; architecture?: { output_modalities?: string[] } }[] };
  let list = j.data;
  if (r.provider === "openai") {
    list = list
      .filter((m) => /^(gpt|o\d|chatgpt)/.test(m.id) && !/(audio|realtime|image|tts|transcribe|search|embedding|instruct|codex)/.test(m.id))
      .sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
    return list.map((m) => ({ id: m.id, name: m.id }));
  }
  list = list.filter((m) => !m.architecture?.output_modalities || m.architecture.output_modalities.includes("text"));
  return [{ id: "openrouter/auto", name: "Auto (OpenRouter picks)" }, ...list.filter((m) => m.id !== "openrouter/auto").map((m) => ({ id: m.id, name: m.name || m.id }))];
}

/* ---------- memory (Mem0) ---------- */

const DIR = process.env.ASSISTANT_DIR || path.join(process.cwd(), ".assistant");
const memories = new Map<string, Promise<Memory>>();

/** One Mem0 instance per provider, model and key, so memory extraction runs on the writer's own account. */
async function memoryFor(r: Resolved): Promise<Memory> {
  const id = `${r.provider}:${r.key.slice(-12)}`;
  let m = memories.get(id);
  if (!m) {
    // read by mem0 when it loads: no usage reports leave the server
    process.env.MEM0_TELEMETRY = "false";
    m = import("mem0ai/oss").then(
      ({ Memory }) =>
        new Memory({
          version: "v1.1",
          embedder: { provider: "fastembed", config: { model: "fast-bge-small-en-v1.5" } },
          vectorStore: { provider: "memory", config: { collectionName: "jollof", dimension: 384, dbPath: path.join(DIR, "vectors.db") } },
          llm: {
            provider: r.provider === "anthropic" ? "anthropic" : "openai",
            config: { apiKey: r.key, model: PROVIDERS[r.provider].memoryModel, baseURL: r.provider === "anthropic" ? ANTHROPIC_BASE : OPENAI_BASE[r.provider] },
          },
          disableHistory: true,
          customInstructions:
            "You keep notes for an author's writing assistant. Keep lasting facts about the author and their books: book titles and premises, characters and their traits and relationships, settings, timeline, terminology, the author's voice, style and preferences, and decisions they made. Ignore small talk and one-off requests.",
        }),
    );
    if (memories.size > 50) memories.delete(memories.keys().next().value!);
    memories.set(id, m);
    m.catch(() => memories.delete(id));
  }
  return m;
}

const scope = (userId: string) => `jp-${userId}`;

/** What Mem0 remembers that bears on this request, as short lines. Empty when memory is off or fails. */
export async function recall(r: Resolved, userId: string, query: string): Promise<string[]> {
  if (!r.memory) return [];
  try {
    const mem = await memoryFor(r);
    const found = await mem.search(query.slice(0, 2000), { filters: { user_id: scope(userId) }, topK: 12 });
    return found.results.map((x) => x.memory).filter(Boolean);
  } catch (e) {
    console.error("assistant recall:", e);
    return [];
  }
}

/** Let Mem0 learn from one exchange. Runs after the reply is sent; failures only cost the memory. */
export async function remember(r: Resolved, userId: string, bookTitle: string, turns: ChatTurn[]): Promise<void> {
  if (!r.memory) return;
  try {
    const mem = await memoryFor(r);
    await mem.add([{ role: "user", content: `(Working on the book "${bookTitle}")` }, ...turns.map((t) => ({ role: t.role, content: t.content.slice(0, 6000) }))], {
      userId: scope(userId),
      metadata: { book: bookTitle },
    });
  } catch (e) {
    console.error("assistant remember:", e);
  }
}

export interface MemoryRow {
  id: string;
  memory: string;
  book?: string;
  updatedAt?: string;
}

/** Everything remembered about a writer, for the Memory view. Needs no key: listing makes no model calls. */
async function anyMemory(who: Caller): Promise<Memory | null> {
  const r = await resolve(who);
  if (typeof r !== "string") return memoryFor(r);
  // no usable key: open the store with a placeholder model that is never called
  return memoryFor({ provider: "openai", key: "list-only-placeholder", model: "", memory: true });
}

export async function listMemories(who: Caller): Promise<MemoryRow[]> {
  const mem = await anyMemory(who);
  if (!mem) return [];
  const all = await mem.getAll({ filters: { user_id: scope(who.id) }, topK: 500 });
  return all.results.map((x) => ({ id: x.id, memory: x.memory, book: x.metadata?.book as string | undefined, updatedAt: x.updatedAt || x.createdAt }));
}

export async function forget(who: Caller, id: string | "all"): Promise<void> {
  const mem = await anyMemory(who);
  if (!mem) return;
  const mine = await listMemories(who);
  for (const m of mine) if (id === "all" || m.id === id) await mem.delete(m.id);
}
