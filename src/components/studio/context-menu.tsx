"use client";

import { useRef, useState } from "react";
import { ContextMenu as CM } from "radix-ui";
import type { Editor } from "@tiptap/react";
import type { Node as PmNode } from "@tiptap/pm/model";
import {
  ArrowDown,
  ArrowUp,
  Asterisk,
  Bold,
  BookOpenText,
  ChevronRight,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Heading,
  ImagePlus,
  Italic,
  LayoutGrid,
  Link2,
  MessageSquarePlus,
  NotebookPen,
  Pencil,
  Quote,
  RemoveFormatting,
  Scissors,
  SeparatorHorizontal,
  Smile,
  Sparkles,
  SquareDashedMousePointer,
  Strikethrough,
  Trash2,
  Underline,
  Volume2,
  Wand2,
  BookMarked,
  Feather,
  GraduationCap,
  Shapes,
} from "lucide-react";
import { nameOf } from "./block-handle";
import { runAi } from "./ai-review";
import { AI_ACTIONS, AI_GROUPS, type AiGroup } from "@/lib/ai-actions";
import { BOXES } from "@/lib/blocks";
import { cn } from "@/lib/utils";

/** Dialogs and panels the menus open. The editor toolbar and block bar listen for these. */
export type EditorOpen = "insert" | "link" | "footnote" | "endnote" | "image" | "emoji" | "style";
export type EditorTool = "assistant" | "comments";

export function openInEditor(editor: Editor, what: EditorOpen) {
  editor.view.dom.dispatchEvent(new CustomEvent("jp-open", { detail: what }));
}

/** Open the right-click menu for the current selection, at a point on screen (the toolbar's More button). */
export function openContextMenu(editor: Editor, x: number, y: number) {
  editor.view.dom.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: x, clientY: y }));
}

// blocks the menu acts on as a whole, innermost first
const WHOLE = new Set(["box", "table", "chat", "columns", "callout", "blockquote", "bulletList", "orderedList"]);
const ATOMS = new Set(["image", "horizontalRule", "pageBreak", "spacer"]);

interface Block {
  pos: number;
  node: PmNode;
}

function blockAt(editor: Editor, pos: number, inside: number): Block | null {
  const doc = editor.state.doc;
  if (inside >= 0) {
    const n = doc.nodeAt(inside);
    if (n && ATOMS.has(n.type.name)) return { pos: inside, node: n };
  }
  const $p = doc.resolve(Math.min(pos, doc.content.size));
  for (let d = $p.depth; d > 0; d--) {
    if (WHOLE.has($p.node(d).type.name)) return { pos: $p.before(d), node: $p.node(d) };
  }
  if ($p.depth >= 1) return { pos: $p.before(1), node: $p.node(1) };
  return null;
}

const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const key = (k: string) => (mac ? `⌘${k}` : `Ctrl+${k}`);

interface Ctx {
  mode: "text" | "cursor";
  block: Block | null;
  words: number;
}

/**
 * The editor's own right-click menu. With words selected it offers cut, copy, formatting, comments and
 * notes; on an empty spot it offers inserts; on a block it offers duplicate, move and delete.
 * Shift + right-click still opens the browser's menu (spelling suggestions live there).
 */
