"use client";

import { useRef, useState } from "react";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { AlignCenter, AlignLeft, AlignRight, Captions, GripVertical, ImageUp, Maximize2, Trash2, Type } from "lucide-react";
import { BookImage } from "./editor-extensions";
import { openInEditor } from "./context-menu";
import { cn } from "@/lib/utils";
import { pictureAlign, pictureWidth } from "@/lib/picture";

const SIZES: [string, number][] = [
  ["S", 33],
  ["M", 50],
  ["L", 75],
];

/**
 * A picture in the manuscript. Click it for a toolbar (place it left, centre, right or across the
 * page, pick a size, add a caption or a description, replace or delete it); drag a corner to resize;
 * drag the grip to move it. Right-click offers the same.
 */
function PictureView({ node, selected, updateAttributes, deleteNode, editor, getPos }: NodeViewProps) {
  const align = pictureAlign(node.attrs.layout);
  const width = pictureWidth(node.attrs);
  const box = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState<number | null>(null);
  const shown = live ?? width;
  const editable = editor.isEditable;
  const uploading = typeof node.attrs.src === "string" && node.attrs.src.startsWith("blob:");

  const select = () => {
    const pos = typeof getPos === "function" ? getPos() : undefined;
    if (typeof pos === "number") editor.commands.setNodeSelection(pos);
  };
  const open = (what: "image-caption" | "image-alt" | "image-replace") => {
    select();
    openInEditor(editor, what);
  };

  function startResize(e: React.PointerEvent, side: 1 | -1) {
    e.preventDefault();
    e.stopPropagation();
    const column = (editor.view.dom as HTMLElement).clientWidth || 600;
    const startX = e.clientX;
    const start = width;
    // a centred picture grows on both sides, so a pointer move counts double
    const k = align === "center" ? 2 : 1;
    let last = start;
    const move = (ev: PointerEvent) => {
      last = Math.max(15, Math.min(100, Math.round(start + (side * k * (ev.clientX - startX) * 100) / column)));
      setLive(last);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setLive(null);
      updateAttributes({ width: last, layout: last >= 100 ? "full" : align === "full" ? "center" : align });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  const tool = "inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded px-1.5 text-[12px] font-medium text-ink hover:bg-paper-2";
  const on = "bg-primary-soft text-primary";

  return (
    <NodeViewWrapper
      as="figure"
      data-layout={align}
      className={cn("jp-picture group relative", selected && "is-selected")}
      // the node's outer box carries the place and width (see attrs below); while resizing, stretch inside it
      style={{ width: `${(shown / width) * 100}%` }}
      contentEditable={false}
    >
      {selected && editable && (
        <div
          role="toolbar"
          aria-label="Picture"
          className={cn(
            "absolute bottom-full z-20 mb-2 flex max-w-[calc(100vw-2rem)] items-center gap-0.5 overflow-x-auto whitespace-nowrap rounded-lg border border-border bg-card p-1 font-sans shadow-lg",
            // keep the toolbar over the text column: pinned to the picture's outer edge when it sits to one side
            align === "right" ? "right-0" : align === "left" ? "left-0" : "left-1/2 -translate-x-1/2",
          )}
          onMouseDown={(e) => e.preventDefault()}
        >
          <button type="button" className={cn(tool, align === "left" && on)} title="Left, text flows round it" aria-label="Left" aria-pressed={align === "left"} onClick={() => updateAttributes({ layout: "left", width: Math.min(width, 60) })}>
            <AlignLeft className="size-4" />
          </button>
          <button type="button" className={cn(tool, align === "center" && on)} title="Centred on its own line" aria-label="Centre" aria-pressed={align === "center"} onClick={() => updateAttributes({ layout: "center", width: width >= 100 ? 85 : width })}>
            <AlignCenter className="size-4" />
          </button>
          <button type="button" className={cn(tool, align === "right" && on)} title="Right, text flows round it" aria-label="Right" aria-pressed={align === "right"} onClick={() => updateAttributes({ layout: "right", width: Math.min(width, 60) })}>
            <AlignRight className="size-4" />
          </button>
          <button type="button" className={cn(tool, align === "full" && on)} title="Across the whole text width" aria-label="Full width" aria-pressed={align === "full"} onClick={() => updateAttributes({ layout: "full", width: 100 })}>
            <Maximize2 className="size-4" />
          </button>
          <span className="mx-0.5 h-5 w-px bg-border" />
          {SIZES.map(([label, w]) => (
            <button key={label} type="button" className={cn(tool, width === w && on)} title={`${w}% of the text width`} aria-label={`Size ${label}`} aria-pressed={width === w} onClick={() => updateAttributes({ width: w, layout: align === "full" ? "center" : align })}>
              {label}
            </button>
          ))}
          <span className="mx-0.5 h-5 w-px bg-border" />
          <button type="button" className={tool} title="Caption under the picture" onClick={() => open("image-caption")}>
            <Captions className="size-4" /> <span className="hidden sm:inline">Caption</span>
          </button>
          <button type="button" className={tool} title="Describe the picture for screen readers" onClick={() => open("image-alt")}>
            <Type className="size-4" /> <span className="hidden sm:inline">Alt text</span>
          </button>
          <button type="button" className={tool} title="Replace the picture" aria-label="Replace" onClick={() => open("image-replace")}>
            <ImageUp className="size-4" />
          </button>
          <button type="button" className={cn(tool, "text-red-600 hover:bg-red-50 dark:hover:bg-red-950")} title="Delete the picture" aria-label="Delete picture" onClick={() => deleteNode()}>
            <Trash2 className="size-4" />
          </button>
        </div>
      )}
      <div ref={box} className="relative" onClick={select}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={node.attrs.src} alt={node.attrs.alt ?? ""} title={node.attrs.alt ?? undefined} draggable={false} className={cn("block w-full", uploading && "opacity-60")} />
        {uploading && <span className="absolute inset-x-0 bottom-2 mx-auto w-max rounded bg-black/70 px-2 py-0.5 font-sans text-[12px] text-white">Uploading…</span>}
        {editable && (
          <span
            data-drag-handle
            draggable
            title="Drag to move"
            aria-label="Drag to move"
            className={cn("absolute top-1.5 left-1.5 grid size-7 cursor-grab place-items-center rounded bg-card/90 text-ink shadow transition-opacity", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}
          >
            <GripVertical className="size-4" />
          </span>
        )}
        {selected && editable && (
          <>
            {([-1, 1] as const).map((side) => (
              <span
                key={side}
                role="separator"
                aria-label={side < 0 ? "Resize from the left" : "Resize from the right"}
                onPointerDown={(e) => startResize(e, side)}
                className={cn("absolute top-1/2 h-10 w-2.5 -translate-y-1/2 cursor-ew-resize rounded-full border-2 border-white bg-primary shadow", side < 0 ? "-left-1.5" : "-right-1.5")}
              />
            ))}
            <span className="absolute right-1.5 bottom-1.5 rounded bg-black/70 px-1.5 py-0.5 font-sans text-[11px] text-white">{shown}%</span>
          </>
        )}
      </div>
      {node.attrs.title ? <figcaption>{node.attrs.title}</figcaption> : null}
    </NodeViewWrapper>
  );
}

/** The picture node with its editing view, for the manuscript editor only (exports use BookImage). */
export const EditableBookImage = BookImage.extend({
  draggable: true,
  addNodeView() {
    return ReactNodeViewRenderer(PictureView, {
      attrs: ({ node }) => ({ "data-layout": pictureAlign(node.attrs.layout), style: `width: ${pictureWidth(node.attrs)}%` }),
    });
  },
});
