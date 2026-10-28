"use client";

import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/**
 * Comments point at words, not at positions: each keeps its quoted text and a little context either
 * side, and is found again in the chapter by searching for them. Nothing is stored in the manuscript,
 * so comments never reach an export and commenters never change the text.
 */

export interface CommentAnchor {
  id: string;
  quote: string;
  prefix: string;
  suffix: string;
  resolved?: boolean;
}

interface TextIndex {
  text: string;
  /** document position of each character; -1 for the break between paragraphs */
  pos: number[];
}

export function indexText(doc: PMNode): TextIndex {
  let text = "";
  const pos: number[] = [];
  doc.descendants((node, at) => {
    if (!node.isTextblock) return true;
    if (text) {
      text += "\n";
      pos.push(-1);
    }
    const t = node.textBetween(0, node.content.size, undefined, "￼");
    for (let i = 0; i < t.length; i++) pos.push(at + 1 + i);
    text += t;
    return false;
  });
  return { text, pos };
}

const CONTEXT = 32;

/** The anchor for a selection, or null when it holds no text. */
export function anchorFor(doc: PMNode, from: number, to: number): Omit<CommentAnchor, "id"> | null {
  const idx = indexText(doc);
  const start = idx.pos.findIndex((p) => p >= from);
  let end = -1;
  for (let i = idx.pos.length - 1; i >= 0; i--)
    if (idx.pos[i] !== -1 && idx.pos[i] < to) {
      end = i + 1;
      break;
    }
  if (start < 0 || end <= start) return null;
  const quote = idx.text.slice(start, end);
  if (!quote.trim()) return null;
  return { quote: quote.slice(0, 2000), prefix: idx.text.slice(Math.max(0, start - CONTEXT), start), suffix: idx.text.slice(end, end + CONTEXT) };
}

function overlap(a: string, b: string, fromEnd: boolean): number {
  let n = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 1; i <= len; i++) {
    const x = fromEnd ? a[a.length - i] : a[i - 1];
    const y = fromEnd ? b[b.length - i] : b[i - 1];
    if (x !== y) break;
    n++;
  }
  return n;
}

/** Where an anchor's words are now, choosing the occurrence whose surroundings match best. */
export function locate(idx: TextIndex, a: Omit<CommentAnchor, "id">): { from: number; to: number } | null {
  if (!a.quote) return null;
  let best = -1;
  let score = -1;
  for (let at = idx.text.indexOf(a.quote); at >= 0; at = idx.text.indexOf(a.quote, at + 1)) {
    const s = overlap(idx.text.slice(Math.max(0, at - a.prefix.length), at), a.prefix, true) + overlap(idx.text.slice(at + a.quote.length, at + a.quote.length + a.suffix.length), a.suffix, false);
    if (s > score) {
      score = s;
      best = at;
    }
  }
  if (best < 0) return null;
  const first = idx.pos.slice(best, best + a.quote.length).find((p) => p >= 0);
  const lastIdx = [...idx.pos.slice(best, best + a.quote.length)].reverse().find((p) => p >= 0);
  if (first === undefined || lastIdx === undefined) return null;
  return { from: first, to: lastIdx + 1 };
}

interface CommentsState {
  comments: CommentAnchor[];
  active: string | null;
  decos: DecorationSet;
}

export const commentsKey = new PluginKey<CommentsState>("jp-comments");

function build(doc: PMNode, comments: CommentAnchor[], active: string | null): DecorationSet {
  const idx = indexText(doc);
  const decos: Decoration[] = [];
  for (const c of comments) {
    if (c.resolved) continue;
    const at = locate(idx, c);
    if (!at) continue;
    decos.push(Decoration.inline(at.from, at.to, { class: c.id === active ? "comment-mark comment-mark-active" : "comment-mark", "data-comment": c.id }, { commentId: c.id }));
  }
  return DecorationSet.create(doc, decos);
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    comments: {
      setComments: (comments: CommentAnchor[], active?: string | null) => ReturnType;
    };
  }
}

/** The editor's storage holds the click handler, so the page can swap it without rebuilding the editor. */
export interface CommentHighlightsStorage {
  onActivate: (id: string) => void;
}

/** Point comment clicks in this editor at a new handler. */
export function setCommentHandler(editor: { storage: unknown }, fn: (id: string) => void) {
  const storage = (editor.storage as { commentHighlights?: CommentHighlightsStorage }).commentHighlights;
  if (storage) storage.onActivate = fn;
}

export const CommentHighlights = Extension.create<object, CommentHighlightsStorage>({
  name: "commentHighlights",
  addStorage() {
    return { onActivate: () => undefined };
  },
  addProseMirrorPlugins() {
    const onActivate = (id: string) => this.storage.onActivate(id);
    return [
      new Plugin<CommentsState>({
        key: commentsKey,
        state: {
          init: (): CommentsState => ({ comments: [], active: null, decos: DecorationSet.empty }),
          apply(tr, value, _old, state) {
            const meta = tr.getMeta(commentsKey) as { comments: CommentAnchor[]; active: string | null } | undefined;
            if (meta) return { ...meta, decos: build(state.doc, meta.comments, meta.active) };
            if (tr.docChanged) return { ...value, decos: build(state.doc, value.comments, value.active) };
            return value;
          },
        },
        props: {
          decorations: (state) => commentsKey.getState(state)?.decos,
          handleClick: (view, pos) => {
            const id = commentsKey.getState(view.state)?.decos.find(pos, pos)[0]?.spec.commentId as string | undefined;
            if (id) onActivate(id);
            return false;
          },
        },
      }),
    ];
  },
  addCommands() {
    return {
      setComments:
        (comments, active = null) =>
        ({ tr, dispatch }) => {
          if (dispatch) tr.setMeta(commentsKey, { comments, active }).setMeta("addToHistory", false);
          return true;
        },
    };
  },
});
