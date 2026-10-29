"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ELEMENT_KINDS, SECTION_LABELS, elementKind } from "@/lib/elements";
import { orderedElements } from "@/lib/book-model";
import { themeFor } from "@/lib/themes";
import { bookFormat, type Chapter, type Section } from "@/lib/types";
import { fmt } from "@/lib/progress";
import { cn } from "@/lib/utils";
import type { Workspace } from "./workspace";
import { AiSuggest } from "../ai-suggest";

const STATUS_DOT: Record<Chapter["status"], string> = {
  draft: "bg-paper-3",
  revised: "bg-[#d39b2a]",
  final: "bg-primary",
};

function Row({ c, label, active, onSelect, fixed }: { c: Chapter; label: string; active: boolean; onSelect: () => void; fixed: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: c.id, disabled: fixed });
  const kind = elementKind(c.kind);
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("group relative", isDragging && "z-10 opacity-80")}>
      <div className={cn("flex items-center rounded", active ? "bg-primary-soft" : "hover:bg-paper-2")}>
        {fixed ? (
          <span className="w-2" />
        ) : (
          <button type="button" aria-label={`Reorder ${c.title}`} className="cursor-grab touch-none p-1.5 text-soft opacity-60 group-hover:opacity-100 app:p-3 app:opacity-100" {...attributes} {...listeners}>
            <GripVertical className="size-3.5" />
          </button>
        )}
        <button type="button" onClick={onSelect} aria-current={active ? "true" : undefined} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-2 text-left app:min-h-14 app:gap-3 app:py-2.5">
          <span className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[c.status] ?? STATUS_DOT.draft)} title={`Status: ${c.status}`} />
          <span className="min-w-0 flex-1">
            <span className={cn("block truncate text-sm app:text-base", active ? "font-medium text-primary" : "text-ink")}>{c.title || kind.label}</span>
            <span className="block truncate text-[13px] text-soft">
              {label || kind.label}
              {!kind.smart && c.word_count ? ` · ${fmt(c.word_count)} words` : ""}
              {c.is_sample ? " · sample" : ""}
            </span>
          </span>
        </button>
      </div>
    </li>
  );
}

