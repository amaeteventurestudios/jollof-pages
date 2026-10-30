"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { ArrowUp, Brain, Check, Copy, ExternalLink, KeyRound, Loader2, Settings2, Sparkles, Square, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorMessage, pb } from "@/lib/pb";
import { PROVIDERS, PROVIDER_IDS, QUICK_ASKS, type AssistantSetup, type Provider } from "@/lib/assistant";
import type { CollabRole } from "@/lib/collab";
import { cn } from "@/lib/utils";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
}

const auth = () => ({ Authorization: pb().authStore.token });

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...auth(), ...init?.headers } });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status}).`);
  return body;
}

/** Text from the assistant as paragraphs for the manuscript. */
function toParagraphs(text: string) {
  return text
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean)
    .map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] }));
}

/**
 * The writing assistant, in the Write tab's tool rail: a conversation about the book with the
 * writer's chosen model (Claude, ChatGPT or OpenRouter), that can write into the chapter.
 */
export function AssistantPanel({ editor, bookId, chapterId, role }: { editor: Editor | null; bookId: string; chapterId: string | null; role: CollabRole }) {
  const [setup, setSetup] = useState<AssistantSetup | null>(null);
  const [view, setView] = useState<"chat" | "settings" | "memory">("chat");
  const [error, setError] = useState("");

  useEffect(() => {
    api<AssistantSetup>("/api/assistant/settings")
      .then((s) => {
        setSetup(s);
        if (!s.provider || !s.keys[s.provider]) setView("settings");
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);

  if (error && !setup) return <p className="text-sm text-destructive">{error}</p>;
  if (!setup)
    return (
      <p className="text-sm text-soft" role="status">
        Loading the assistant…
      </p>
    );
  const ready = !!setup.provider && !!setup.keys[setup.provider];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center gap-1">
        <span className="min-w-0 flex-1 truncate text-[13px] text-soft">
          {ready ? (
            <>
              <Sparkles className="mr-1 inline size-3.5 text-primary" />
              {PROVIDERS[setup.provider!].label} · {setup.models[setup.provider!] || PROVIDERS[setup.provider!].defaultModel}
            </>
          ) : (
            "Not set up yet"
          )}
        </span>
        {(["chat", "memory", "settings"] as const).map((v) => {
          const Icon = v === "chat" ? Sparkles : v === "memory" ? Brain : Settings2;
          const label = v === "chat" ? "Conversation" : v === "memory" ? "What it remembers" : "Assistant settings";
          return (
            <Button
              key={v}
              size="icon-sm"
              variant="ghost"
              aria-label={label}
              title={label}
              aria-pressed={view === v}
              disabled={v !== "settings" && !ready}
              onClick={() => setView(v)}
              className={cn(view === v && "bg-primary-soft text-primary")}
            >
              <Icon />
            </Button>
          );
        })}
      </div>
      {view === "settings" && <SettingsView setup={setup} onSetup={setSetup} onDone={() => setView("chat")} />}
      {view === "memory" && ready && <MemoryView memoryOn={setup.memory} />}
      {view === "chat" && ready && <ChatView editor={editor} bookId={bookId} chapterId={chapterId} canWrite={role !== "commenter"} />}
    </div>
  );
}

/* ---------- conversation ---------- */

function ChatView({ editor, bookId, chapterId, canWrite }: { editor: Editor | null; bookId: string; chapterId: string | null; canWrite: boolean }) {
  const [messages, setMessages] = useState<Msg[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const me = pb().authStore.record?.id ?? "";
    pb()
      .collection("assistant_messages")
      .getList<Msg>(1, 60, { filter: pb().filter("owner = {:u} && book = {:b}", { u: me, b: bookId }), sort: "-created" })
      .then((r) => setMessages(r.items.reverse()))
      .catch(() => setMessages([]));
  }, [bookId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const selectionNow = useCallback(() => {
    if (!editor || editor.state.selection.empty) return "";
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, "\n\n");
  }, [editor]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setError("");
    setBusy(true);
    setDraft("");
    const mine: Msg = { id: `local-${Date.now()}`, role: "user", content: message };
    const reply: Msg = { id: `local-${Date.now()}-r`, role: "assistant", content: "" };
    setMessages((m) => [...(m ?? []), mine, reply]);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", ...auth() },
        body: JSON.stringify({ bookId, chapterId, message, selection: selectionNow() }),
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `The assistant could not answer (${res.status}).`);
      }
      const model = decodeURIComponent(res.headers.get("X-Model") || "");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setMessages((m) => (m ?? []).map((x) => (x.id === reply.id ? { ...x, content: text, model } : x)));
      }
    } catch (e) {
      if (!ctrl.signal.aborted) {
        setError(errorMessage(e));
        setMessages((m) => (m ?? []).filter((x) => x.id !== reply.id || x.content));
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  async function clear() {
    if (!messages?.length || !confirm("Clear this conversation? What the assistant remembers is kept.")) return;
    const saved = messages.filter((m) => !m.id.startsWith("local-"));
    setMessages([]);
    await Promise.all(
      saved.map((m) =>
        pb()
          .collection("assistant_messages")
          .delete(m.id)
          .catch(() => undefined),
      ),
    );
  }

  const hasSelection = !!editor && !editor.state.selection.empty;

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {messages === null ? (
          <p className="text-sm text-soft">Loading…</p>
        ) : !messages.length ? (
          <div className="grid gap-3 text-sm text-ink-2">
            <p>Ask about this book, or pick a starting point. The assistant reads the open chapter and any words you select.</p>
          </div>
        ) : (
          <ol className="grid gap-3 pb-2">
            {messages.map((m, i) => (
              <li key={m.id} className={cn("text-sm", m.role === "user" ? "ml-6 bg-primary-soft px-3 py-2 text-ink" : "")}>
                {m.role === "assistant" ? (
                  <AssistantReply msg={m} editor={editor} canWrite={canWrite} streaming={busy && i === messages.length - 1} />
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </li>
            ))}
          </ol>
        )}
        <div ref={endRef} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-1.5">
        {QUICK_ASKS.filter((q) => (q.needs !== "selection" || hasSelection) && (canWrite || (q.id !== "continue" && q.needs !== "selection"))).map((q) => (
          <button
            key={q.id}
            type="button"
            disabled={busy}
            onClick={() => send(q.prompt)}
            className="border border-border px-2 py-1 text-[12px] text-ink-2 hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {q.label}
          </button>
        ))}
        {!!messages?.length && (
          <button type="button" onClick={clear} className="ml-auto px-1 py-1 text-[12px] text-soft hover:text-destructive" title="Clear conversation">
            Clear
          </button>
        )}
      </div>
      <form
        className="relative"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(draft);
            }
          }}
          rows={3}
          placeholder={hasSelection ? "Ask about the selected words…" : "Ask the assistant…"}
          aria-label="Message the assistant"
          className="w-full resize-none border border-input bg-card px-3 py-2 pr-11 text-sm focus-visible:outline-2 focus-visible:outline-ring"
        />
        {busy ? (
          <Button type="button" size="icon-sm" variant="outline" aria-label="Stop" className="absolute right-2 bottom-3" onClick={() => abortRef.current?.abort()}>
            <Square />
          </Button>
        ) : (
          <Button type="submit" size="icon-sm" aria-label="Send" className="absolute right-2 bottom-3" disabled={!draft.trim()}>
            <ArrowUp />
          </Button>
        )}
      </form>
    </>
  );
}

function AssistantReply({ msg, editor, canWrite, streaming }: { msg: Msg; editor: Editor | null; canWrite: boolean; streaming: boolean }) {
  const [done, setDone] = useState("");
  const flash = (s: string) => {
    setDone(s);
    setTimeout(() => setDone(""), 1800);
  };
  const usable = !!editor && canWrite && !streaming && !!msg.content.trim();
  const selection = !!editor && !editor.state.selection.empty;
  return (
    <div className="border-l-2 border-primary/40 pl-3">
      {!msg.content && streaming ? (
        <p className="flex items-center gap-2 text-soft">
          <Loader2 className="size-3.5 animate-spin" /> Thinking…
        </p>
      ) : (
        <p className="whitespace-pre-wrap text-ink">{msg.content}</p>
      )}
      {!streaming && msg.content && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {usable && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={() => {
                  // after the paragraph the cursor is in, never splitting it
                  const { $to } = editor!.state.selection;
                  editor!
                    .chain()
                    .focus()
                    .insertContentAt($to.depth ? $to.after(1) : $to.pos, toParagraphs(msg.content))
                    .run();
                  flash("Inserted");
                }}
              >
                Insert
              </Button>
              {selection && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={() => {
                    const { from, to } = editor!.state.selection;
                    editor!.chain().focus().insertContentAt({ from, to }, toParagraphs(msg.content)).run();
                    flash("Replaced");
                  }}
                >
                  Replace selection
                </Button>
              )}
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={async () => {
              await navigator.clipboard.writeText(msg.content).catch(() => undefined);
              flash("Copied");
            }}
          >
            <Copy /> Copy
          </Button>
          {done && (
            <span className="flex items-center gap-1 text-xs text-ok">
              <Check className="size-3.5" /> {done}
            </span>
          )}
          {msg.model && <span className="ml-auto truncate text-[11px] text-soft">{msg.model}</span>}
        </div>
      )}
    </div>
  );
}

/* ---------- settings ---------- */

export function SettingsView({ setup, onSetup, onDone }: { setup: AssistantSetup; onSetup: (s: AssistantSetup) => void; onDone?: () => void }) {
  const [provider, setProvider] = useState<Provider>(setup.provider ?? "anthropic");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fetched, setFetched] = useState<{ provider: Provider; list: { id: string; name: string }[] } | null>(null);
  const models = fetched?.provider === provider ? fetched.list : null;
  const info = PROVIDERS[provider];
  const saved = setup.keys[provider];

  useEffect(() => {
    if (!setup.keys[provider]) return;
    api<{ models: { id: string; name: string }[] }>(`/api/assistant/models?provider=${provider}`)
      .then((r) => setFetched({ provider, list: r.models }))
      .catch(() => setFetched({ provider, list: [] }));
  }, [provider, setup.keys]);

  async function save(patch: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const next = await api<AssistantSetup>("/api/assistant/settings", { method: "POST", body: JSON.stringify({ provider, ...patch }) });
      onSetup(next);
      setKey("");
      return next;
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const model = setup.models[provider] || "";

  return (
    <div className="grid gap-4 overflow-y-auto text-sm">
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 font-medium">Which AI writes with you</legend>
        {PROVIDER_IDS.map((p) => (
          <label key={p} className={cn("flex cursor-pointer items-center gap-3 border p-3", provider === p ? "border-primary bg-primary-soft/50" : "border-border hover:bg-paper")}>
            <input
              type="radio"
              name="ai-provider"
              className="accent-[var(--primary)]"
              checked={provider === p}
              onChange={() => {
                setProvider(p);
                setError("");
                // switching to a provider that already has a key makes it the active one
                if (setup.keys[p]) void save({ provider: p });
              }}
            />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{PROVIDERS[p].label}</span>
              <span className="block text-[12px] text-soft">{PROVIDERS[p].company}</span>
            </span>
            {setup.keys[p] && (
              <span className="flex items-center gap-1 text-[12px] text-ok">
                <KeyRound className="size-3.5" />
                {setup.keys[p] === "server" ? "Publisher key" : `…${setup.keys[p]}`}
              </span>
            )}
          </label>
        ))}
      </fieldset>

      <div className="grid gap-2 border border-border p-3">
        <p className="font-medium">{info.company} API key</p>
        {saved ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] text-ink-2">{saved === "server" ? "Using the publisher's key on this account." : `Saved, ending in …${saved}.`}</span>
            {saved !== "server" && (
              <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={() => confirm(`Remove your ${info.company} key?`) && save({ removeKey: true })}>
                <Trash2 /> Remove
              </Button>
            )}
          </div>
        ) : (
          <ol className="grid list-decimal gap-1 pl-4 text-[13px] text-ink-2">
            <li>
              Open{" "}
              <a href={info.keyUrl} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
                {info.keyUrl.replace("https://", "")}
                <ExternalLink className="ml-0.5 inline size-3" />
              </a>{" "}
              and sign in.
            </li>
            <li>Create a new key and copy it. It {info.keyHint}.</li>
            <li>Paste it below. Usage is billed by {info.company} to your account.</li>
          </ol>
        )}
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const next = await save({ key });
            if (next?.keys[provider]) onDone?.();
          }}
        >
          <Input
            type="password"
            autoComplete="off"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={saved ? "Paste a new key to replace it" : "Paste your key"}
            aria-label={`${info.company} API key`}
          />
          <Button type="submit" disabled={busy || !key.trim()}>
            {busy ? <Loader2 className="animate-spin" /> : "Save"}
          </Button>
        </form>
        <p className="text-[12px] text-soft">Keys are stored encrypted and never shown again or shared.</p>
      </div>

      {saved && (
        <label className="grid gap-1.5">
          <span className="font-medium">Model</span>
          {models === null ? (
            <span className="text-[13px] text-soft">Loading {info.company}&apos;s models…</span>
          ) : (
            <>
              <input
                list={`models-${provider}`}
                defaultValue={model}
                key={`${provider}-${model}`}
                placeholder={`Default: ${info.defaultModel}`}
                onBlur={(e) => e.target.value !== model && save({ model: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                className="h-9 border border-input bg-card px-2"
                aria-label="Model"
              />
              <datalist id={`models-${provider}`}>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </datalist>
              <span className="text-[12px] text-soft">
                {models.length ? `${models.length} models available to your key. Leave empty for the default.` : "Type a model name, or leave empty for the default."}
              </span>
            </>
          )}
        </label>
      )}

      <label className="flex cursor-pointer items-start gap-2.5">
        <input type="checkbox" className="mt-1 size-4 accent-[var(--primary)]" checked={setup.memory} disabled={busy} onChange={(e) => save({ memory: e.target.checked })} />
        <span>
          <span className="block font-medium">Remember between sessions</span>
          <span className="block text-[13px] text-soft">
            Keeps lasting facts, such as characters, settings and your style, so you don&apos;t repeat yourself. You can see and delete them any time.
          </span>
        </span>
      </label>

      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {onDone && setup.provider && setup.keys[setup.provider] && (
        <Button variant="outline" onClick={onDone}>
          Back to the conversation
        </Button>
      )}
    </div>
  );
}

/* ---------- memory ---------- */

export function MemoryView({ memoryOn }: { memoryOn: boolean }) {
  const [rows, setRows] = useState<{ id: string; memory: string; book?: string }[] | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    api<{ memories: { id: string; memory: string; book?: string }[] }>("/api/assistant/memory")
      .then((r) => setRows(r.memories))
      .catch((e) => {
        setError(errorMessage(e));
        setRows([]);
      });
  }, []);
  useEffect(load, [load]);

  async function forget(id: string) {
    setRows((r) => (id === "all" ? [] : (r ?? []).filter((x) => x.id !== id)));
    await api(`/api/assistant/memory?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch((e) => setError(errorMessage(e)));
  }

  return (
    <div className="grid min-h-0 gap-3 overflow-y-auto text-sm">
      <p className="text-[13px] text-soft">
        {memoryOn ? "What the assistant has learned about you and your books. Delete anything that is wrong or private." : "Memory is off in the settings, so nothing new is being kept."}
      </p>
      {error && <p className="text-destructive">{error}</p>}
      {rows === null ? (
        <p className="text-soft">Loading…</p>
      ) : !rows.length ? (
        <p className="text-soft">Nothing remembered yet. It learns as you talk to it.</p>
      ) : (
        <>
          <ul className="grid gap-1.5">
            {rows.map((m) => (
              <li key={m.id} className="group flex items-start gap-2 border border-border bg-card px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block">{m.memory}</span>
                  {m.book && <span className="block text-[12px] text-soft">{m.book}</span>}
                </span>
                <button type="button" aria-label="Forget this" title="Forget this" onClick={() => forget(m.id)} className="text-soft hover:text-destructive">
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          <Button variant="ghost" className="text-destructive" onClick={() => confirm("Forget everything the assistant remembers about you?") && forget("all")}>
            <Trash2 /> Forget everything
          </Button>
        </>
      )}
    </div>
  );
}
