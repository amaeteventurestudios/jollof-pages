/**
 * Pictures are stored as WebP: a JPEG or PNG an author adds is converted in the browser before
 * upload, so pages load faster and storage stays small. Photos keep 92% quality, which still
 * prints cleanly at 300 dpi; PNGs (often diagrams or art with transparency) keep full quality.
 *
 * Some ebook readers (Kindle among them) and older Word versions can't show WebP, so
 * `compatibleImage` turns a WebP back into JPEG, or PNG when it has transparency, for the
 * EPUB and Word downloads. The print PDF reads WebP directly.
 */

const CONVERT = new Set(["image/jpeg", "image/png"]);

function canvasFor(w: number, h: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function encode(canvas: OffscreenCanvas | HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  if ("convertToBlob" in canvas) return canvas.convertToBlob({ type, quality }).catch(() => null);
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function draw(blob: Blob): Promise<{ canvas: OffscreenCanvas | HTMLCanvasElement; ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D } | null> {
  if (typeof createImageBitmap === "undefined") return null;
  const bmp = await createImageBitmap(blob).catch(() => null);
  if (!bmp) return null;
  const canvas = canvasFor(bmp.width, bmp.height);
  const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
  if (!ctx) return null;
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  return { canvas, ctx };
}

/** A JPEG or PNG as a WebP file with the same name. Anything else, or a browser that can't make WebP, gets the original back. */
export async function toWebp(file: File): Promise<File> {
  if (!CONVERT.has(file.type)) return file;
  try {
    const d = await draw(file);
    if (!d) return file;
    const out = await encode(d.canvas, "image/webp", file.type === "image/png" ? 1 : 0.92);
    // Safari before 17 quietly hands back a PNG instead of a WebP
    if (!out || out.type !== "image/webp") return file;
    return new File([out], file.name.replace(/\.(jpe?g|png)$/i, "") + ".webp", { type: "image/webp", lastModified: file.lastModified });
  } catch {
    return file;
  }
}

/** A WebP picture as JPEG, or PNG if it has transparency, for readers that can't show WebP. Other types pass through. */
export async function compatibleImage(bytes: Uint8Array, mediaType: string): Promise<{ bytes: Uint8Array; mediaType: string }> {
  if (mediaType !== "image/webp") return { bytes, mediaType };
  try {
    const d = await draw(new Blob([bytes as BlobPart], { type: mediaType }));
    if (!d) return { bytes, mediaType };
    const { data } = d.ctx.getImageData(0, 0, d.canvas.width, d.canvas.height);
    let alpha = false;
    for (let i = 3; i < data.length; i += 4)
      if (data[i] < 255) {
        alpha = true;
        break;
      }
    const type = alpha ? "image/png" : "image/jpeg";
    const out = await encode(d.canvas, type, 0.92);
    if (!out || out.type !== type) return { bytes, mediaType };
    return { bytes: new Uint8Array(await out.arrayBuffer()), mediaType: type };
  } catch {
    return { bytes, mediaType };
  }
}
