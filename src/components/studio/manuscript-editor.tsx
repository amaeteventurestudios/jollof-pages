"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Asterisk,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  MessageSquareQuote,
  NotebookPen,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  ZoomIn,
  ZoomOut,
  Plus,
  Smile,
  Pencil,
} from "lucide-react";
import FindAndReplace from "@tiptap/extension-find-and-replace";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import { manuscriptExtensions } from "./editor-extensions";
import { TrackChanges } from "./track-changes";
import { CommentHighlights, setCommentHandler } from "./comment-highlights";
import { colorFor, type LiveChapter } from "./use-live-chapter";
import { editorFontCss, type EditorSettings } from "@/lib/editor-settings";
import { PromptDialog } from "./prompt-dialog";
import { cn } from "@/lib/utils";
import { ImagePickerDialog, assetUrl } from "./image-library";
import type { DocNode } from "@/lib/doc/types";
import { BLOCKS, blockTemplate, boxDef, BOXES, type BlockDef, type BookBoxStyles } from "@/lib/blocks";
import { BoxStylePanel, PresetPicker, boxLookAtCursor } from "./box-style-panel";
import { BlockHandle } from "./block-handle";
import { SelectionToolbar } from "./selection-toolbar";
import { EditorContextMenu, type ChapterTools, type EditorOpen, type EditorTool } from "./context-menu";
import { AiReview } from "./ai-review";
import { SlashMenu, insertSaved } from "./slash-menu";
import { ORNAMENTS } from "@/lib/ornaments";
import { EmojiDialog, InsertBlockDialog } from "./insert-block";

const BLOCKS_BY_ID = new Map(BLOCKS.map((b) => [b.id, b]));

interface Props {
  chapterId: string;
  bookId: string;
  initial: DocNode | null;
  onChange: (doc: DocNode, words: number) => void;
  /** CSS applied to the writing surface so it matches the chosen interior theme */
  fontFamily: string;
  settings: EditorSettings;
  /** the live editor, for the tool rail's find, replace and smart quotes */
  onEditor?: (editor: Editor | null) => void;
  /** Ctrl/Cmd+F */
  onFind?: () => void;
  /** shared books: the chapter's live document on the collab server */
  live?: LiveChapter | null;
  /** who is writing, for tracked changes and the cursor others see */
  me: { id: string; name: string };
  /** record edits as tracked changes from the start (editors always do) */
  tracking?: boolean;
  /** commenters read and comment but cannot type */
  readOnly?: boolean;
  /** a comment highlight was clicked */
  onCommentClick?: (id: string) => void;
  /** theme styles for special blocks (theme-css editorBlockCss) */
  blockCss?: string;
  /** the book's colour and its block styles, for the block style panel */
  accent?: string;
  book?: BookBoxStyles;
  /** saves the book's block styles (defaults per kind and named presets) */
  onBookStyles?: (next: BookBoxStyles) => void;
  /** opens a panel of the tool rail (the menus' Comment and AI items) */
  onTool?: (t: EditorTool) => void;
  /** the book's block styles scoped to .jp-preview, for the Insert menu's previews */
  previewCss?: string;
  /** split here, stats and moving words to other chapters, from the right-click menu */
  chapterTools?: ChapterTools;
}

/** Calls back when a menu asks the editor to open one of its dialogs. */
function useEditorOpen(editor: Editor, on: (what: EditorOpen) => void) {
  const ref = useRef(on);
  useEffect(() => {
    ref.current = on;
  });
  useEffect(() => {
    const dom = editor.view.dom;
    const h = (e: Event) => ref.current((e as CustomEvent<EditorOpen>).detail);
    dom.addEventListener("jp-open", h);
    return () => dom.removeEventListener("jp-open", h);
  }, [editor]);
}

