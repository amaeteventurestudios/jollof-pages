"use client";

import { Extension, Mark, Node, mergeAttributes, type Extensions } from "@tiptap/core";
import { paraCss, paraFormat } from "@/lib/paragraph";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import { TableKit } from "@tiptap/extension-table";
import { boxDef, boxStyle, cleanLook, hasLook, presetOf, type BookBoxStyles } from "@/lib/blocks";
import { boxCss, EDITOR_PALETTE } from "@/lib/theme-css";
import Typography from "@tiptap/extension-typography";

/** Inline footnote. The note text lives in an attribute so exports can place it per format. */
export const Footnote = Node.create({
  name: "footnote",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    // endnote: collected at the end of the chapter instead of the foot of the page
    return { text: { default: "" }, endnote: { default: false } };
  },
  parseHTML() {
    return [
      {
        tag: "span[data-footnote]",
        getAttrs: (el) => ({ text: (el as HTMLElement).getAttribute("data-text") ?? (el as HTMLElement).textContent ?? "", endnote: (el as HTMLElement).hasAttribute("data-endnote") }),
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes({ "data-footnote": "", "data-text": HTMLAttributes.text, class: HTMLAttributes.endnote ? "footnote-ref endnote-ref" : "footnote-ref", title: HTMLAttributes.text }, HTMLAttributes.endnote ? { "data-endnote": "" } : {}),
    ];
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

/** The open book's block styles (theme `boxes` and `boxPresets`), under a block's own look. */
let bookStyles: BookBoxStyles | undefined;
export function setEditorBookStyles(styles: BookBoxStyles | undefined) {
  bookStyles = styles;
}

/**
 * A styled block from the catalog in src/lib/blocks.ts: notes, tips, letters, diary entries, pull
 * quotes, sidebars and so on. `label` overrides the catalog's heading; `src` is the picture for
 * "text over a picture".
 */
export const Box = Node.create({
  name: "box",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return {
      variant: { default: "note", parseHTML: (el) => el.getAttribute("data-variant") || "note" },
      label: { default: null, parseHTML: (el) => el.getAttribute("data-label") },
      src: { default: null, parseHTML: (el) => el.getAttribute("data-src") },
      /** a named style from the book (BoxPreset id) */
      preset: { default: null, parseHTML: (el) => el.getAttribute("data-preset") },
      /** the author's own colours, border and type for this block (BoxLook) */
      look: {
        default: null,
        parseHTML: (el) => {
          try {
            const l = cleanLook(JSON.parse(el.getAttribute("data-look") || "null"));
            return hasLook(l) ? l : null;
          } catch {
            return null;
          }
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-box]" }];
  },
  renderHTML({ node }) {
    const def = boxDef(node.attrs.variant);
    const label = node.attrs.label ?? def.box?.label ?? "";
    const look = cleanLook(node.attrs.look);
    const preset = presetOf(bookStyles, node.attrs.preset, def.id);
    // the class names the preset even before the book's styles catch up: a new preset is saved after the block gets it
    const presetId = typeof node.attrs.preset === "string" && /^[\w-]+$/.test(node.attrs.preset) ? node.attrs.preset : null;
    const own = hasLook(look) && def.id !== "overlay" && !def.box?.only;
    return [
      "div",
      {
        "data-box": "",
        "data-variant": def.id,
        ...(node.attrs.label != null ? { "data-label": node.attrs.label } : {}),
        ...(hasLook(look) ? { "data-look": JSON.stringify(look) } : {}),
        ...(node.attrs.preset ? { "data-preset": String(node.attrs.preset) } : {}),
        ...(node.attrs.src
          ? { "data-src": node.attrs.src, style: `background-image: linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,.45)), url("${String(node.attrs.src).replace(/"/g, "")}")` }
          : own
            ? { style: boxCss(boxStyle(def.id, bookStyles, look, preset?.id), EDITOR_PALETTE, true) }
            : {}),
        "data-shown-label": label,
        class: `blk blk-${def.id}${def.box?.labelAtEnd ? " blk-label-end" : ""}${own ? " blk-own" : presetId ? ` blk-p-${presetId}` : ""}`,
      },
      0,
    ];
  },
});

/** A text-message conversation. Each bubble is a chatMessage; `group` shows sender names. */
export const Chat = Node.create({
  name: "chat",
  group: "block",
  content: "chatMessage+",
  defining: true,
  addAttributes() {
    return { group: { default: false, parseHTML: (el) => el.hasAttribute("data-group") } };
  },
  parseHTML() {
    return [{ tag: "div[data-chat]" }];
  },
  renderHTML({ node }) {
    return ["div", { "data-chat": "", ...(node.attrs.group ? { "data-group": "" } : {}), class: "chat" }, 0];
  },
});

export const ChatMessage = Node.create({
  name: "chatMessage",
  content: "inline*",
  defining: true,
  addAttributes() {
    return {
      from: { default: "them", parseHTML: (el) => (el.getAttribute("data-from") === "me" ? "me" : "them") },
      name: { default: "", parseHTML: (el) => el.getAttribute("data-name") ?? "" },
    };
  },
  parseHTML() {
    return [{ tag: "p[data-msg]" }];
  },
  renderHTML({ node }) {
    return ["p", { "data-msg": "", "data-from": node.attrs.from, "data-name": node.attrs.name, class: `msg msg-${node.attrs.from}` }, 0];
  },
});

export const Columns = Node.create({
  name: "columns",
  group: "block",
  content: "column{2,3}",
  defining: true,
  isolating: true,
  addAttributes() {
    return { count: { default: 2, parseHTML: (el) => Number(el.getAttribute("data-count")) || 2 } };
  },
  parseHTML() {
    return [{ tag: "div[data-columns]" }];
  },
  renderHTML({ node }) {
    return ["div", { "data-columns": "", "data-count": node.attrs.count, class: `cols cols-${node.attrs.count}` }, 0];
  },
});

export const Column = Node.create({
  name: "column",
  content: "block+",
  isolating: true,
  parseHTML() {
    return [{ tag: "div[data-column]" }];
  },
  renderHTML() {
    return ["div", { "data-column": "", class: "col" }, 0];
  },
});

export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  parseHTML() {
    return [{ tag: "div[data-page-break]" }];
  },
  renderHTML() {
    return ["div", { "data-page-break": "", class: "page-break" }];
  },
});

export const Spacer = Node.create({
  name: "spacer",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return { size: { default: 2, parseHTML: (el) => Number(el.getAttribute("data-size")) || 2 } };
  },
  parseHTML() {
    return [{ tag: "div[data-spacer]" }];
  },
  renderHTML({ node }) {
    return ["div", { "data-spacer": "", "data-size": node.attrs.size, class: "spacer", style: `height: ${Number(node.attrs.size) * 1.5}em` }];
  },
});

/** Scene break with an optional ornament of its own; empty means the theme's. */
export const SceneBreak = HorizontalRule.extend({
  addAttributes() {
    return { ornament: { default: null, parseHTML: (el) => el.getAttribute("data-ornament") } };
  },
  renderHTML({ HTMLAttributes }) {
    return ["hr", mergeAttributes(HTMLAttributes.ornament ? { "data-ornament": HTMLAttributes.ornament } : {})];
  },
});

/** Images can sit left, right, full width or small. */
export const BookImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      layout: { default: "center", parseHTML: (el) => el.getAttribute("data-layout") || "center", renderHTML: (a) => ({ "data-layout": a.layout }) },
      /** percent of the text width; empty means the layout's own size */
      width: {
        default: null,
        parseHTML: (el) => {
          const w = Number(el.getAttribute("data-width"));
          return Number.isFinite(w) && w > 0 ? w : null;
        },
        renderHTML: (a) => (a.width ? { "data-width": a.width, style: `width: ${a.width}%` } : {}),
      },
    };
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

