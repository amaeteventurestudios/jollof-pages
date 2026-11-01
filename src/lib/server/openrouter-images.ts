import "server-only";
import { QUALITY, imageSize } from "../cover-ai";
import type { GenerateInput, GeneratedImage } from "./fal";

/**
 * Cover pictures on the writer's own OpenRouter key: Nano Banana (Gemini image models), GPT Image
 * and any other image model OpenRouter lists. OpenRouter returns images on a chat completion when
 * asked for the image modality, one picture per request.
 */

const BASE = (process.env.ASSISTANT_OPENROUTER_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "");

interface ImagePart {
  image_url?: { url?: string };
  url?: string;
}
interface Completion {
  choices?: { message?: { images?: ImagePart[]; content?: string | { type: string; image_url?: { url?: string } }[] } }[];
  error?: { message?: string };
}

function dataUriBytes(uri: string): { bytes: Uint8Array; type: string } | null {
  const m = uri.match(/^data:([^;,]+);base64,(.+)$/);
  return m ? { type: m[1], bytes: new Uint8Array(Buffer.from(m[2], "base64")) } : null;
}

async function errorText(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  let detail = "";
  try {
    detail = (JSON.parse(text) as Completion).error?.message ?? "";
  } catch {
    detail = text.slice(0, 200);
  }
  if (res.status === 401 || res.status === 403) return "OpenRouter did not accept your API key. Check it on the AI assistant page.";
  if (res.status === 402) return "Your OpenRouter account is out of credit. Add credit at openrouter.ai and try again.";
  if (res.status === 404) return "OpenRouter does not offer that image model to your key. Pick another model.";
  if (res.status === 429) return "OpenRouter says too many requests right now. Wait a moment and try again.";
  return `OpenRouter returned an error${detail ? `: ${detail}` : ` (${res.status})`}.`;
}

async function one(input: GenerateInput, key: string, model: string, signal: AbortSignal): Promise<GeneratedImage> {
  const content: unknown[] = [{ type: "text", text: input.prompt }];
  for (const ref of input.references) content.push({ type: "image_url", image_url: { url: ref } });
  const body: Record<string, unknown> = { model, messages: [{ role: "user", content }], modalities: ["image", "text"] };
  // Gemini image models take the shape and size; other models read them from the prompt
  if (model.startsWith("google/")) body.image_config = { aspect_ratio: input.aspect, ...(model.includes("pro") ? { image_size: QUALITY[input.quality].resolution } : {}) };
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    signal,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": "https://jollofpages.com", "X-Title": "Jollof Pages" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await errorText(res));
  const j = (await res.json()) as Completion;
  const msg = j.choices?.[0]?.message;
  const urls = [...(msg?.images ?? []).map((i) => i.image_url?.url ?? i.url ?? ""), ...(Array.isArray(msg?.content) ? msg.content.map((c) => c.image_url?.url ?? "") : [])].filter(Boolean);
  for (const url of urls) {
    const inline = dataUriBytes(url);
    if (inline) return { ...inline, ...(imageSize(inline.bytes) ?? {}) };
    if (/^https:\/\//.test(url)) {
      const img = await fetch(url, { signal });
      if (!img.ok) continue;
      const bytes = new Uint8Array(await img.arrayBuffer());
      return { bytes, type: img.headers.get("content-type") || "image/png", ...(imageSize(bytes) ?? {}) };
    }
  }
  throw new Error(`${model} sent back no picture. It may not make images, or it refused the prompt. Try another model or reword the idea.`);
}

export async function generateWithOpenRouter(input: GenerateInput, key: string, model: string, timeoutMs = 170_000): Promise<{ images: GeneratedImage[]; model: string }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const settled = await Promise.allSettled(Array.from({ length: input.count }, () => one(input, key, model, ctl.signal)));
    const images = settled.flatMap((s) => (s.status === "fulfilled" ? [s.value] : []));
    if (!images.length) {
      const first = settled.find((s) => s.status === "rejected") as PromiseRejectedResult | undefined;
      const reason = first?.reason instanceof Error ? first.reason.message : String(first?.reason ?? "");
      throw new Error(ctl.signal.aborted ? "The picture took too long. Try again, or pick a faster model." : reason);
    }
    return { images, model: `openrouter:${model}` };
  } finally {
    clearTimeout(timer);
  }
}