export function ManuscriptEditor({ chapterId, bookId, initial, onChange, fontFamily, settings, onEditor, onFind, live, me, tracking, readOnly, onCommentClick, blockCss, accent, book, onBookStyles, onTool, previewCss, chapterTools }: Props) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const doc = live?.doc ?? null;
  const editor = useEditor(
    {
      extensions: [
        ...manuscriptExtensions(readOnly ? "" : "Start writing…", { live: !!live }),
        FindAndReplace.configure({ injectCSS: false, searchDebounceMs: 120 }),
        TrackChanges.configure({ enabled: !!tracking, username: me.name, userId: me.id }),
        CommentHighlights,
        ...(live ? [Collaboration.configure({ document: live.doc }), CollaborationCaret.configure({ provider: live.provider, user: { name: me.name, color: colorFor(me.id) } })] : []),
      ],
      // a live chapter takes its text from the collab server
      ...(live ? {} : { content: initial ?? { type: "doc", content: [{ type: "paragraph" }] } }),
      editable: !readOnly,
      immediatelyRender: false,
      editorProps: {
        attributes: { class: "prose-manuscript", "aria-label": "Manuscript", spellcheck: "true" },
      },
      onUpdate: ({ editor }) => {
        onChangeRef.current(editor.getJSON() as DocNode, editor.storage.characterCount.words());
      },
    },
    [chapterId, doc, readOnly],
  );
  useEffect(() => {
    if (editor) setCommentHandler(editor, (id) => onCommentClick?.(id));
  }, [editor, onCommentClick]);
  useEffect(() => {
    onEditor?.(editor);
    return () => onEditor?.(null);
  }, [editor, onEditor]);
  // how big the writing surface looks, for this author on this device; the book's own font size is untouched
  const [zoom, setZoomState] = useState(() => {
    if (typeof window === "undefined") return 1;
    const v = Number(localStorage.getItem("jp-editor-zoom"));
    return v >= 0.7 && v <= 2 ? v : 1;
  });
  const setZoom = (v: number) => {
    const next = Math.round(Math.min(2, Math.max(0.7, v)) * 10) / 10;
    setZoomState(next);
    try {
      localStorage.setItem("jp-editor-zoom", String(next));
    } catch {
      // private window: the zoom lasts for this visit only
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {blockCss && <style>{blockCss}</style>}
      {editor && !readOnly && <Toolbar editor={editor} bookId={bookId} previewCss={previewCss} fontFamily={fontFamily} zoom={zoom} onZoom={setZoom} />}
      {editor && !readOnly && <BlockBar editor={editor} bookId={bookId} accent={accent ?? "#b0412e"} book={book ?? {}} onBookStyles={onBookStyles} />}
      {live && (live.problem || !live.synced) && (
        <p role="status" className="border-b border-border bg-paper-2 px-4 py-1.5 text-[13px] text-ink-2">
          {live.problem || "Connecting to the shared copy of this chapter…"}
        </p>
      )}
      <div
        className="min-h-0 flex-1 overflow-y-auto bg-[#faf8f7] dark:bg-background"
        id="manuscript-scroll"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f" && onFind) {
            e.preventDefault();
            onFind();
          }
        }}
      >
        <div
          data-tour="manuscript"
          className="manuscript mx-auto max-w-[44rem] px-6 py-10 text-ink sm:px-10"
          data-para={settings.paragraphs}
          data-justify={settings.justified}
          style={{ fontFamily: editorFontCss(settings, fontFamily), fontSize: settings.size, lineHeight: settings.lineHeight, zoom }}
        >
          {editor && !readOnly ? (
            <>
              <EditorContextMenu editor={editor} onTool={onTool} chapter={chapterTools}>
                <EditorContent editor={editor} />
              </EditorContextMenu>
              <BlockHandle editor={editor} />
              <SelectionToolbar editor={editor} onTool={onTool} />
              <AiReview editor={editor} bookId={bookId} chapterId={chapterId} onTool={onTool} />
              <SlashMenu editor={editor} />
            </>
          ) : (
            <EditorContent editor={editor} />
          )}
        </div>
      </div>
    </div>
  );
}