export function EditorContextMenu({ editor, onTool, children }: { editor: Editor; onTool?: (t: EditorTool) => void; children: React.ReactNode }) {
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [note, setNote] = useState("");
  // the selection before a right-button press: on a Mac the press selects the word under the pointer
  const before = useRef<{ from: number; to: number } | null>(null);

  function onPress(e: React.MouseEvent) {
    if (e.button === 2) before.current = { from: editor.state.selection.from, to: editor.state.selection.to };
  }

  function onMenu(e: React.MouseEvent) {
    if (e.shiftKey || !editor.isEditable) {
      // the browser's own menu
      e.stopPropagation();
      before.current = null;
      return;
    }
    const hit = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
    const was = before.current;
    before.current = null;
    const sel = editor.state.selection;
    let mode: Ctx["mode"] = "cursor";
    if (was && was.from !== was.to && hit && hit.pos >= was.from && hit.pos <= was.to) {
      // clicked inside the words already selected: keep them
      editor.commands.setTextSelection(was);
      mode = "text";
    } else if (!was && !sel.empty) {
      // opened from the toolbar's More button or the keyboard's menu key
      mode = "text";
    } else if (hit) {
      editor.commands.setTextSelection(hit.pos);
    }
    const s = editor.state.selection;
    const words = mode === "text" ? countWords(editor.state.doc.textBetween(s.from, s.to, " ")) : editor.storage.characterCount.words();
    setCtx({ mode, block: hit ? blockAt(editor, hit.pos, hit.inside) : null, words });
    setNote("");
  }

  const c = () => editor.chain().focus();
  const [speaking, setSpeaking] = useState(false);
  function readAloud() {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (!synth) return flash("This browser cannot read aloud");
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const { from, to } = editor.state.selection;
    const u = new SpeechSynthesisUtterance(editor.state.doc.textBetween(from, to, " "));
    u.onend = u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(u);
  }
  const flash = (t: string) => {
    setNote(t);
    setTimeout(() => setNote(""), 2400);
  };

  function clip(kind: "cut" | "copy") {
    editor.view.focus();
    // the browser's own copy keeps formatting, which the clipboard API cannot write for us
    if (!document.execCommand(kind)) flash(`Press ${key(kind === "cut" ? "X" : "C")} to ${kind}`);
  }
  async function paste() {
    try {
      const items = await navigator.clipboard.read();
      for (const it of items) {
        if (it.types.includes("text/html")) {
          const html = await (await it.getType("text/html")).text();
          c().insertContent(html).run();
          return;
        }
      }
      const text = await navigator.clipboard.readText();
      if (text) c().insertContent(text).run();
    } catch {
      flash(`Your browser asks you to press ${key("V")} to paste`);
    }
  }

  // with words selected, a plain paragraph's own tools would only crowd the menu
  const b = ctx?.block && (ctx.mode === "cursor" || !["paragraph", "heading"].includes(ctx.block.node.type.name)) ? ctx.block : null;
  const box = b?.node.type.name === "box";
  const textBlock = b && (b.node.type.name === "paragraph" || b.node.type.name === "heading");
  const blockOps = b && {
    duplicate: () => c().insertContentAt(b.pos + b.node.nodeSize, b.node.toJSON()).run(),
    copy: async () => {
      try {
        await navigator.clipboard.writeText(b.node.textContent);
      } catch {
        flash("Could not copy");
      }
    },
    remove: () => {
      editor.view.dispatch(editor.state.tr.delete(b.pos, b.pos + b.node.nodeSize));
      editor.view.focus();
    },
    move: (dir: -1 | 1) => {
      const { state } = editor;
      const $p = state.doc.resolve(b.pos);
      const i = $p.index();
      const parent = $p.parent;
      const tr = state.tr;
      if (dir < 0) {
        if (i === 0) return;
        const prev = parent.child(i - 1);
        tr.delete(b.pos, b.pos + b.node.nodeSize).insert(b.pos - prev.nodeSize, b.node);
      } else {
        if (i >= parent.childCount - 1) return;
        const next = parent.child(i + 1);
        tr.delete(b.pos, b.pos + b.node.nodeSize).insert(b.pos + next.nodeSize, b.node);
      }
      editor.view.dispatch(tr.scrollIntoView());
      editor.view.focus();
    },
  };
  const index = b ? editor.state.doc.resolve(b.pos).index() : 0;
  const siblings = b ? editor.state.doc.resolve(b.pos).parent.childCount : 0;

  return (
    <CM.Root
      modal={false}
      onOpenChange={(open) => {
        if (!open) setCtx(null);
      }}
    >
      <CM.Trigger asChild>
        <div onMouseDownCapture={onPress} onContextMenuCapture={onMenu}>
          {children}
        </div>
      </CM.Trigger>
      <CM.Portal>
        <CM.Content
          aria-label="Editor menu"
          className="z-50 max-h-[var(--radix-context-menu-content-available-height)] min-w-[15rem] overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            editor.view.focus();
          }}
        >
          {ctx?.mode === "text" && (
            <>
              <Item icon={Scissors} label="Cut" hint={key("X")} on={() => clip("cut")} />
              <Item icon={Copy} label="Copy" hint={key("C")} on={() => clip("copy")} />
              <Item icon={ClipboardPaste} label="Paste" hint={key("V")} on={paste} />
              <Sep />
              <Sub icon={Bold} label="Format">
                <Item icon={Bold} label="Bold" hint={key("B")} on={() => c().toggleBold().run()} />
                <Item icon={Italic} label="Italic" hint={key("I")} on={() => c().toggleItalic().run()} />
                <Item icon={Underline} label="Underline" hint={key("U")} on={() => c().toggleUnderline().run()} />
                <Item icon={Strikethrough} label="Strikethrough" on={() => c().toggleStrike().run()} />
                <Sep />
                <Item label="Body text" on={() => c().setParagraph().run()} />
                <Item icon={Heading} label="Heading" on={() => c().setHeading({ level: 2 }).run()} />
                <Item label="Subheading" on={() => c().setHeading({ level: 3 }).run()} />
                <Item icon={Quote} label="Block quote" on={() => c().toggleBlockquote().run()} />
                <Sep />
                <Item icon={RemoveFormatting} label="Clear formatting" on={() => c().unsetAllMarks().run()} />
              </Sub>
              <Item icon={MessageSquarePlus} label="Comment" on={() => onTool?.("comments")} />
              <Item icon={Link2} label="Link…" on={() => openInEditor(editor, "link")} />
              <Item icon={NotebookPen} label="Footnote…" on={() => openInEditor(editor, "footnote")} />
              <Item icon={BookOpenText} label="Endnote…" on={() => openInEditor(editor, "endnote")} />
              <Sep />
              <AiSub editor={editor} group="write" icon={Wand2} />
              <AiSub editor={editor} group="fiction" icon={Feather} />
              <AiSub editor={editor} group="nonfiction" icon={GraduationCap} />
              <Item icon={Sparkles} label="Explain this" on={() => runAi(editor, "explain")} />
              <Item icon={Volume2} label={speaking ? "Stop reading" : "Read aloud"} on={readAloud} />
              <Item icon={BookMarked} label="Open the writing assistant" on={() => onTool?.("assistant")} />
              <Sep />
              <TransformSub editor={editor} />
            </>
          )}
          {ctx?.mode === "cursor" && (
            <>
              <Item icon={ClipboardPaste} label="Paste" hint={key("V")} on={paste} />
              <Sep />
              <Item icon={LayoutGrid} label="Insert a block…" on={() => openInEditor(editor, "insert")} />
              <Sub icon={ImagePlus} label="Insert">
                <Item icon={ImagePlus} label="Picture…" on={() => openInEditor(editor, "image")} />
                <Item icon={Asterisk} label="Scene break" on={() => c().setHorizontalRule().run()} />
                <Item icon={SeparatorHorizontal} label="Page break" on={() => c().insertContent({ type: "pageBreak" }).run()} />
                <Item icon={NotebookPen} label="Footnote…" on={() => openInEditor(editor, "footnote")} />
                <Item icon={BookOpenText} label="Endnote…" on={() => openInEditor(editor, "endnote")} />
                <Item icon={Smile} label="Emoji…" on={() => openInEditor(editor, "emoji")} />
              </Sub>
              <Item icon={Sparkles} label="Continue writing with AI" on={() => runAi(editor, "continue")} />
              <Item icon={Feather} label="Write a chapter transition" on={() => runAi(editor, "transition")} />
            </>
          )}
          {ctx && b && blockOps && (
            <>
              <Sep />
              <CM.Label className="px-2 pt-1 pb-0.5 text-xs font-medium text-muted-foreground">{nameOf(b.node)}</CM.Label>
              {box && <Item icon={Pencil} label="Edit style…" on={() => openInEditor(editor, "style")} />}
              {box && (
                <Sub icon={Shapes} label="Change type">
                  {BOX_GROUPS.map(([g, list]) => (
                    <Sub key={g} label={g}>
                      {list.map((x) => (
                        <Item key={x.id} label={x.label} on={() => editor.chain().focus().setNodeSelection(b.pos).updateAttributes("box", { variant: x.id, label: null }).setTextSelection(b.pos + 2).run()} />
                      ))}
                    </Sub>
                  ))}
                </Sub>
              )}
              {textBlock && (
                <Sub label="Turn into">
                  <Item label="Body text" on={() => c().setTextSelection(b.pos + 1).setParagraph().run()} />
                  <Item label="Heading" on={() => c().setTextSelection(b.pos + 1).setHeading({ level: 2 }).run()} />
                  <Item label="Subheading" on={() => c().setTextSelection(b.pos + 1).setHeading({ level: 3 }).run()} />
                  <Item label="Block quote" on={() => c().setTextSelection(b.pos + 1).toggleBlockquote().run()} />
                </Sub>
              )}
              <Item icon={CopyPlus} label="Duplicate" on={blockOps.duplicate} />
              {!!b.node.textContent && <Item icon={Copy} label="Copy its text" on={blockOps.copy} />}
              <Item icon={ArrowUp} label="Move up" disabled={index === 0} on={() => blockOps.move(-1)} />
              <Item icon={ArrowDown} label="Move down" disabled={index >= siblings - 1} on={() => blockOps.move(1)} />
              <Item icon={Trash2} label="Delete" danger on={blockOps.remove} />
            </>
          )}
          {ctx && (
            <>
              <Sep />
              <Item icon={SquareDashedMousePointer} label="Select all" hint={key("A")} on={() => c().selectAll().run()} />
              <p className="px-2 pt-1.5 pb-1 text-[11px] leading-snug text-muted-foreground">
                {ctx.mode === "text" ? `${ctx.words} ${ctx.words === 1 ? "word" : "words"} selected` : `${ctx.words.toLocaleString()} words in this chapter`}
                <br />
                Shift + right-click for the browser menu
              </p>
            </>
          )}
        </CM.Content>
      </CM.Portal>
      {note && (
        <p role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md bg-ink px-3 py-2 text-sm text-paper shadow-lg">
          {note}
        </p>
      )}
    </CM.Root>
  );
}