export function ChapterSidebar({ ws, activeId, onSelect, onAdd }: { ws: Workspace; activeId: string | null; onSelect: (id: string) => void; onAdd: (kind: string, titles?: string[]) => void }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const theme = themeFor(bookFormat(ws.book));
  const labels = new Map(orderedElements(ws.chapters, theme).map((e) => [e.chapter.id, e.label]));
  const sections: Section[] = ["front", "body", "back"];
  // editors and commenters work inside the chapters; only the author and co-writers shape the book
  const fixed = ws.role !== "owner" && ws.role !== "cowriter";
  const [adding, setAdding] = useState<Section | null>(null);

  async function onDragEnd(section: Section, e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const list = ws.chapters.filter((c) => c.section === section);
    const from = list.findIndex((c) => c.id === active.id);
    const to = list.findIndex((c) => c.id === over.id);
    const moved = arrayMove(list, from, to).map((c, i) => ({ ...c, order: i }));
    ws.setChapters((all) => [...all.filter((c) => c.section !== section), ...moved].sort((a, b) => sections.indexOf(a.section) - sections.indexOf(b.section) || a.order - b.order));
    const { pb } = await import("@/lib/pb");
    await ws.track(Promise.all(moved.map((c) => pb().collection("chapters").update(c.id, { order: c.order }))));
  }

  return (
    <div className="flex h-full flex-col">
      <nav aria-label="Chapters" className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 py-3">
        {sections.map((section) => {
          const list = ws.chapters.filter((c) => c.section === section);
          return (
            <div key={section} className="mb-4">
              <div className="flex items-center justify-between px-2 pb-1">
                <h3 className="flex-1 text-[13px] font-semibold text-ink-2">{SECTION_LABELS[section]}</h3>
                {!fixed && section === "body" && (
                  <AiSuggest kind="outline" bookId={ws.book.id} align="left" label="Outline" onPick={(t) => onAdd("chapter", [t])} onPickAll={(all) => onAdd("chapter", all)} />
                )}
                {!fixed && (
                  <button
                    type="button"
                    onClick={() => setAdding(section)}
                    aria-label={`Add to ${SECTION_LABELS[section]}`}
                    className="rounded p-1 text-soft hover:bg-paper-2 hover:text-ink app:grid app:size-11 app:place-items-center"
                  >
                    <Plus className="size-4" />
                  </button>
                )}
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => onDragEnd(section, e)}>
                <SortableContext items={list.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  <ul className="grid gap-0.5">
                    {list.map((c) => (
                      <Row key={c.id} c={c} label={labels.get(c.id) ?? ""} active={c.id === activeId} onSelect={() => onSelect(c.id)} fixed={fixed} />
                    ))}
                    {!list.length && <li className="px-2 py-1 text-[13px] text-soft">Nothing here yet.</li>}
                  </ul>
                </SortableContext>
              </DndContext>
            </div>
          );
        })}
      </nav>
      {!fixed && (
        <div className="border-t border-border bg-card p-3 app:pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => onAdd("chapter")}
            className="flex h-11 w-full items-center justify-center gap-2 bg-primary text-[15px] font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Plus className="size-4.5" />
            Add new chapter
          </button>
          <button type="button" onClick={() => setAdding("front")} className="mt-1.5 block w-full text-center text-xs text-soft underline-offset-2 hover:text-primary hover:underline">
            {ELEMENT_KINDS.length} kinds of page: prologue, map, recipe, glossary… Add one
          </button>
        </div>
      )}
      <SectionPicker
        open={adding !== null}
        section={adding ?? "front"}
        onSection={setAdding}
        onClose={() => setAdding(null)}
        onPick={(id) => {
          setAdding(null);
          onAdd(id);
        }}
      />
    </div>
  );
}

/** Every kind of page a book can have, by part of the book, searchable. */
function SectionPicker({ open, section, onSection, onClose, onPick }: { open: boolean; section: Section; onSection: (s: Section) => void; onClose: () => void; onPick: (kind: string) => void }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return ELEMENT_KINDS.filter((k) => (s ? `${k.label} ${k.hint}`.toLowerCase().includes(s) : k.section === section));
  }, [q, section]);
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setQ("");
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl grid-cols-1 gap-3 [&>*]:min-w-0">
        <DialogTitle>Add a page</DialogTitle>
        <DialogDescription>{ELEMENT_KINDS.length} kinds of page. Each one is laid out for print and the ebook.</DialogDescription>
        <label className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3">
          <Search className="size-4 text-soft" aria-hidden />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: prologue, map, recipe…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label="Search pages" />
        </label>
        {!q && (
          <div className="flex gap-1.5" role="tablist" aria-label="Part of the book">
            {(["front", "body", "back"] as Section[]).map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={section === s}
                onClick={() => onSection(s)}
                className={cn("rounded-full border px-3 py-1 text-[13px]", section === s ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary")}
              >
                {SECTION_LABELS[s]} · {ELEMENT_KINDS.filter((k) => k.section === s).length}
              </button>
            ))}
          </div>
        )}
        <div className="grid max-h-[55vh] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
          {shown.map((k) => (
            <button key={k.id} type="button" onClick={() => onPick(k.id)} className="rounded-lg border border-border bg-card p-3 text-left transition hover:border-primary hover:shadow-sm">
              <span className="block text-sm font-medium">{k.label}</span>
              <span className="block text-[12.5px] leading-snug text-soft">{k.hint}</span>
            </button>
          ))}
          {!shown.length && <p className="col-span-2 py-6 text-center text-sm text-soft">No page matches “{q}”.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
