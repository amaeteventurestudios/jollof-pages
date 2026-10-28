"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ELEMENT_KINDS, SECTION_LABELS, elementKind } from "@/lib/elements";
import { orderedElements } from "@/lib/book-model";
import { getTheme } from "@/lib/themes";
import { bookFormat, type Chapter, type Section } from "@/lib/types";
import { fmt } from "@/lib/progress";
import { cn } from "@/lib/utils";
import type { Workspace } from "./workspace";

const STATUS_DOT: Record<Chapter["status"], string> = {
  draft: "bg-paper-3",
  revised: "bg-[#d39b2a]",
  final: "bg-primary",
};

function Row({ c, label, active, onSelect }: { c: Chapter; label: string; active: boolean; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: c.id });
  const kind = elementKind(c.kind);
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("group relative", isDragging && "z-10 opacity-80")}>
      <div className={cn("flex items-center rounded", active ? "bg-primary-soft" : "hover:bg-paper-2")}>
        <button type="button" aria-label={`Reorder ${c.title}`} className="cursor-grab touch-none p-1.5 text-soft opacity-60 group-hover:opacity-100" {...attributes} {...listeners}>
          <GripVertical className="size-3.5" />
        </button>
        <button type="button" onClick={onSelect} aria-current={active ? "true" : undefined} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-2 text-left">
          <span className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[c.status] ?? STATUS_DOT.draft)} title={`Status: ${c.status}`} />
          <span className="min-w-0 flex-1">
            <span className={cn("block truncate text-sm", active ? "font-medium text-primary" : "text-ink")}>{c.title || kind.label}</span>
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

export function ChapterSidebar({ ws, activeId, onSelect, onAdd }: { ws: Workspace; activeId: string | null; onSelect: (id: string) => void; onAdd: (kind: string) => void }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const theme = getTheme(bookFormat(ws.book).theme);
  const labels = new Map(orderedElements(ws.chapters, theme).map((e) => [e.chapter.id, e.label]));
  const sections: Section[] = ["front", "body", "back"];

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
                <h3 className="text-[13px] font-semibold text-ink-2">{SECTION_LABELS[section]}</h3>
                <DropdownMenu>
                  <DropdownMenuTrigger aria-label={`Add to ${SECTION_LABELS[section]}`} className="rounded p-1 text-soft hover:bg-paper-2 hover:text-ink">
                    <Plus className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                    {ELEMENT_KINDS.filter((k) => k.section === section).map((k) => (
                      <DropdownMenuItem key={k.id} onSelect={() => onAdd(k.id)} className="flex-col items-start gap-0">
                        <span>{k.label}</span>
                        <span className="text-[13px] text-soft">{k.hint}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => onDragEnd(section, e)}>
                <SortableContext items={list.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  <ul className="grid gap-0.5">
                    {list.map((c) => (
                      <Row key={c.id} c={c} label={labels.get(c.id) ?? ""} active={c.id === activeId} onSelect={() => onSelect(c.id)} />
                    ))}
                    {!list.length && <li className="px-2 py-1 text-[13px] text-soft">Nothing here yet.</li>}
                  </ul>
                </SortableContext>
              </DndContext>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-border bg-card p-3">
        <button
          type="button"
          onClick={() => onAdd("chapter")}
          className="flex h-11 w-full items-center justify-center gap-2 bg-primary text-[15px] font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Plus className="size-4.5" />
          Add new chapter
        </button>
        <p className="mt-1.5 text-center text-xs text-soft">Other pages, like a foreword or glossary, are under the + by each section.</p>
      </div>
    </div>
  );
}
