"use client";

import { useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Minus, Plus, RotateCcw, X } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { boxDef, boxStyle, cleanLook, cleanPresets, hasLook, LOOK_KEYS, paleTint, presetOf, type BookBoxStyles, type BoxFont, type BoxLook, type BoxStyle } from "@/lib/blocks";
import { FONTS, type FontRole } from "@/lib/fonts";
import { cn } from "@/lib/utils";

const FILLS = ["#ffffff", "#f4f4f2", "#f2efe8", "#fdf1dc", "#fbe7e1", "#e8f3ea", "#e6f1f5", "#eef2fb", "#f1eaf7", "#fff8d6", "#2b2722", "#1f3a4d"];
const INKS = ["#1c1a17", "#6b645a", "#b0412e", "#c2410c", "#b45309", "#15803d", "#0f766e", "#1d4ed8", "#6d28d9", "#be185d"];

const BORDERS: { id: NonNullable<BoxStyle["border"]>; label: string }[] = [
  { id: "none", label: "None" },
  { id: "left", label: "Left bar" },
  { id: "box", label: "Frame" },
  { id: "top", label: "Top bar" },
  { id: "rules", label: "Lines" },
  { id: "dashed", label: "Dashed" },
  { id: "double", label: "Double" },
];

const ROLE_GROUPS: { role: FontRole; label: string }[] = [
  { role: "hand", label: "Handwriting" },
  { role: "script", label: "Script" },
  { role: "mono", label: "Typewriter" },
  { role: "sans", label: "Clean" },
  { role: "serif", label: "Book" },
  { role: "display", label: "Display" },
];

/** The innermost box around the cursor, so a box inside a box is styled on its own. */
function innermostBox(editor: Editor): { pos: number; attrs: Record<string, unknown> } | null {
  const { $from } = editor.state.selection;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name === "box") return { pos: $from.before(d), attrs: node.attrs };
  }
  return null;
}

/** Changes the innermost box's attributes without moving focus, so colour pickers keep working. */
function setBoxAttrs(editor: Editor, patch: Record<string, unknown>) {
  const hit = innermostBox(editor);
  if (hit) editor.view.dispatch(editor.state.tr.setNodeMarkup(hit.pos, undefined, { ...hit.attrs, ...patch }));
}

export function setBoxLook(editor: Editor, look: BoxLook | null) {
  const clean = cleanLook(look);
  setBoxAttrs(editor, { look: hasLook(clean) ? clean : null });
}

export function setBoxPreset(editor: Editor, preset: string | null) {
  setBoxAttrs(editor, { preset, look: null });
}

