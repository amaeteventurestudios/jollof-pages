"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import type { Editor } from "@tiptap/react";
import type { Node as PmNode } from "@tiptap/pm/model";
import { ClipboardPaste, Copy, CopyPlus, GripVertical, Info, Minus, Plus, Trash2, X } from "lucide-react";
import { boxDef } from "@/lib/blocks";
import { PARA_HELP, PARA_KEYS, paraFormat, type ParaFormat } from "@/lib/paragraph";
import { cn } from "@/lib/utils";

const NAMES: Record<string, string> = {
  paragraph: "Paragraph",
  heading: "Heading",
  bulletList: "Bulleted list",
  orderedList: "Numbered list",
  blockquote: "Block quote",
  image: "Picture",
  horizontalRule: "Scene break",
  table: "Table",
  chat: "Text messages",
  columns: "Columns",
  pageBreak: "Page break",
  spacer: "Blank space",
  callout: "Callout",
};

export function nameOf(node: PmNode): string {
  if (node.type.name === "box") return boxDef(String(node.attrs.variant)).label;
  if (node.type.name === "heading") return Number(node.attrs.level) > 2 ? "Sub-heading" : "Heading";
  return NAMES[node.type.name] ?? "Block";
}

// paragraph settings copied with "Copy settings", for "Paste settings" on another paragraph
let copied: ParaFormat | null = null;

function lock(editor: Editor, on: boolean) {
  if (!editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta("lockDragHandle", on));
}

/**
 * The six-dot handle beside the block under the pointer. Drag it to move the block; click it for
 * the block's menu: duplicate, copy, delete and, for a paragraph, its own settings.
 */
export function BlockHandle({ editor }: { editor: Editor }) {
  const [target, setTarget] = useState<{ pos: number; node: PmNode } | null>(null);
  const [menu, setMenu] = useState<{ pos: number; x: number; y: number } | null>(null);
  const grip = useRef<HTMLButtonElement>(null);

  const close = () => {
    setMenu(null);
    lock(editor, false);
  };

  return (
    <>
      <DragHandle
        editor={editor}
        className="jp-drag-handle"
        onNodeChange={({ node, pos }) => {
          if (!menu) setTarget(node ? { node, pos } : null);
        }}
      >
        <button
          ref={grip}
          type="button"
          aria-label={target ? `${nameOf(target.node)}: drag to move, click for options` : "Block options"}
          title="Drag to move. Click for options."
          onClick={() => {
            if (!target) return;
            const r = grip.current!.getBoundingClientRect();
            lock(editor, true);
            setMenu({ pos: target.pos, x: r.right + 6, y: r.top });
          }}
          className="grid h-6 w-5 cursor-grab place-items-center rounded text-soft hover:bg-muted hover:text-ink active:cursor-grabbing"
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
      </DragHandle>
      {menu && <BlockMenu editor={editor} pos={menu.pos} x={menu.x} y={menu.y} onClose={close} />}
    </>
  );
}

function Toggle({ k, on, onChange }: { k: "first" | "dropCap" | "noIndent" | "leadIn"; on: boolean; onChange: (v: boolean) => void }) {
  const [help, setHelp] = useState(false);
  return (
    <div>
      <div className="flex items-center gap-2">
        <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className={cn("flex flex-1 items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-muted", on && "text-primary")}>
          <span aria-hidden className={cn("relative h-4 w-7 shrink-0 rounded-full transition", on ? "bg-primary" : "bg-paper-3")}>
            <span className={cn("absolute top-0.5 size-3 rounded-full bg-white shadow transition-all", on ? "left-3.5" : "left-0.5")} />
          </span>
          {PARA_HELP[k].title}
        </button>
        <button type="button" aria-label={`What is ${PARA_HELP[k].title}?`} aria-expanded={help} onClick={() => setHelp(!help)} className="grid size-6 place-items-center rounded text-soft hover:text-ink">
          <Info className="size-4" />
        </button>
      </div>
      {help && <p className="mx-2 mb-1 rounded bg-paper-2 px-2.5 py-2 text-[12.5px] leading-snug text-ink-2">{PARA_HELP[k].text}</p>}
    </div>
  );
}