function ToolButton({ on, active, label, children, disabled }: { on: () => void; active?: boolean; label: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={on}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded text-ink-2 transition-colors hover:bg-paper-2 disabled:opacity-40 [&_svg]:size-4",
        active && "bg-primary-soft text-primary",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, bookId, previewCss, fontFamily, zoom, onZoom }: { editor: Editor; bookId: string; previewCss?: string; fontFamily?: string; zoom: number; onZoom: (v: number) => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      h4: e.isActive("heading", { level: 4 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      callout: e.isActive("callout"),
      link: e.isActive("link"),
      center: e.isActive({ textAlign: "center" }),
      right: e.isActive({ textAlign: "right" }),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const [prompt, setPrompt] = useState<null | "link" | "footnote" | "endnote">(null);
  const [picking, setPicking] = useState(false);
  const [imageLayout, setImageLayout] = useState("center");
  const [inserting, setInserting] = useState(false);
  const [emoji, setEmoji] = useState(false);
  useEditorOpen(editor, (what) => {
    if (what === "insert") setInserting(true);
    else if (what === "emoji") setEmoji(true);
    else if (what === "image") {
      setImageLayout("center");
      setPicking(true);
    } else if (what === "link" || what === "footnote" || what === "endnote") setPrompt(what);
  });

  // Ctrl+Shift+N (Cmd+Shift+N on a Mac) adds a footnote where the cursor is
  useEffect(() => {
    const dom = editor.view.dom;
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.shiftKey && ev.key.toLowerCase() === "n") {
        ev.preventDefault();
        setPrompt("footnote");
      }
    };
    dom.addEventListener("keydown", onKey);
    return () => dom.removeEventListener("keydown", onKey);
  }, [editor]);

  // slash commands insert through the same path as the Insert menu
  const pickRef = useRef<(b: BlockDef) => void>(() => undefined);
  useEffect(() => {
    pickRef.current = pick;
  });
  useEffect(() => {
    const dom = editor.view.dom;
    const h = (e: Event) => {
      const b = BLOCKS_BY_ID.get((e as CustomEvent<string>).detail);
      if (b) pickRef.current(b);
    };
    dom.addEventListener("jp-pick", h);
    return () => dom.removeEventListener("jp-pick", h);
  }, [editor]);

  function pick(b: BlockDef) {
    const c = editor.chain().focus();
    switch (b.kind) {
      case "blockquote":
        return c.toggleBlockquote().run();
      case "bulletList":
        return c.toggleBulletList().run();
      case "orderedList":
        return c.toggleOrderedList().run();
      case "footnote":
        return setPrompt("footnote");
      case "endnote":
        return setPrompt("endnote");
      case "link":
        return setPrompt("link");
      case "emoji":
        return setEmoji(true);
      case "image":
        setImageLayout(b.id === "image_left" ? "left" : b.id === "image_right" ? "right" : "full");
        return setPicking(true);
      default: {
        const tpl = blockTemplate(b.id);
        if (tpl) c.insertContent(tpl).run();
      }
    }
  }
  const style = s.h2 ? "h2" : s.h3 ? "h3" : s.h4 ? "h4" : "p";

  return (
    <div className="relative border-b border-border bg-card">
      <div className="flex items-center gap-0.5 overflow-x-auto px-2 py-1.5">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setInserting(true)}
          data-tour="insert"
          className="mr-1 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          <Plus className="size-4" /> Insert
        </button>
        <label className="sr-only" htmlFor="para-style">
          Paragraph style
        </label>
        <select
          id="para-style"
          value={style}
          onChange={(e) => {
            const v = e.target.value;
            const c = editor.chain().focus();
            if (v === "p") c.setParagraph().run();
            else c.toggleHeading({ level: Number(v.slice(1)) as 2 | 3 | 4 }).run();
          }}
          className="mr-1 h-8 rounded border border-input bg-card px-2 text-sm"
        >
          <option value="p">Body text</option>
          <option value="h2">Heading</option>
          <option value="h3">Subheading</option>
          <option value="h4">Minor heading</option>
        </select>
        <ToolButton label="Bold" active={s.bold} on={() => editor.chain().focus().toggleBold().run()}>
          <Bold />
        </ToolButton>
        <ToolButton label="Italic" active={s.italic} on={() => editor.chain().focus().toggleItalic().run()}>
          <Italic />
        </ToolButton>
        <ToolButton label="Underline" active={s.underline} on={() => editor.chain().focus().toggleUnderline().run()}>
          <Underline />
        </ToolButton>
        <ToolButton label="Strikethrough" active={s.strike} on={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough />
        </ToolButton>
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <ToolButton label="Align left" active={!s.center && !s.right} on={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft />
        </ToolButton>
        <ToolButton label="Center" active={s.center} on={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter />
        </ToolButton>
        <ToolButton label="Align right" active={s.right} on={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight />
        </ToolButton>
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <ToolButton label="Bulleted list" active={s.bullet} on={() => editor.chain().focus().toggleBulletList().run()}>
          <List />
        </ToolButton>
        <ToolButton label="Numbered list" active={s.ordered} on={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered />
        </ToolButton>
        <ToolButton label="Block quote" active={s.quote} on={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote />
        </ToolButton>
        <ToolButton
          label="Callout box"
          active={s.callout}
          on={() => {
            if (s.callout) editor.chain().focus().lift("callout").run();
            else editor.chain().focus().wrapIn("callout").run();
          }}
        >
          <MessageSquareQuote />
        </ToolButton>
        <ToolButton label="Scene break" on={() => editor.chain().focus().setHorizontalRule().run()}>
          <Asterisk />
        </ToolButton>
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <ToolButton label="Link" active={s.link} on={() => (s.link ? editor.chain().focus().unsetLink().run() : setPrompt("link"))}>
          <Link2 />
        </ToolButton>
        <ToolButton label="Footnote (Ctrl+Shift+N)" on={() => setPrompt("footnote")}>
          <NotebookPen />
        </ToolButton>
        <ToolButton
          label="Image"
          on={() => {
            setImageLayout("center");
            setPicking(true);
          }}
        >
          <ImagePlus />
        </ToolButton>
        <ToolButton label="Emoji" on={() => setEmoji(true)}>
          <Smile />
        </ToolButton>
        <ImagePickerDialog
          open={picking}
          onOpenChange={setPicking}
          bookId={bookId}
          title="Insert an image"
          description="Pick one of your images or upload a new one. It goes where the cursor is."
          onPick={(a) =>
            editor
              .chain()
              .focus()
              .insertContent({ type: "image", attrs: { src: assetUrl(a), alt: a.alt, layout: imageLayout } })
              .run()
          }
        />
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <ToolButton label="Undo" disabled={!s.canUndo} on={() => editor.chain().focus().undo().run()}>
          <Undo2 />
        </ToolButton>
        <ToolButton label="Redo" disabled={!s.canRedo} on={() => editor.chain().focus().redo().run()}>
          <Redo2 />
        </ToolButton>
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <div className="flex shrink-0 items-center" role="group" aria-label="Writing area size">
          <ToolButton label="Make the writing area smaller" disabled={zoom <= 0.7} on={() => onZoom(zoom - 0.1)}>
            <ZoomOut />
          </ToolButton>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onZoom(1)}
            title="Back to 100%"
            className="tabular h-8 w-12 shrink-0 rounded text-[13px] font-medium text-ink-2 hover:bg-paper-2"
          >
            {Math.round(zoom * 100)}%
          </button>
          <ToolButton label="Make the writing area bigger" disabled={zoom >= 2} on={() => onZoom(zoom + 0.1)}>
            <ZoomIn />
          </ToolButton>
        </div>
      </div>
      <PromptDialog
        open={prompt === "link"}
        title="Add a link"
        label="Web address"
        placeholder="https://"
        onClose={() => setPrompt(null)}
        onSubmit={(v) => {
          const href = /^(https?:|mailto:)/i.test(v) ? v : `https://${v}`;
          editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
        }}
      />
      <PromptDialog
        open={prompt === "footnote" || prompt === "endnote"}
        title={prompt === "endnote" ? "Add an endnote" : "Add a footnote"}
        label="Note text"
        multiline
        onClose={() => setPrompt(null)}
        onSubmit={(v) =>
          editor
            .chain()
            .focus()
            // with words selected, the note goes after them rather than replacing them
            .setTextSelection(editor.state.selection.to)
            .insertContent({ type: "footnote", attrs: { text: v, endnote: prompt === "endnote" } })
            .run()
        }
      />
      <InsertBlockDialog
        open={inserting}
        onOpenChange={setInserting}
        onPick={pick}
        onPickSaved={(b) => insertSaved(editor, b)}
        previewCss={previewCss}
        fontFamily={fontFamily}
      />
      <EmojiDialog open={emoji} onOpenChange={setEmoji} onPick={(e) => editor.chain().focus().insertContent(e).run()} />
    </div>
  );
}

/** Controls for the special block the cursor is in: bubble side, box style, table rows, picture layout, ornament. */
function BlockBar({
  editor,
  bookId,
  accent,
  book,
  onBookStyles,
}: {
  editor: Editor;
  bookId: string;
  accent: string;
  book: BookBoxStyles;
  onBookStyles?: (next: BookBoxStyles) => void;
}) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      msg: e.isActive("chatMessage") ? (e.getAttributes("chatMessage") as { from: string; name: string }) : null,
      group: e.isActive("chat") ? !!e.getAttributes("chat").group : false,
      box: e.isActive("box") ? (e.getAttributes("box") as { variant: string; label: string | null; src: string | null }) : null,
      table: e.isActive("table"),
      image: e.isActive("image") ? (e.getAttributes("image") as { layout: string }) : null,
      hr: e.isActive("horizontalRule") ? (e.getAttributes("horizontalRule") as { ornament: string | null }) : null,
      own: boxLookAtCursor(e),
    }),
  });
  const [naming, setNaming] = useState<null | "label" | "sender">(null);
  const [styling, setStyling] = useState(false);
  const [picture, setPicture] = useState(false);
  useEditorOpen(editor, (what) => {
    if (what === "style") setStyling(true);
  });
  if (!s.msg && !s.box && !s.table && !s.image && !s.hr) return null;
  const btn = "h-7 shrink-0 rounded border border-border bg-card px-2 text-[13px] hover:border-primary";
  const sel = "h-7 shrink-0 rounded border border-border bg-card px-1.5 text-[13px]";
  const run = (f: (c: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) => f(editor.chain().focus()).run();
  const box = s.box ? BOXES.find((b) => b.id === s.box!.variant) : null;
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border bg-paper-2 px-3 py-1.5 text-[13px]" role="toolbar" aria-label="Block settings">
      {s.msg && (
        <>
          <span className="shrink-0 font-medium text-ink-2">Message</span>
          <button type="button" className={btn} onClick={() => run((c) => c.updateAttributes("chatMessage", { from: s.msg!.from === "me" ? "them" : "me" }))}>
            {s.msg.from === "me" ? "Sent by me: switch side" : "Received: switch side"}
          </button>
          {s.group && (
            <button type="button" className={btn} onClick={() => setNaming("sender")}>
              Sender: {s.msg.name || "none"}
            </button>
          )}
          <button
            type="button"
            className={btn}
            onClick={() => {
              const { $from } = editor.state.selection;
              const after = $from.after($from.depth);
              const from = s.msg!.from === "me" ? "them" : "me";
              editor.chain().focus().insertContentAt(after, { type: "chatMessage", attrs: { from, name: "" } }).setTextSelection(after + 1).run();
            }}
          >
            Add a reply
          </button>
        </>
      )}
      {s.box && !s.msg && (
        <>
          <label className="sr-only" htmlFor="box-variant">
            Block style
          </label>
          <select id="box-variant" className={sel} value={s.box.variant} onChange={(e) => run((c) => c.updateAttributes("box", { variant: e.target.value, label: null }))}>
            {BOXES.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
          {box?.box?.label !== undefined && (
            <button type="button" className={btn} onClick={() => setNaming("label")}>
              Heading: {s.box.label ?? box?.box?.label ?? ""}
            </button>
          )}
          {s.box.variant === "overlay" && (
            <button type="button" className={btn} onClick={() => setPicture(true)}>
              {s.box.src ? "Change picture" : "Choose picture"}
            </button>
          )}
          {s.own && boxDef(s.own.variant).id !== "overlay" && !boxDef(s.own.variant).box?.only && (
            <>
              <PresetPicker editor={editor} variant={s.own.variant} preset={s.own.preset} look={s.own.look} book={book} onBookStyles={onBookStyles} />
              <button type="button" className={cn(btn, "inline-flex items-center gap-1", styling && "border-primary text-primary")} aria-expanded={styling} onClick={() => setStyling(!styling)}>
                <Pencil className="size-3.5" aria-hidden /> Edit style
              </button>
            </>
          )}
          <button type="button" className={btn} onClick={() => run((c) => c.lift("box"))}>
            Remove box
          </button>
          {styling && s.own && (
            <BoxStylePanel editor={editor} variant={s.own.variant} look={s.own.look} preset={s.own.preset} accent={accent} book={book} onBookStyles={onBookStyles} onClose={() => setStyling(false)} />
          )}
        </>
      )}
      {s.table && (
        <>
          <span className="shrink-0 font-medium text-ink-2">Table</span>
          <button type="button" className={btn} onClick={() => run((c) => c.addRowAfter())}>
            + Row
          </button>
          <button type="button" className={btn} onClick={() => run((c) => c.addColumnAfter())}>
            + Column
          </button>
          <button type="button" className={btn} onClick={() => run((c) => c.deleteRow())}>
            − Row
          </button>
          <button type="button" className={btn} onClick={() => run((c) => c.deleteColumn())}>
            − Column
          </button>
          <button type="button" className={btn} onClick={() => run((c) => c.toggleHeaderRow())}>
            Header row
          </button>
          <button type="button" className={btn} onClick={() => run((c) => c.deleteTable())}>
            Delete table
          </button>
        </>
      )}
      {s.image && (
        <>
          <label htmlFor="img-layout" className="shrink-0 font-medium text-ink-2">
            Picture
          </label>
          <select id="img-layout" className={sel} value={s.image.layout || "center"} onChange={(e) => run((c) => c.updateAttributes("image", { layout: e.target.value }))}>
            <option value="center">Centred</option>
            <option value="small">Small, centred</option>
            <option value="full">Full width</option>
            <option value="left">Left, small</option>
            <option value="right">Right, small</option>
          </select>
        </>
      )}
      {s.hr && (
        <>
          <label htmlFor="hr-ornament" className="shrink-0 font-medium text-ink-2">
            Scene break
          </label>
          <select id="hr-ornament" className={sel} value={s.hr.ornament ?? ""} onChange={(e) => run((c) => c.updateAttributes("horizontalRule", { ornament: e.target.value || null }))}>
            <option value="">The theme&apos;s ornament</option>
            {ORNAMENTS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </>
      )}
      <PromptDialog
        open={naming !== null}
        title={naming === "sender" ? "Who sent this message?" : "Block heading"}
        label={naming === "sender" ? "Name" : "Heading"}
        initial={naming === "sender" ? (s.msg?.name ?? "") : (s.box?.label ?? box?.box?.label ?? "")}
        onClose={() => setNaming(null)}
        onSubmit={(v) => (naming === "sender" ? run((c) => c.updateAttributes("chatMessage", { name: v })) : run((c) => c.updateAttributes("box", { label: v })))}
      />
      <ImagePickerDialog
        open={picture}
        onOpenChange={setPicture}
        bookId={bookId}
        title="Picture behind the text"
        description="It is darkened a little so white text stays readable."
        onPick={(a) => run((c) => c.updateAttributes("box", { src: assetUrl(a) }))}
      />
    </div>
  );
}
