"use client";

import { Extension } from "@tiptap/core";
import type { Mark, Node as PMNode } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { suggestionModePlugin, suggestionPluginKey, suggestionTransactionKey } from "prosemirror-suggestion-mode";

/**
 * Track changes. While it is on, prosemirror-suggestion-mode keeps what is typed as a marked
 * insertion and what is deleted as a marked deletion. Accepting and rejecting is done here, so a
 * deletion that spans paragraphs comes out cleanly either way.
 */

export interface Change {
  type: "insert" | "delete";
  username: string;
  userId: string;
  from: number;
  to: number;
  text: string;
}

const TYPES = { suggestion_insert: "insert", suggestion_delete: "delete" } as const;

function suggestionOf(marks: readonly Mark[]): Mark | undefined {
  return marks.find((m) => m.type.name in TYPES);
}

/** Every pending change, in document order. A run by one person continues across paragraph breaks. */
export function listChanges(doc: PMNode): Change[] {
  const out: Change[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText) return true;
    const mark = suggestionOf(node.marks);
    if (!mark) return false;
    const type = TYPES[mark.type.name as keyof typeof TYPES];
    const username = String(mark.attrs.username ?? "Someone");
    const prev = out[out.length - 1];
    const joins = prev && prev.type === type && prev.username === username && (prev.to === pos || /^\n*$/.test(doc.textBetween(prev.to, pos, "\n", "￼")));
    const text = (node.text ?? "").replace(/​/g, "");
    if (joins) {
      prev.text += (prev.to === pos ? "" : " ") + text;
      prev.to = pos + node.nodeSize;
    } else {
      out.push({ type, username, userId: String((mark.attrs.data as { userId?: string } | null)?.userId ?? ""), from: pos, to: pos + node.nodeSize, text });
    }
    return false;
  });
  return out;
}

/** Positions inside [from, to] of the paragraph-break stand-ins a deletion carries. */
function standIns(doc: PMNode, from: number, to: number): number[] {
  const at: number[] = [];
  doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isText || !node.marks.some((m) => m.type.name === "suggestion_delete")) return true;
    const text = node.text ?? "";
    for (let i = 0; i < text.length; i++) if (text[i] === "¶" || text[i] === "​") at.push(pos + i);
    return false;
  });
  return at;
}

export function resolveChangesIn(tr: Transaction, changes: Change[], accept: boolean) {
  const insert = tr.doc.type.schema.marks.suggestion_insert;
  const del = tr.doc.type.schema.marks.suggestion_delete;
  // from the end backwards, so earlier positions stay valid
  for (const c of [...changes].sort((a, b) => b.from - a.from)) {
    if (c.type === "insert") {
      if (accept) tr.removeMark(c.from, c.to, insert);
      else tr.delete(c.from, c.to);
    } else if (accept) {
      tr.delete(c.from, c.to);
    } else {
      const stands = standIns(tr.doc, c.from, c.to);
      for (const p of stands.reverse()) tr.delete(p, p + 1);
      tr.removeMark(c.from, c.to - stands.length, del);
    }
  }
  tr.setMeta(suggestionTransactionKey, { skipSuggestionOperation: true });
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    trackChanges: {
      setTrackChanges: (on: boolean) => ReturnType;
      resolveChanges: (changes: Change[], accept: boolean) => ReturnType;
      resolveAllChanges: (accept: boolean) => ReturnType;
    };
  }
}

export function trackChangesOn(state: EditorState): boolean {
  return !!suggestionPluginKey.getState(state)?.inSuggestionMode;
}

export const TrackChanges = Extension.create<{ enabled: boolean; username: string; userId: string }>({
  name: "trackChanges",
  addOptions() {
    return { enabled: false, username: "Someone", userId: "" };
  },
  addProseMirrorPlugins() {
    const plugin = suggestionModePlugin({ inSuggestionMode: this.options.enabled, username: this.options.username, data: { userId: this.options.userId }, hoverMenuOptions: { disabled: true } });
    const record = plugin.spec.appendTransaction!;
    // with its hover menu off the plugin's view() returns null, which ProseMirror cannot handle
    (plugin.spec as { view?: unknown }).view = undefined;
    // edits that arrive from co-writers are already marked (or meant to be plain); only this person's typing is recorded
    plugin.spec.appendTransaction = function (trs, oldState, newState) {
      if (trs.some((t) => t.getMeta("y-sync$"))) return null;
      return record.call(this, trs, oldState, newState);
    };
    return [plugin];
  },
  addCommands() {
    return {
      setTrackChanges:
        (on) =>
        ({ state, tr, dispatch }) => {
          const current = suggestionPluginKey.getState(state);
          if (!current) return false;
          if (dispatch) tr.setMeta(suggestionPluginKey, { ...current, inSuggestionMode: on });
          return true;
        },
      resolveChanges:
        (changes, accept) =>
        ({ tr, dispatch }) => {
          if (!changes.length) return false;
          if (dispatch) resolveChangesIn(tr, changes, accept);
          return true;
        },
      resolveAllChanges:
        (accept) =>
        ({ tr, dispatch }) => {
          const changes = listChanges(tr.doc);
          if (!changes.length) return false;
          if (dispatch) resolveChangesIn(tr, changes, accept);
          return true;
        },
    };
  },
});
