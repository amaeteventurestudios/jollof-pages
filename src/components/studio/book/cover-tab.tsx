"use client";

import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import { Download, ImagePlus, Loader2, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CoverStage, COVER_FONTS, COVER_FONTS_HREF, TEMPLATES, U, defaultDesign, useImage, type CoverDesign } from "./cover-designer";
import { CoverKit } from "./cover-kit";
import { AiCoverPanel } from "./ai-cover-panel";
import { artSpec, preflight } from "@/lib/cover-kit";
import { BookCover } from "@/components/book-cover";
import { coverGeometry, inches } from "@/lib/kdp";
import { bookFormat, printEdition } from "@/lib/types";
import { download, userId } from "@/lib/studio";
import { errorMessage, fileUrl, pb } from "@/lib/pb";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { usePageCount } from "./format-tab";
import type { Workspace } from "./workspace";
import { toWebp } from "@/lib/webp";

function dataUrlToBlob(url: string): Blob {
  const [head, b64] = url.split(",");
  const type = head.match(/data:([^;]+)/)?.[1] ?? "image/png";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

export function CoverTab({ ws }: { ws: Workspace }) {
  const { book } = ws;
  const f = bookFormat(book);
  const [mode, setMode] = useState<"ebook" | "print" | "hardcover">("ebook");
  const binding = mode === "hardcover" ? "hardcover" : "paperback";
  const wrap = mode !== "ebook";
  const { pages, estimated } = usePageCount(ws, binding);
  const edition = printEdition(f, binding);
  const g = coverGeometry(edition.trim, pages, edition.paper, binding);
  const modes = f.hardcover || mode === "hardcover" ? (["ebook", "print", "hardcover"] as const) : (["ebook", "print"] as const);
  const editionName = binding === "hardcover" ? "Hardcover" : "Paperback";
  const [design, setDesign] = useState<CoverDesign>(() => ({ ...defaultDesign(), ...((book.cover_design as Partial<CoverDesign>) ?? {}) }));
  const [guides, setGuides] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [fontsReady, setFontsReady] = useState(0);
  const stageRef = useRef<Konva.Stage>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxWidth, setBoxWidth] = useState(800);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBoxWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    // Konva draws to canvas, so fonts must finish loading before text is measured
    Promise.all(COVER_FONTS.flatMap((ff) => [document.fonts.load(`400 40px "${ff}"`), document.fonts.load(`700 40px "${ff}"`)])).then(() => setFontsReady((n) => n + 1));
  }, []);

  function update(patch: Partial<CoverDesign>) {
    setDesign((d) => {
      const next = { ...d, ...patch };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => ws.saveBook({ cover_design: next }), 800);
      return next;
    });
  }

  const panelW = mode === "ebook" ? 6.25 : g.width;
  const panelH = mode === "ebook" ? 10 : g.height;
  const zoom = Math.min((boxWidth - 8) / (panelW * U), (mode === "ebook" ? 640 : 560) / (panelH * U));
  const authorName = book.expand?.author?.name || "Author name";
  const spec = artSpec(g);
  const frontImg = useImage(design.imageUrl);
  const backImg = useImage(design.backImageUrl);
  const checks = preflight({
    g,
    pagesEstimated: estimated,
    front: frontImg && { width: frontImg.naturalWidth, height: frontImg.naturalHeight },
    back: backImg && { width: backImg.naturalWidth, height: backImg.naturalHeight },
    frontText: design.frontText,
    title: design.title,
    author: design.author,
    centered: design.template === "framed",
    blurb: design.showBlurb,
    description: book.description,
  });

  async function withoutGuides<T>(fn: (stage: Konva.Stage) => T): Promise<T> {
    const stage = stageRef.current!;
    const guideLayer = stage.getLayers()[1];
    guideLayer?.hide();
    try {
      return fn(stage);
    } finally {
      guideLayer?.show();
    }
  }

  async function saveEbookCover() {
    setBusy("ebook");
    setMsg("");
    try {
      const url = await withoutGuides((s) => s.toDataURL({ mimeType: "image/jpeg", quality: 0.92, pixelRatio: 1600 / (6.25 * U * zoom) }));
      const blob = dataUrlToBlob(url);
      const fd = new FormData();
      fd.append("cover", new File([blob], `${slugify(book.title)}-cover.jpg`, { type: "image/jpeg" }));
      fd.append("cover_design", JSON.stringify(design));
      const updated = await ws.track(pb().collection("books").update(book.id, fd, { expand: "author" }));
      ws.setBook((b) => (b ? { ...b, cover: updated.cover } : b));
      setMsg("Saved as the ebook cover (1600 x 2560 px). It is also used on your website.");
    } catch (e) {
      setMsg(`Could not save: ${errorMessage(e)}`);
    } finally {
      setBusy(null);
    }
  }

  async function exportPrintCover() {
    setBusy("print");
    setMsg("");
    try {
      const url = await withoutGuides((s) => s.toDataURL({ mimeType: "image/jpeg", quality: 0.95, pixelRatio: 3 / zoom }));
      const { PDFDocument } = await import("pdf-lib");
      const pdf = await PDFDocument.create();
      pdf.setTitle(`${book.title} – cover`);
      const jpg = await pdf.embedJpg(await dataUrlToBlob(url).arrayBuffer());
      const page = pdf.addPage([g.width * 72, g.height * 72]);
      page.drawImage(jpg, { x: 0, y: 0, width: g.width * 72, height: g.height * 72 });
      const bytes = await pdf.save();
      const field = binding === "hardcover" ? "cover_hardcover" : "cover_full";
      const file = new File([bytes as BlobPart], `${slugify(book.title)}-${binding}-cover.pdf`, { type: "application/pdf" });
      const updated = await ws.track(pb().collection("books").update(book.id, { [field]: file, cover_design: design }));
      ws.setBook((b) => (b ? { ...b, [field]: updated[field] } : b));
      download(bytes, file.name, "application/pdf");
      setMsg(`${editionName} cover PDF saved: ${inches(g.width)} x ${inches(g.height)} at 300 dpi for ${pages} pages on ${edition.paper} paper.`);
    } catch (e) {
      setMsg(`Could not export: ${errorMessage(e)}`);
    } finally {
      setBusy(null);
    }
  }

  async function uploadImage(file: File, side: "front" | "back" = "front") {
    setBusy(side === "front" ? "image" : "back");
    try {
      const rec = await pb()
        .collection("assets")
        .create({ owner: userId(), book: book.id, file: await toWebp(file), alt: side === "front" ? "Cover image" : "Back cover image" });
      const url = fileUrl(rec, rec.file);
      update(side === "back" ? { backImageUrl: url } : { imageUrl: url, template: design.template === "framed" ? "art" : design.template });
    } catch (e) {
      setMsg(`Upload failed: ${errorMessage(e)}`);
    } finally {
      setBusy(null);
    }
  }

  async function uploadOwn(field: "cover" | "cover_full" | "cover_hardcover", file: File) {
    setBusy(field);
    try {
      const updated = await ws.track(
        pb()
          .collection("books")
          .update(book.id, { [field]: file }),
      );
      ws.setBook((b) => (b ? { ...b, [field]: updated[field] } : b));
      setMsg(field === "cover" ? "Ebook cover uploaded." : field === "cover_hardcover" ? "Hardcover cover uploaded." : "Paperback cover uploaded.");
    } catch (e) {
      setMsg(`Upload failed: ${errorMessage(e)}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-6 sm:px-8 lg:grid-cols-[20rem_1fr]">
      <link rel="stylesheet" href={COVER_FONTS_HREF} />
      <aside className="grid h-fit gap-6">
        <div role="tablist" aria-label="Cover type" className={cn("grid gap-1 rounded-md bg-paper-2 p-1", modes.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
          {modes.map((m) => (
            <button
              key={m}
              role="tab"
              type="button"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn("rounded px-3 py-1.5 text-sm", mode === m ? "bg-card font-medium" : "text-ink-2")}
            >
              {m === "ebook" ? "Ebook" : m === "print" ? "Paperback" : "Hardcover"}
            </button>
          ))}
        </div>

        <fieldset>
          <legend className="text-sm font-medium">Layout</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => update({ ...t.design, template: t.id })}
                className={cn("rounded-md bg-card px-3 py-2 text-left text-sm ring-2 ring-transparent", design.template === t.id && "ring-primary")}
              >
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-3 gap-3 text-sm">
          {(
            [
              ["bg", "Background"],
              ["fg", "Text"],
              ["accent", "Accent"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="grid gap-1">
              <span>{label}</span>
              <input type="color" value={design[k]} onChange={(e) => update({ [k]: e.target.value })} className="h-9 w-full rounded border border-input bg-card" />
            </label>
          ))}
        </div>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">Typeface</span>
          <select value={design.font} onChange={(e) => update({ font: e.target.value })} className="h-9 rounded-md border border-input bg-card px-2">
            {COVER_FONTS.map((ff) => (
              <option key={ff}>{ff}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Title size</span>
          <input type="range" min={0.06} max={0.2} step={0.005} value={design.titleSize} onChange={(e) => update({ titleSize: Number(e.target.value) })} className="accent-[var(--primary)]" />
        </label>

        <div className="grid gap-2 text-sm">
          <span className="font-medium">{wrap ? "Front artwork" : "Picture"}</span>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-card px-3 py-2 hover:bg-muted">
            {busy === "image" ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            {design.imageUrl ? "Replace picture" : "Add a picture"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
          </label>
          {design.imageUrl && (
            <button type="button" className="text-left text-soft underline" onClick={() => update({ imageUrl: "" })}>
              Remove picture
            </button>
          )}
          <p className="text-[13px] text-soft">
            {wrap ? `At least ${spec.front.px.width} x ${spec.front.px.height} px.` : "At least 1600 x 2560 px."} Only use images you have the rights to.
          </p>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!design.frontText} onChange={(e) => update({ frontText: !e.target.checked })} /> My artwork already has the title on it
          </label>
        </div>

        {wrap && (
          <div className="grid gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={design.showBlurb} onChange={(e) => update({ showBlurb: e.target.checked })} /> Description on the back
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} /> Show trim, safe area and barcode guides
            </label>
            <span className="mt-2 font-medium">Back artwork</span>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-card px-3 py-2 hover:bg-muted">
              {busy === "back" ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
              {design.backImageUrl ? "Replace back artwork" : "Add back artwork"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "back")} />
            </label>
            {design.backImageUrl && (
              <button type="button" className="text-left text-soft underline" onClick={() => update({ backImageUrl: "" })}>
                Remove back artwork
              </button>
            )}
            <div className="mt-2 grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <span>Back colour</span>
                <input type="color" value={design.backBg || design.bg} onChange={(e) => update({ backBg: e.target.value })} className="h-9 w-full rounded border border-input bg-card" />
              </label>
              <label className="grid gap-1">
                <span>Spine colour</span>
                <input
                  type="color"
                  value={design.spineBg || (design.template === "split" ? design.accent : design.bg)}
                  onChange={(e) => update({ spineBg: e.target.value })}
                  className="h-9 w-full rounded border border-input bg-card"
                />
              </label>
            </div>
          </div>
        )}

        <Button variant="outline" onClick={() => document.getElementById("ai-artwork")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
          <Sparkles className="text-primary" /> Make artwork with AI
        </Button>

        <div className="grid gap-2 border-t border-border pt-5">
          {mode === "ebook" ? (
            <Button onClick={saveEbookCover} disabled={!!busy}>
              {busy === "ebook" ? <Loader2 className="animate-spin" /> : <Download />} Save as ebook cover
            </Button>
          ) : (
            <Button onClick={exportPrintCover} disabled={!!busy}>
              {busy === "print" ? <Loader2 className="animate-spin" /> : <Download />} Export {editionName.toLowerCase()} cover PDF
            </Button>
          )}
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm hover:bg-muted">
            <Upload className="size-4" />
            {mode === "ebook" ? "Upload a finished front cover" : "Upload a finished wrap PDF"}
            <input
              type="file"
              className="sr-only"
              accept={mode === "ebook" ? "image/jpeg,image/png,image/webp" : "application/pdf,image/jpeg,image/png"}
              onChange={(e) => e.target.files?.[0] && uploadOwn(mode === "ebook" ? "cover" : mode === "hardcover" ? "cover_hardcover" : "cover_full", e.target.files[0])}
            />
          </label>
          {msg && (
            <p className="text-sm text-ink-2" role="status">
              {msg}
            </p>
          )}
        </div>
      </aside>

      <section className="min-w-0">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <p className="text-ink-2">
            {mode === "ebook"
              ? "Front cover, 1600 x 2560 px. Drag the title and author to move them."
              : binding === "hardcover"
                ? `Hardcover case ${inches(g.width)} x ${inches(g.height)}: back board, ${inches(g.spine, 4)} spine, front board. The shaded ${inches(g.edge)} band folds inside the boards.`
                : `Full wrap ${inches(g.width)} x ${inches(g.height)}: back, ${inches(g.spine, 4)} spine, front. Bleed included.`}
          </p>
          {wrap && !g.spineTextAllowed && <p className="text-soft">Spine text appears from 79 pages.</p>}
        </div>
        <div ref={boxRef} className="flex justify-center rounded-md bg-paper p-1">
          <CoverStage
            key={`${mode}-${fontsReady}`}
            ref={stageRef}
            mode={wrap ? "print" : "ebook"}
            book={{ title: book.title, subtitle: book.subtitle, description: book.description, imprint: book.imprint, authorName }}
            design={design}
            geometry={g}
            zoom={zoom}
            guides={guides}
            onMove={(key, pos) => update({ [key]: pos })}
          />
        </div>
        {wrap && <CoverKit g={g} slug={slugify(book.title)} book={{ title: book.title, subtitle: book.subtitle, author: authorName }} lettering={!design.frontText} checks={checks} />}
        <AiCoverPanel
          bookId={book.id}
          book={{ title: book.title, subtitle: book.subtitle, author: authorName, description: book.description }}
          design={design}
          aspect={spec.front.ratio}
          edgePercent={spec.front.edgePercent + 1}
          onUse={(side, url, lettered) => {
            // full-bleed art reads best on the "Your artwork" layout; keep the photo layout if chosen
            if (side === "front") update({ imageUrl: url, template: design.template === "photo" ? "photo" : "art", ...(lettered ? { frontText: false } : {}) });
            else {
              update({ backImageUrl: url });
              if (!wrap) setMode("print");
            }
            setMsg(side === "front" ? "Picture placed on the front. Save or export when you are happy." : `Picture placed on the back of the ${mode === "hardcover" ? "hardcover" : "paperback"} wrap.`);
            boxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        />
        {book.cover && (
          <div className="mt-6 flex items-center gap-4">
            <div className="w-20">
              <BookCover book={book} thumb="480x0" />
            </div>
            <p className="text-sm text-soft">Current ebook cover</p>
          </div>
        )}
      </section>
    </div>
  );
}
