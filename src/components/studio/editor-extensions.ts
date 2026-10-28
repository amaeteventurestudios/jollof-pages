"use client";

import { Mark, Node, mergeAttributes, type Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Typography from "@tiptap/extension-typography";

/** Inline footnote. The note text lives in an attribute so exports can place it per format. */
export const Footnote = Node.create({
  name: "footnote",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return { text: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "span[data-footnote]", getAttrs: (el) => ({ text: (el as HTMLElement).getAttribute("data-text") ?? (el as HTMLElement).textContent ?? "" }) }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes({ "data-footnote": "", "data-text": HTMLAttributes.text, class: "footnote-ref", title: HTMLAttributes.text })];
  },
});

/** A shaded box for exercises, tips and key ideas. */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  parseHTML() {
    return [{ tag: "div.callout" }, { tag: "aside" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "callout" }), 0];
  },
});

/**
 * Tracked changes. An editor's suggested insertions and deletions stay in the text, marked, until the
 * author accepts or rejects them (src/components/studio/track-changes.ts). The names and attributes
 * match prosemirror-suggestion-mode, which records them as the editor types.
 */
function suggestionMark(name: "suggestion_insert" | "suggestion_delete", attr: string, cls: string) {
  return Mark.create({
    name,
    inclusive: false,
    excludes: name === "suggestion_insert" ? "suggestion_delete" : "suggestion_insert",
    spanning: true,
    addAttributes() {
      return {
        username: { default: "Someone", parseHTML: (el) => el.getAttribute("data-by") || "Someone", renderHTML: (a) => ({ "data-by": a.username }) },
        data: { default: null, parseHTML: () => null, renderHTML: () => ({}) },
      };
    },
    parseHTML() {
      return [{ tag: `span[${attr}]` }];
    },
    renderHTML({ HTMLAttributes }) {
      return ["span", mergeAttributes(HTMLAttributes, { [attr]: "true", class: cls }), 0];
    },
  });
}
export const SuggestionInsert = suggestionMark("suggestion_insert", "data-suggestion-add", "suggestion-add");
export const SuggestionDelete = suggestionMark("suggestion_delete", "data-suggestion-delete", "suggestion-delete");

/** `live`: the chapter is edited through Yjs, which brings its own undo history. */
export function manuscriptExtensions(placeholder = "Start writing…", o: { live?: boolean } = {}): Extensions {
  return [
    StarterKit.configure({
      ...(o.live ? { undoRedo: false } : {}),
      heading: { levels: [2, 3, 4] },
      codeBlock: false,
      code: false,
      link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"] },
    }),
    Placeholder.configure({ placeholder }),
    CharacterCount,
    TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
    Image.configure({ inline: false, allowBase64: false }),
    Typography,
    Footnote,
    Callout,
    SuggestionInsert,
    SuggestionDelete,
  ];
}