export function boxLookAtCursor(editor: Editor): { variant: string; look: BoxLook; preset: string | null } | null {
  const hit = innermostBox(editor);
  return hit ? { variant: String(hit.attrs.variant), look: cleanLook(hit.attrs.look), preset: typeof hit.attrs.preset === "string" ? hit.attrs.preset : null } : null;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <p className="text-[12px] font-medium tracking-wide text-soft uppercase">{label}</p>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

function Swatch({ colour, on, title, onClick, children }: { colour?: string; on: boolean; title: string; onClick: () => void; children?: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={on}
      onClick={onClick}
      className={cn("grid size-7 place-items-center rounded-full border text-[10px] text-ink-2", on ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary")}
      style={colour ? { background: colour } : undefined}
    >
      {children}
    </button>
  );
}

function Colours({ value, options, onChange, extra, custom }: { value: string | undefined; options: string[]; onChange: (v: string | undefined) => void; extra: { id: string | undefined; title: string; colour?: string; text: string }[]; custom: string }) {
  const isPreset = extra.some((e) => e.id === value) || options.includes(value ?? "");
  return (
    <>
      {extra.map((e) => (
        <Swatch key={e.title} title={e.title} colour={e.colour} on={value === e.id} onClick={() => onChange(e.id)}>
          {e.text}
        </Swatch>
      ))}
      {options.map((c) => (
        <Swatch key={c} title={c} colour={c} on={value === c} onClick={() => onChange(c)} />
      ))}
      <label title={custom} className={cn("relative grid size-7 cursor-pointer place-items-center overflow-hidden rounded-full border", !isPreset && value ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary")}>
        <span aria-hidden className="absolute inset-0" style={{ background: !isPreset && value?.startsWith("#") ? value : "conic-gradient(#e11d48, #f59e0b, #22c55e, #06b6d4, #6366f1, #e11d48)" }} />
        <input type="color" aria-label={custom} className="absolute inset-0 cursor-pointer opacity-0" value={value?.startsWith("#") ? value : "#b0412e"} onChange={(e) => onChange(e.target.value)} />
      </label>
    </>
  );
}

function Segments<T extends string | number>({ value, options, onChange, label }: { value: T | undefined; options: { v: T; label: React.ReactNode; title?: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={String(o.v)}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          title={o.title}
          aria-label={o.title}
          onClick={() => onChange(o.v)}
          className={cn("h-7 rounded border px-2 text-[12.5px]", value === o.v ? "border-primary bg-primary-soft text-primary" : "border-border bg-card hover:border-primary")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Stepper({ label, value, step, min, max, format, onChange }: { label: string; value: number; step: number; min: number; max: number; format: (v: number) => string; onChange: (v: number) => void }) {
  const clamp = (v: number) => Math.round(Math.min(max, Math.max(min, v)) * 100) / 100;
  return (
    <div className="flex h-8 items-center rounded border border-border bg-card" role="group" aria-label={label}>
      <button type="button" aria-label={`Less ${label.toLowerCase()}`} onClick={() => onChange(clamp(value - step))} className="grid h-full w-8 place-items-center text-ink-2 hover:text-ink">
        <Minus className="size-3.5" />
      </button>
      <span className="min-w-14 border-x border-border px-2 text-center text-[13px] tabular-nums">{format(value)}</span>
      <button type="button" aria-label={`More ${label.toLowerCase()}`} onClick={() => onChange(clamp(value + step))} className="grid h-full w-8 place-items-center text-ink-2 hover:text-ink">
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

const newId = () => Math.random().toString(36).slice(2, 10);

/** The preset menu in the block toolbar: the book's default for this kind, its named presets, or a new one. */
export function PresetPicker({ editor, variant, preset, look, book, onBookStyles }: { editor: Editor; variant: string; preset: string | null; look: BoxLook; book: BookBoxStyles; onBookStyles?: (next: BookBoxStyles) => void }) {
  const presets = cleanPresets(book.boxPresets).filter((p) => p.variant === variant);
  const def = boxDef(variant);
  return (
    <>
      <label htmlFor="box-preset" className="shrink-0 text-ink-2">
        Preset
      </label>
      <select
        id="box-preset"
        className="h-7 shrink-0 rounded border border-border bg-card px-1.5 text-[13px]"
        value={preset && presets.some((p) => p.id === preset) ? preset : ""}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "__new") {
            const name = window.prompt(`Name the new ${def.label.toLowerCase()} style`, `My ${def.label.toLowerCase()}`)?.trim();
            if (!name || !onBookStyles) return;
            const id = newId();
            // the new preset starts from how this block looks now
            const start = { ...(presetOf(book, preset, variant)?.look ?? {}), ...look };
            onBookStyles({ boxPresets: [...cleanPresets(book.boxPresets), { id, name: name.slice(0, 60), variant, look: start }] });
            setBoxPreset(editor, id);
          } else setBoxPreset(editor, v || null);
        }}
      >
        <option value="">{hasLook(look) ? "Default (changed)" : "Default"}</option>
        {presets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
        {onBookStyles && <option value="__new">+ New preset…</option>}
      </select>
    </>
  );
}

/**
 * Text, colours and border for one block. With a preset chosen, changes go to the preset and every
 * block that uses it; on Default they go to this block only. Print and ebook use the same values.
 */
export function BoxStylePanel({
  editor,
  variant,
  look,
  preset,
  book,
  onBookStyles,
  onClose,
  accent,
}: {
  editor: Editor;
  variant: string;
  look: BoxLook;
  preset: string | null;
  book: BookBoxStyles;
  /** saves the book's block styles (defaults per kind and presets) */
  onBookStyles?: (next: BookBoxStyles) => void;
  onClose: () => void;
  /** the book's colour, for the "book colour" swatches */
  accent: string;
}) {
  const [tab, setTab] = useState<"text" | "box">(boxDef(variant).box?.font === "hand" ? "text" : "box");
  const def = boxDef(variant);
  const p = presetOf(book, preset, variant);
  const st = boxStyle(variant, book, look, p?.id);
  const presets = cleanPresets(book.boxPresets);
  const set = (patch: BoxLook) => {
    const merge = (base: BoxLook) => {
      const next: Record<string, unknown> = { ...base, ...patch };
      for (const k of LOOK_KEYS) if (next[k] === undefined) delete next[k];
      return cleanLook(next);
    };
    if (p && onBookStyles) onBookStyles({ boxPresets: presets.map((x) => (x.id === p.id ? { ...x, look: merge(x.look) } : x)) });
    else setBoxLook(editor, merge(look));
  };
  const kindDefault = book.boxes?.[def.id];
  const fontValue = st.fontFamily ? `f:${st.fontFamily}` : `r:${st.font ?? "body"}`;
  const users = (() => {
    if (!p) return 0;
    let n = 0;
    editor.state.doc.descendants((node) => {
      if (node.type.name === "box" && node.attrs.preset === p.id) n++;
    });
    return n;
  })();

  return (
    <div role="dialog" aria-label={`Style for this ${def.label}`} className="fixed top-32 right-4 z-50 grid max-h-[calc(100dvh-9rem)] w-[min(23rem,calc(100vw-2rem))] gap-4 overflow-y-auto rounded-md border border-border bg-popover p-4 text-sm text-ink shadow-xl">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{def.label}</p>
          <p className="text-[12.5px] text-soft">
            {p ? (
              <>
                Preset: <span className="font-medium text-primary">{p.name}</span>. Changes apply to {users > 1 ? `all ${users} blocks in this chapter that use it` : "every block that uses it"}.
              </>
            ) : (
              "Changes apply to this block only."
            )}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-7 place-items-center rounded text-soft hover:bg-muted hover:text-ink">
          <X className="size-4" />
        </button>
      </div>

      <div role="tablist" aria-label="Style" className="flex gap-4 border-b border-border">
        {(
          [
            ["text", "Text"],
            ["box", "Colours and border"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cn("-mb-px border-b-2 pb-1.5 text-[13px] font-medium", tab === id ? "border-primary text-primary" : "border-transparent text-ink-2 hover:text-ink")}>
            {label}
          </button>
        ))}
      </div>

      {tab === "text" ? (
        <>
          <Row label="Font">
            <select
              aria-label="Font"
              value={fontValue}
              onChange={(e) => {
                const v = e.target.value;
                if (v.startsWith("f:")) set({ fontFamily: v.slice(2) });
                else set({ font: v.slice(2) as BoxFont, fontFamily: undefined });
              }}
              className="h-8 max-w-full flex-1 rounded border border-border bg-card px-2 text-[13px]"
              style={{ fontFamily: st.fontFamily ? `'${st.fontFamily}', cursive` : undefined }}
            >
              <optgroup label="From the book">
                <option value="r:body">Book text</option>
                <option value="r:heading">Heading font</option>
              </optgroup>
              {ROLE_GROUPS.map((g) => (
                <optgroup key={g.role} label={g.label}>
                  {FONTS.filter((f) => f.role === g.role).map((f) => (
                    <option key={f.family} value={`f:${f.family}`} style={{ fontFamily: `'${f.family}'` }}>
                      {f.family}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Row>
          <Row label="Size and line spacing">
            <Stepper label="Size" value={st.size ?? 1} step={0.05} min={0.6} max={2.5} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ size: v })} />
            <Stepper label="Line spacing" value={st.leading ?? 1.45} step={0.05} min={0.9} max={2.6} format={(v) => `${v.toFixed(2)}×`} onChange={(v) => set({ leading: v })} />
          </Row>
          <Row label="Weight and alignment">
            <button
              type="button"
              aria-pressed={!!st.bold}
              title="Bold"
              aria-label="Bold"
              onClick={() => set({ bold: !st.bold })}
              className={cn("grid h-7 w-8 place-items-center rounded border", st.bold ? "border-primary bg-primary-soft text-primary" : "border-border bg-card hover:border-primary")}
            >
              <Bold className="size-4" />
            </button>
            <button
              type="button"
              aria-pressed={!!st.italic}
              title="Italic"
              aria-label="Italic"
              onClick={() => set({ italic: !st.italic })}
              className={cn("grid h-7 w-8 place-items-center rounded border", st.italic ? "border-primary bg-primary-soft text-primary" : "border-border bg-card hover:border-primary")}
            >
              <Italic className="size-4" />
            </button>
            <Segments
              label="Alignment"
              value={st.align ?? "left"}
              options={[
                { v: "left", label: <AlignLeft className="size-4" />, title: "Left" },
                { v: "center", label: <AlignCenter className="size-4" />, title: "Centre" },
                { v: "right", label: <AlignRight className="size-4" />, title: "Right" },
              ]}
              onChange={(v) => set({ align: v as BoxStyle["align"] })}
            />
          </Row>
          <Row label="Text colour">
            <Colours value={st.text} options={INKS} onChange={(v) => set({ text: v })} custom="Choose any text colour" extra={[{ id: undefined, title: "The book's text colour", text: "Aa" }]} />
          </Row>
          {def.box?.label !== undefined && (
            <Row label="Heading colour">
              <Colours value={st.labelColor ?? "accent"} options={INKS} onChange={(v) => set({ labelColor: v })} custom="Choose any heading colour" extra={[{ id: "accent", title: "The book's colour", text: "", colour: accent }]} />
            </Row>
          )}
        </>
      ) : (
        <>
          <Row label="Background">
            <Colours
              value={st.fill ?? "none"}
              options={FILLS}
              onChange={(v) => set({ fill: v })}
              custom="Choose any background colour"
              extra={[
                { id: "none", title: "No background", text: "∅" },
                { id: "accent", title: "A pale tint of the book's colour", text: "", colour: paleTint(accent) },
              ]}
            />
          </Row>
          <Row label="Border">
            <Segments label="Border" value={st.border ?? "none"} options={BORDERS.map((b) => ({ v: b.id, label: b.label }))} onChange={(v) => set({ border: v })} />
          </Row>
          {st.border && st.border !== "none" && (
            <>
              <Row label="Border colour">
                <Colours value={st.line ?? (st.accent ? "accent" : undefined)} options={INKS} onChange={(v) => set({ line: v ?? "#cfc8bb" })} custom="Choose any border colour" extra={[{ id: "accent", title: "The book's colour", text: "", colour: accent }]} />
              </Row>
              <Row label="Thickness">
                <Segments
                  label="Thickness"
                  value={st.weight ?? 1}
                  options={[
                    { v: 1, label: "Thin" },
                    { v: 2, label: "Medium" },
                    { v: 3, label: "Thick" },
                  ]}
                  onChange={(v) => set({ weight: v })}
                />
              </Row>
            </>
          )}
          <Row label="Corners">
            <Segments
              label="Corners"
              value={st.corners ?? (st.border === "box" || st.border === "dashed" ? 1 : 0)}
              options={[
                { v: 0, label: "Square" },
                { v: 1, label: "Slight" },
                { v: 2, label: "Round" },
              ]}
              onChange={(v) => set({ corners: v })}
            />
          </Row>
          <p className="text-[12px] text-soft">Colours print in colour on a colour interior. A black-and-white print book shows them as shades of grey.</p>
        </>
      )}

      <div className="grid gap-2 border-t border-border pt-3">
        {!p && onBookStyles && (
          <button
            type="button"
            disabled={!hasLook(look)}
            onClick={() => {
              onBookStyles({ boxes: { ...(book.boxes ?? {}), [def.id]: cleanLook({ ...(kindDefault ?? {}), ...look }) } });
              setBoxLook(editor, null);
            }}
            className="h-8 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground disabled:opacity-50"
          >
            Make this the default for every {def.label.toLowerCase()}
          </button>
        )}
        <div className="flex flex-wrap gap-2">
          {!p && (
            <button type="button" disabled={!hasLook(look)} onClick={() => setBoxLook(editor, null)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-[13px] hover:border-primary disabled:opacity-50">
              <RotateCcw className="size-3.5" /> Reset this block
            </button>
          )}
          {p && onBookStyles && (
            <button
              type="button"
              onClick={() => {
                const name = window.prompt("Rename this preset", p.name)?.trim();
                if (name) onBookStyles({ boxPresets: presets.map((x) => (x.id === p.id ? { ...x, name: name.slice(0, 60) } : x)) });
              }}
              className="h-8 rounded-md border border-border px-3 text-[13px] hover:border-primary"
            >
              Rename preset
            </button>
          )}
          {p && onBookStyles && (
            <button
              type="button"
              onClick={() => {
                if (!window.confirm(`Delete the preset "${p.name}"? Blocks that use it go back to the default look.`)) return;
                onBookStyles({ boxPresets: presets.filter((x) => x.id !== p.id) });
                setBoxPreset(editor, null);
              }}
              className="h-8 rounded-md border border-border px-3 text-[13px] text-destructive hover:border-destructive"
            >
              Delete preset
            </button>
          )}
          {!p && onBookStyles && kindDefault && (
            <button
              type="button"
              onClick={() => {
                const boxes = { ...(book.boxes ?? {}) };
                delete boxes[def.id];
                onBookStyles({ boxes });
              }}
              className="h-8 rounded-md border border-border px-3 text-[13px] hover:border-primary"
            >
              Original {def.label.toLowerCase()} look
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
