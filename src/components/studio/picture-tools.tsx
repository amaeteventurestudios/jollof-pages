"use client";

import { useEffect, useState } from "react";
import { NodeSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { PromptDialog } from "./prompt-dialog";
import { ImagePickerDialog, assetUrl, uploadAssets } from "./image-library";
import type { EditorOpen } from "./context-menu";

/** Pictures in a drop or paste, if any. */
export function pictureFiles(data: DataTransfer | null): File[] {
  return Array.from(data?.files ?? []).filter((f) => f.type.startsWith("image/"));
}

/**
 * Put dropped or pasted pictures into the chapter at `pos`. Each shows straight away from the
 * computer while it uploads (as WebP, see lib/webp.ts) to the author's image library, then
 * switches to the uploaded copy. A failed upload takes its picture out again and says why.
 */
export async function placePictures(editor: Editor, files: File[], pos: number, bookId: string, onError: (msg: string) => void) {
  const local = files.map((f) => ({ file: f, url: URL.createObjectURL(f) }));
  const at = blockGap(editor, pos);
  editor
    .chain()
    .focus()
    .insertContentAt(
      at,
      local.map(({ file, url }) => ({ type: "image", attrs: { src: url, alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "), layout: "center" } })),
    )
    .run();
  for (const { file, url } of local) {
    try {
      const [asset] = await uploadAssets([file], bookId);
      if (!asset) throw new Error("not a picture");
      swapSrc(editor, url, assetUrl(asset));
    } catch (e) {
      swapSrc(editor, url, null);
      onError(`Could not upload ${file.name}: ${String((e as Error)?.message ?? e)}`);
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    }
  }
}

/**
 * A picture goes between paragraphs, never inside one: dropped in a paragraph's first half it lands
 * before it (so a picture placed left or right has that paragraph flow round it), else after it.
 */
export function blockGap(editor: Editor, pos: number): number {
  const doc = editor.state.doc;
  const $p = doc.resolve(Math.max(0, Math.min(pos, doc.content.size)));
  // already between blocks; otherwise step out of the text block (staying inside a list or box)
  if ($p.depth === 0 || !$p.parent.isTextblock) return $p.pos;
  return $p.parentOffset <= $p.parent.content.size / 2 ? $p.before() : $p.after();
}

/** Point every picture showing `from` at `to`, or remove them when `to` is null. */
function swapSrc(editor: Editor, from: string, to: string | null) {
  if (editor.isDestroyed) return;
  const tr = editor.state.tr;
  const hits: { pos: number; size: number }[] = [];
  editor.state.doc.descendants((n, pos) => {
    if (n.type.name === "image" && n.attrs.src === from) hits.push({ pos, size: n.nodeSize });
  });
  for (const h of hits.reverse()) {
    if (to) tr.setNodeAttribute(h.pos, "src", to);
    else tr.delete(h.pos, h.pos + h.size);
  }
  if (hits.length) editor.view.dispatch(tr);
}

/** The selected picture, if a picture is selected. */
function selectedPicture(editor: Editor): { pos: number; attrs: Record<string, unknown> } | null {
  const sel = editor.state.selection;
  if (sel instanceof NodeSelection && sel.node.type.name === "image") return { pos: sel.from, attrs: sel.node.attrs };
  return null;
}

/** Caption, alt text and replace dialogs for the picture toolbar and the right-click menu. */
export function PictureDialogs({ editor, bookId }: { editor: Editor; bookId: string }) {
  const [open, setOpen] = useState<null | "image-caption" | "image-alt" | "image-replace">(null);
  const [target, setTarget] = useState<{ pos: number; attrs: Record<string, unknown> } | null>(null);
  useEffect(() => {
    const dom = editor.view.dom;
    const h = (e: Event) => {
      const what = (e as CustomEvent<EditorOpen>).detail;
      if (what !== "image-caption" && what !== "image-alt" && what !== "image-replace") return;
      const hit = selectedPicture(editor);
      if (!hit) return;
      setTarget(hit);
      setOpen(what);
    };
    dom.addEventListener("jp-open", h);
    return () => dom.removeEventListener("jp-open", h);
  }, [editor]);

  const set = (attrs: Record<string, unknown>) => {
    const t = target;
    if (!t) return;
    const n = editor.state.doc.nodeAt(t.pos);
    if (!n || n.type.name !== "image") return;
    editor.view.dispatch(editor.state.tr.setNodeMarkup(t.pos, undefined, { ...n.attrs, ...attrs }));
    editor.commands.setNodeSelection(t.pos);
  };
  const close = () => setOpen(null);
  const a = target?.attrs ?? {};
  return (
    <>
      <PromptDialog
        open={open === "image-caption"}
        title="Picture caption"
        label="Shown under the picture in the book. Leave empty for none."
        initial={String(a.title ?? "")}
        onClose={close}
        onSubmit={(v) => set({ title: v.trim() || null })}
      />
      <PromptDialog
        open={open === "image-alt"}
        title="Describe this picture"
        label="Read aloud to readers who can't see it, and used by ebook stores. One or two plain sentences."
        initial={String(a.alt ?? "")}
        multiline
        onClose={close}
        onSubmit={(v) => set({ alt: v.trim() })}
      />
      <ImagePickerDialog
        open={open === "image-replace"}
        onOpenChange={(v) => !v && close()}
        bookId={bookId}
        title="Replace the picture"
        description="Pick another of your images or upload a new one. Its place, size and caption stay."
        onPick={(asset) => set({ src: assetUrl(asset), alt: asset.alt || a.alt || "" })}
      />
    </>
  );
}