function Stepper({
  k,
  value,
  base = 0,
  step,
  min,
  max,
  unit,
  onChange,
}: {
  k: "tracking" | "indent" | "left";
  /** undefined: the book's own setting */
  value: number | undefined;
  base?: number;
  step: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const [help, setHelp] = useState(false);
  const clamp = (v: number) => Math.round(Math.min(max, Math.max(min, v)) * 1000) / 1000;
  return (
    <div>
      <div className="flex items-center gap-2 px-2 py-1">
        <span className="flex-1">{PARA_HELP[k].title}</span>
        <button type="button" aria-label={`What is ${PARA_HELP[k].title}?`} aria-expanded={help} onClick={() => setHelp(!help)} className="grid size-6 place-items-center rounded text-soft hover:text-ink">
          <Info className="size-4" />
        </button>
        <div className="flex h-7 items-center rounded border border-border bg-card">
          <button type="button" aria-label={`Less ${PARA_HELP[k].title.toLowerCase()}`} onClick={() => onChange(clamp((value ?? base) - step))} className="grid h-full w-7 place-items-center text-ink-2 hover:text-ink">
            <Minus className="size-3.5" />
          </button>
          <input
            aria-label={PARA_HELP[k].title}
            inputMode="decimal"
            className="h-full w-12 border-x border-border bg-transparent text-center text-[13px] tabular-nums outline-none"
            value={value === undefined ? "" : String(value)}
            placeholder="Book"
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) onChange(clamp(v));
            }}
          />
          <span className="px-1 text-[11px] text-soft">{unit}</span>
          <button type="button" aria-label={`More ${PARA_HELP[k].title.toLowerCase()}`} onClick={() => onChange(clamp((value ?? base) + step))} className="grid h-full w-7 place-items-center text-ink-2 hover:text-ink">
            <Plus className="size-3.5" />
          </button>
        </div>
      </div>
      {help && <p className="mx-2 mb-1 rounded bg-paper-2 px-2.5 py-2 text-[12.5px] leading-snug text-ink-2">{PARA_HELP[k].text}</p>}
    </div>
  );
}

