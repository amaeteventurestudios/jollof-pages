import "server-only";
import { QUALITY, type Quality } from "../cover-ai";

/**
 * Image generation on fal.ai (Nano Banana 2 by default), through fal's queue REST API.
 * Without FAL_KEY the studio runs in test mode and draws a labelled sample picture instead,
 * so the whole flow can be tried without spending anything.
 */

export const FAL_MODEL = process.env.FAL_IMAGE_MODEL || "fal-ai/nano-banana-2";
export const FAL_EDIT_MODEL = process.env.FAL_IMAGE_EDIT_MODEL || `${FAL_MODEL}/edit`;

export function falConfigured(): boolean {
  return Boolean(process.env.FAL_KEY);
}

export interface GenerateInput {
  prompt: string;
  aspect: string;
  quality: Quality;
  count: number;
  /** data: URIs or public URLs of reference pictures; uses the edit model when present */
  references: string[];
}

export interface GeneratedImage {
  bytes: Uint8Array;
  type: string;
  width?: number;
  height?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function falJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, headers: { Authorization: `Key ${process.env.FAL_KEY}`, "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!res.ok) {
    const detail = typeof body === "object" && body && "detail" in body ? JSON.stringify((body as { detail: unknown }).detail) : String(text).slice(0, 400);
    throw new Error(`fal.ai ${res.status}: ${detail}`);
  }
  return body as Record<string, unknown>;
}

export async function generateImages(input: GenerateInput, timeoutMs = 170_000): Promise<{ images: GeneratedImage[]; model: string }> {
  const model = input.references.length ? FAL_EDIT_MODEL : FAL_MODEL;
  const body: Record<string, unknown> = {
    prompt: input.prompt,
    aspect_ratio: input.aspect,
    resolution: QUALITY[input.quality].resolution,
    num_images: input.count,
    output_format: "png",
  };
  if (input.references.length) body.image_urls = input.references;

  const submitted = await falJson(`https://queue.fal.run/${model}`, { method: "POST", body: JSON.stringify(body) });
  const statusUrl = String(submitted.status_url);
  const responseUrl = String(submitted.response_url);
  const started = Date.now();
  for (;;) {
    await sleep(2000);
    const status = await falJson(statusUrl);
    if (status.status === "COMPLETED") {
      if (status.error) throw new Error(`fal.ai: ${String(status.error)}`);
      break;
    }
    if (Date.now() - started > timeoutMs) throw new Error("The picture took too long. You have not been charged; try again.");
  }
  const result = (await falJson(responseUrl)) as { images?: { url: string; content_type?: string; width?: number; height?: number }[] };
  const list = result.images ?? [];
  if (!list.length) throw new Error("fal.ai returned no picture. The prompt may have been refused by the model's safety filter.");
  const images = await Promise.all(
    list.map(async (img) => {
      const res = await fetch(img.url);
      if (!res.ok) throw new Error(`Could not download the picture from fal.ai (${res.status}).`);
      return { bytes: new Uint8Array(await res.arrayBuffer()), type: img.content_type || res.headers.get("content-type") || "image/png", width: img.width, height: img.height };
    }),
  );
  return { images, model };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Test mode: a sample picture in the book's colours, clearly marked as not real art. */
export function mockImages(input: GenerateInput, palette: { bg: string; fg: string; accent: string }, title: string): { images: GeneratedImage[]; model: string } {
  const [rw, rh] = input.aspect.split(":").map(Number);
  const height = input.quality === "print" ? 3072 : 1536;
  const width = Math.round((height * (rw || 2)) / (rh || 3));
  const images = Array.from({ length: input.count }, (_, i) => {
    const angle = 25 + i * 40;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs><linearGradient id="g" gradientTransform="rotate(${angle})"><stop offset="0" stop-color="${esc(palette.bg)}"/><stop offset="1" stop-color="${esc(palette.accent)}"/></linearGradient></defs>
<rect width="100%" height="100%" fill="url(#g)"/>
<circle cx="${width * (0.3 + 0.2 * i)}" cy="${height * 0.55}" r="${width * 0.28}" fill="${esc(palette.fg)}" opacity="0.18"/>
<rect x="${width * 0.08}" y="${height * 0.46}" width="${width * 0.84}" height="${height * 0.08}" fill="#000" opacity="0.35"/>
<text x="50%" y="${height * 0.5}" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="${width * 0.045}" fill="#fff">SAMPLE · TEST MODE · ${esc(title.slice(0, 30).toUpperCase())}</text>
</svg>`;
    return { bytes: new TextEncoder().encode(svg), type: "image/svg+xml", width, height };
  });
  return { images, model: "test-mode" };
}