function countWords(s: string) {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

const itemCls =
  "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[highlighted]:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-ink-2";

function Item({ icon: Icon, label, hint, on, disabled, danger }: { icon?: React.ComponentType; label: string; hint?: string; on: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <CM.Item className={cn(itemCls, danger && "text-destructive [&_svg]:text-destructive")} disabled={disabled} onSelect={on}>
      {Icon ? <Icon /> : <span className="size-4 shrink-0" />}
      <span className="flex-1">{label}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </CM.Item>
  );
}

function Sub({ icon: Icon, label, children }: { icon?: React.ComponentType; label: string; children: React.ReactNode }) {
  return (
    <CM.Sub>
      <CM.SubTrigger className={cn(itemCls, "data-[state=open]:bg-muted")}>
        {Icon ? <Icon /> : <span className="size-4 shrink-0" />}
        <span className="flex-1">{label}</span>
        <ChevronRight />
      </CM.SubTrigger>
      <CM.Portal>
        <CM.SubContent className="z-50 min-w-[12rem] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg">{children}</CM.SubContent>
      </CM.Portal>
    </CM.Sub>
  );
}

function Sep() {
  return <CM.Separator className="-mx-1 my-1 h-px bg-border" />;
}

// block kinds a box can change into, by catalog group; ones with their own layout stay out
const BOX_GROUPS = Object.entries(
  BOXES.filter((x) => x.id !== "overlay" && !x.box?.only).reduce<Record<string, typeof BOXES>>((acc, x) => {
    (acc[x.group] ??= []).push(x);
    return acc;
  }, {}),
);

/** One AI group as a submenu; tools with a choice (tone, tense…) open one more level. */
function AiSub({ editor, group, icon }: { editor: Editor; group: AiGroup; icon: React.ComponentType }) {
  const list = AI_ACTIONS.filter((a) => a.group === group && a.needs === "selection");
  return (
    <Sub icon={icon} label={AI_GROUPS[group]}>
      {list.map((a) =>
        a.options ? (
          <Sub key={a.id} label={a.label}>
            {a.options.map((o) => (
              <Item key={o} label={o[0].toUpperCase() + o.slice(1)} on={() => runAi(editor, a.id, o)} />
            ))}
          </Sub>
        ) : (
          <Item key={a.id} label={a.label} on={() => runAi(editor, a.id)} />
        ),
      )}
    </Sub>
  );
}

/** Wrap the selected paragraphs in a special block, keeping the words as they are. */
function TransformSub({ editor }: { editor: Editor }) {
  return (
    <Sub icon={Shapes} label="Transform into">
      {BOX_GROUPS.map(([g, list]) => (
        <Sub key={g} label={g}>
          {list.map((x) => (
            <Item key={x.id} label={x.label} on={() => editor.chain().focus().wrapIn("box", { variant: x.id }).run()} />
          ))}
        </Sub>
      ))}
      <CM.Separator className="-mx-1 my-1 h-px bg-border" />
      <p className="max-w-56 px-2 py-1 text-[11px] leading-snug text-muted-foreground">Checklists, quizzes and takeaways written for you are under Nonfiction and teaching.</p>
    </Sub>
  );
}