/**
 * One paragraph's own settings from its handle menu (src/lib/paragraph.ts): the chapter opening,
 * a forced drop cap, indents, letter spacing and a small-caps first line.
 */
export const ParagraphFormat = Extension.create({
  name: "paragraphFormat",
  addGlobalAttributes() {
    const flag = (name: string, attr: string) => ({
      default: null,
      parseHTML: (el: HTMLElement) => (el.hasAttribute(attr) ? true : null),
      renderHTML: (a: Record<string, unknown>) => (a[name] ? { [attr]: "" } : {}),
    });
    const number = (name: string, attr: string) => ({
      default: null,
      parseHTML: (el: HTMLElement) => {
        const v = el.getAttribute(attr);
        return v === null || v === "" || Number.isNaN(Number(v)) ? null : Number(v);
      },
      renderHTML: (a: Record<string, unknown>) => (typeof a[name] === "number" ? { [attr]: String(a[name]) } : {}),
    });
    return [
      {
        types: ["paragraph"],
        attributes: {
          first: flag("first", "data-first"),
          dropCap: flag("dropCap", "data-drop-cap"),
          noIndent: flag("noIndent", "data-no-indent"),
          leadIn: flag("leadIn", "data-lead-in"),
          tracking: number("tracking", "data-tracking"),
          indent: number("indent", "data-indent"),
          left: number("left", "data-left"),
          // the spacing and indents also show while writing
          paraStyle: {
            default: null,
            parseHTML: () => null,
            renderHTML: (a: Record<string, unknown>) => {
              const css = paraCss(paraFormat(a));
              return css ? { style: css } : {};
            },
          },
        },
      },
    ];
  },
});

/** An index entry: the words stay as they are; the print and ebook Index page lists the term with its pages. */
export const IndexTerm = Mark.create({
  name: "indexTerm",
  inclusive: false,
  addAttributes() {
    return {
      term: { default: "", parseHTML: (el) => el.getAttribute("data-index-term") ?? "", renderHTML: (a) => ({ "data-index-term": String(a.term ?? "").slice(0, 120) }) },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-index-term]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "ix-term", title: `Index: ${HTMLAttributes["data-index-term"] ?? ""}` }), 0];
  },
});

/** `live`: the chapter is edited through Yjs, which brings its own undo history. */
export function manuscriptExtensions(placeholder = "Start writing…", o: { live?: boolean; image?: typeof BookImage } = {}): Extensions {
  return [
    StarterKit.configure({
      ...(o.live ? { undoRedo: false } : {}),
      horizontalRule: false,
      heading: { levels: [2, 3, 4] },
      codeBlock: false,
      code: false,
      link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"] },
    }),
    Placeholder.configure({ placeholder }),
    CharacterCount,
    TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
    (o.image ?? BookImage).configure({ inline: false, allowBase64: false }),
    SceneBreak,
    Typography,
    ParagraphFormat,
    Footnote,
    Callout,
    Box,
    Chat,
    ChatMessage,
    Columns,
    Column,
    PageBreak,
    Spacer,
    TableKit.configure({ table: { resizable: false } }),
    SuggestionInsert,
    SuggestionDelete,
    IndexTerm,
  ];
}
