"use client";

import { Node, mergeAttributes, type Extensions } from "@tiptap/core";
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

export function manuscriptExtensions(placeholder = "Start writing…"): Extensions {
  return [
    StarterKit.configure({
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
  ];
}
