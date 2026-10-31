"use client";

import { useState } from "react";
import { Loader2, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inkOn, readWrap, toHex, type PxRect, type WrapReading } from "@/lib/cover-refit";
import { inches, type CoverGeometry } from "@/lib/kdp";

/** The first page of a PDF, drawn at 300 dpi. pdf.js is only loaded when someone brings a PDF. */
async function pdfToCanvas(file: File): Promise<HTMLCanvasElement> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const page = await doc.getPage(1);
  const base = page.getViewport({ scale: 1 });
  // 300 dpi, but no bigger than browsers allow a canvas to be
  const scale = Math.min(300 / 72, 16000 / base.width, 16000 / base.height);
  const view = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(view.width);
  canvas.height = Math.round(view.height);
  await page.render({ canvas, viewport: view }).promise;
  await doc.destroy();
  return canvas;
}

async function imageToCanvas(file: File): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0);
  bmp.close();
  return canvas;
}

function cut(src: HTMLCanvasElement, r: PxRect): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = r.width;
  c.height = r.height;
  c.getContext("2d")!.drawImage(src, r.x, r.y, r.width, r.height, 0, 0, r.width, r.height);
  return new Promise((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error("Could not cut the cover."))), "image/png"));
}

/** The old spine's colour, averaged over its middle so its lettering barely counts. */
function spineColour(src: HTMLCanvasElement, r: PxRect): string {
  if (r.width < 2) return "";
  const x = r.x + Math.floor(r.width * 0.15);
  const w = Math.max(1, Math.floor(r.width * 0.7));
  const data = src.getContext("2d")!.getImageData(x, 0, w, r.height).data;
  const counts = new Map<string, { n: number; r: number; g: number; b: number }>();
  // the most common colour, in coarse buckets, so title letters on the spine don't tint it
  for (let i = 0; i < data.length; i += 16) {
    const k = `${data[i] >> 4},${data[i + 1] >> 4},${data[i + 2] >> 4}`;
    const c = counts.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
    c.n++;
    c.r += data[i];
    c.g += data[i + 1];
    c.b += data[i + 2];
    counts.set(k, c);
  }
  const top = [...counts.values()].reduce((a, b) => (b.n > a.n ? b : a));
  return toHex(top.r / top.n, top.g / top.n, top.b / top.n);
}

export interface RefitResult {
  front: File;
  back: File;
  spineBg: string;
  spineInk: string;
}

/**
 * Bring an existing full paperback wrap (from KDP, a designer or an earlier edition) and refit it:
 * the back and front are cut out with their bleed and the spine is rebuilt at this book's width.
 */
export function RefitCover({ g, trimId, paper, onApply }: { g: CoverGeometry; trimId: string; paper: Parameters<typeof readWrap>[2]; onApply: (r: RefitResult) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [found, setFound] = useState<{ reading: WrapReading; canvas: HTMLCanvasElement; name: string } | null>(null);

  async function open(file: File) {
    setBusy(true);
    setError("");
    setFound(null);
    try {
      const canvas = file.type === "application/pdf" || /\.pdf$/i.test(file.name) ? await pdfToCanvas(file) : await imageToCanvas(file);
      const reading = readWrap(canvas, trimId, paper);
      if (!reading)
        setError("This doesn't look like a full wrap (back, spine and front side by side). If you only have the front, use Add a picture above instead, and Add back artwork for the back.");
      else setFound({ reading, canvas, name: file.name.replace(/\.[^.]+$/, "") });
    } catch (e) {
      setError(`Could not open that file: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!found) return;
    setBusy(true);
    setError("");
    try {
      const { reading: r, canvas, name } = found;
      const [front, back] = await Promise.all([cut(canvas, r.front), cut(canvas, r.back)]);
      const spineBg = spineColour(canvas, r.spineRect);
      await onApply({
        front: new File([front], `${name}-front.png`, { type: "image/png" }),
        back: new File([back], `${name}-back.png`, { type: "image/png" }),
        spineBg,
        spineInk: spineBg ? inkOn(spineBg) : "",
      });
      setFound(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const r = found?.reading;
  const change = r ? g.spine - r.spine : 0;
  return (
    <div className="grid gap-2 border-t border-border pt-5 text-sm">
      <span className="flex items-center gap-2 font-medium">
        <Scissors className="size-4 text-primary" /> Refit a cover you already have
      </span>
      <p className="text-[13px] text-soft">
        Have a full wrap from KDP, a designer or an earlier edition? Bring it as a PDF, JPG or PNG. We cut out the back and front and rebuild the spine at the {inches(g.spine, 3)} this book needs now.
      </p>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-card px-3 py-2 hover:bg-muted">
        {busy && !found ? <Loader2 className="size-4 animate-spin" /> : <Scissors className="size-4" />}
        Choose the cover file
        <input
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void open(f);
          }}
        />
      </label>
      {r && (
        <div className="grid gap-2 rounded-md border border-primary/40 bg-primary-soft p-3" role="status">
          <p>
            Made for <strong>{r.trim.label}</strong> with a <strong>{inches(r.spine, 3)}</strong> spine (about {r.pages} pages on {paper} paper), at {Math.round(r.dpi)} dpi.
          </p>
          <p>
            Your book now needs a <strong>{inches(g.spine, 3)}</strong> spine for {g.pageCount} pages
            {Math.abs(change) < 0.01 ? ", the same width." : change > 0 ? `, ${inches(change, 3)} wider.` : `, ${inches(-change, 3)} narrower.`}
          </p>
          {r.notes.map((n) => (
            <p key={n} className="text-[13px] text-ink-2">
              {n}
            </p>
          ))}
          <p className="text-[13px] text-ink-2">The spine is redrawn in its old colour with your title and author name. Check the back for an old barcode: KDP adds its own.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={apply} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Scissors />} Refit it to this book
            </Button>
            <Button size="sm" variant="outline" onClick={() => setFound(null)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
