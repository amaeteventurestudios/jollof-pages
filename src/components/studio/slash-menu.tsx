"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor, Range } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { Suggestion, exitSuggestion, type SuggestionProps } from "@tiptap/suggestion";
import { searchBlocks } from "@/lib/block-intents";
import type { BlockDef } from "@/lib/blocks";
import { BlockIcon } from "./insert-block";
import { useBlockLibrary, type SavedBlock } from "./block-library";
import { cn } from "@/lib/utils";

type Item = { kind: "block"; b: BlockDef } | { kind: "saved"; b: SavedBlock };

const slashKey = new PluginKey("jpSlash");

/** Ask the toolbar to insert a catalog block (it owns the dialogs some blocks need first). */
export function pickBlock(editor: Editor, id: string) {
  editor.view.dom.dispatchEvent(new CustomEvent("jp-pick", { detail: id }));
}

export function insertSaved(editor: Editor, b: SavedBlock) {
  try {
    editor.chain().focus().insertContent(b.content).run();
  } catch {
    // a saved block from an older version the editor no longer understands
  }
}

/**
 * Type / on the page to insert a block by name or by plain words: "/quote", "/break",
 * "/reader activity". Saved blocks come first when their name matches.
 */
export function SlashMenu({ editor }: { editor: Editor }) {
  const lib = useBlockLibrary();
  const [s, setS] = useState<SuggestionProps<Item> | null>(null);
  const [index, setIndex] = useState(0);
  const saved = useRef<SavedBlock[]>([]);
  const used = useRef(lib.used);
  const keys = useRef<(e: KeyboardEvent) => boolean>(() => false);
  useEffect(() => {
    saved.current = lib.saved ?? [];
    used.current = lib.used;
  });

  useEffect(() => {
    const plugin = Suggestion<Item>({
      editor,
      char: "/",
      pluginKey: slashKey,
      allowSpaces: true,
      allow: ({ state, range }) => {
        const $from = state.doc.resolve(range.from);
        return $from.parent.type.name === "paragraph";
      },
      items: ({ query }) => {
        const q = query.toLowerCase().trim();
        // a long run of words with nothing found is just a sentence with a slash in it
        if (q.split(/\s+/).length > 4) return [];
        const mine = saved.current.filter((b) => !q || b.name.toLowerCase().includes(q)).slice(0, 3);
        return [...mine.map((b) => ({ kind: "saved" as const, b })), ...searchBlocks(q, 8).map((b) => ({ kind: "block" as const, b }))];
      },
      command: ({ editor: e, range, props }: { editor: Editor; range: Range; props: Item }) => {
        e.chain().focus().deleteRange(range).run();
        if (props.kind === "saved") {
          used.current(`saved:${props.b.id}`);
          insertSaved(e, props.b);
        } else {
          used.current(props.b.id);
          pickBlock(e, props.b.id);
        }
      },
      render: () => ({
        onStart: (p) => {
          setIndex(0);
          setS(p);
        },
        onUpdate: (p) => {
          setIndex(0);
          setS(p);
        },
        onExit: () => setS(null),
        onKeyDown: ({ event }) => keys.current(event),
      }),
    });
    // first in line, so Enter and the arrows reach the menu before the editor acts on them
    editor.registerPlugin(plugin, (p, all) => [p, ...all]);
    return () => {
      editor.unregisterPlugin(slashKey);
    };
  }, [editor]);

  useEffect(() => {
    keys.current = (e) => {
      if (!s || !s.items.length) return false;
      if (e.key === "ArrowDown") {
        setIndex((i) => (i + 1) % s.items.length);
        return true;
      }
      if (e.key === "ArrowUp") {
        setIndex((i) => (i - 1 + s.items.length) % s.items.length);
        return true;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        s.command(s.items[Math.min(index, s.items.length - 1)]);
        return true;
      }
      if (e.key === "Escape") {
        exitSuggestion(editor.view, slashKey);
        return true;
      }
      return false;
    };
  });

  if (!s || !s.items.length) return null;
  const rect = s.clientRect?.();
  if (!rect) return null;
  const below = rect.bottom + 320 < window.innerHeight;
  return createPortal(
    <div
      role="listbox"
      aria-label="Insert a block"
      className="fixed z-50 w-80 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl"
      style={{ left: Math.min(rect.left, window.innerWidth - 336), ...(below ? { top: rect.bottom + 6 } : { bottom: window.innerHeight - rect.top + 6 }) }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <p className="border-b border-border px-3 py-1.5 text-xs text-muted-foreground">{s.query ? `Blocks for “${s.query}”` : "Insert a block: keep typing to search"}</p>
      <ul className="max-h-72 overflow-y-auto p-1">
        {s.items.map((it, i) => (
          <li key={it.kind + it.b.id} role="option" aria-selected={i === index}>
            <button
              type="button"
              onMouseEnter={() => setIndex(i)}
              onClick={() => s.command(it)}
              className={cn("flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left", i === index && "bg-muted")}
            >
              <span className="grid size-7 shrink-0 place-items-center rounded bg-primary-soft text-primary">
                <BlockIcon name={it.kind === "saved" ? "Bookmark" : it.b.icon} className="size-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm">{it.kind === "saved" ? it.b.name : it.b.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{it.kind === "saved" ? "Your saved block" : it.b.description}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">↑↓ to choose · Enter to insert · Esc to close</p>
    </div>,
    document.body,
  );
}