function BlockMenu({ editor, pos, x, y, onClose }: { editor: Editor; pos: number; x: number; y: number; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [, redraw] = useState(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    const away = (e: MouseEvent) => !box.current?.contains(e.target as globalThis.Node) && onClose();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const update = () => redraw((n) => n + 1);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    editor.on("transaction", update);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
      editor.off("transaction", update);
    };
  }, [editor, onClose]);

  const node = editor.state.doc.nodeAt(pos);
  if (!node) return null;
  const para = node.type.name === "paragraph";
  const pf = paraFormat(node.attrs);
  const setPara = (patch: Partial<Record<keyof ParaFormat, unknown>>) => {
    const n = editor.state.doc.nodeAt(pos);
    if (!n) return;
    editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...n.attrs, ...patch }));
  };
  const duplicate = () => {
    editor.chain().insertContentAt(pos + node.nodeSize, node.toJSON()).run();
    onClose();
  };
  const copy = async () => {
    const text = node.textContent;
    try {
      await navigator.clipboard.writeText(text);
      setNote("Copied");
    } catch {
      setNote("Could not copy");
    }
  };
  const remove = () => {
    editor.view.dispatch(editor.state.tr.delete(pos, pos + node.nodeSize));
    onClose();
  };
  const turnInto = (kind: string) => {
    const chain = editor.chain().setTextSelection(pos + 1);
    if (kind === "p") chain.setParagraph().run();
    else chain.setHeading({ level: kind === "h3" ? 3 : 2 }).run();
  };
  const left = Math.min(x, window.innerWidth - 340);
  const top = Math.min(y, window.innerHeight - (para ? 470 : 140));

  return createPortal(
    <div ref={box} role="dialog" aria-label={`${nameOf(node)} options`} style={{ left, top: Math.max(8, top) }} className="fixed z-50 w-[320px] rounded-md border border-border bg-popover text-sm text-ink shadow-xl">
      <div className="flex items-center gap-1 border-b border-border px-3 py-2">
        {(para || node.type.name === "heading") && !editor.isActive("box") ? (
          <select aria-label="Block type" value={para ? "p" : Number(node.attrs.level) > 2 ? "h3" : "h2"} onChange={(e) => turnInto(e.target.value)} className="h-7 rounded border border-border bg-card px-1.5 text-[13px] font-medium">
            <option value="p">Paragraph</option>
            <option value="h2">Heading</option>
            <option value="h3">Sub-heading</option>
          </select>
        ) : (
          <span className="text-[13px] font-semibold tracking-wide uppercase">{nameOf(node)}</span>
        )}
        <span className="flex-1 text-right text-[12px] text-soft" role="status">
          {note}
        </span>
        <button type="button" title="Duplicate" aria-label="Duplicate" onClick={duplicate} className="grid size-7 place-items-center rounded text-ink-2 hover:bg-muted hover:text-ink">
          <CopyPlus className="size-4" />
        </button>
        <button type="button" title="Copy the text" aria-label="Copy the text" onClick={copy} className="grid size-7 place-items-center rounded text-ink-2 hover:bg-muted hover:text-ink">
          <Copy className="size-4" />
        </button>
        <button type="button" title="Delete" aria-label="Delete" onClick={remove} className="grid size-7 place-items-center rounded text-ink-2 hover:bg-muted hover:text-destructive">
          <Trash2 className="size-4" />
        </button>
        <button type="button" aria-label="Close" onClick={onClose} className="grid size-7 place-items-center rounded text-soft hover:bg-muted hover:text-ink">
          <X className="size-4" />
        </button>
      </div>
      {para && (
        <>
          <div className="grid gap-0.5 border-b border-border p-1.5">
            {(["first", "dropCap", "noIndent", "leadIn"] as const).map((k) => (
              <Toggle key={k} k={k} on={!!pf[k]} onChange={(v) => setPara({ [k]: v || null })} />
            ))}
          </div>
          <div className="border-b border-border p-1.5">
            <Stepper k="tracking" value={pf.tracking ?? 0} step={0.01} min={-0.05} max={0.3} unit="em" onChange={(v) => setPara({ tracking: v || null })} />
          </div>
          <div className="p-1.5">
            <div className="flex items-center gap-1 px-2 pt-1 pb-0.5">
              <span className="flex-1 text-[12px] font-medium tracking-wide text-soft uppercase">Indents</span>
              <button
                type="button"
                title="Copy this paragraph's settings"
                aria-label="Copy this paragraph's settings"
                onClick={() => {
                  copied = pf;
                  setNote("Settings copied");
                }}
                className="grid size-7 place-items-center rounded text-ink-2 hover:bg-muted hover:text-ink"
              >
                <Copy className="size-3.5" />
              </button>
              <button
                type="button"
                title="Paste settings from another paragraph"
                aria-label="Paste settings from another paragraph"
                disabled={!copied}
                onClick={() => {
                  if (!copied) return;
                  const patch: Record<string, unknown> = {};
                  for (const k of PARA_KEYS) patch[k] = k === "first" ? (pf.first ?? null) : (copied[k] ?? null);
                  setPara(patch);
                  setNote("Settings pasted");
                }}
                className="grid size-7 place-items-center rounded text-ink-2 hover:bg-muted hover:text-ink disabled:opacity-40"
              >
                <ClipboardPaste className="size-3.5" />
              </button>
            </div>
            <Stepper k="indent" value={pf.noIndent ? 0 : pf.indent} base={1.5} step={0.25} min={0} max={6} unit="em" onChange={(v) => setPara({ indent: v, noIndent: null })} />
            <Stepper k="left" value={pf.left ?? 0} step={0.5} min={0} max={10} unit="em" onChange={(v) => setPara({ left: v || null })} />
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}
