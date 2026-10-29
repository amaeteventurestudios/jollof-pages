/**
 * The voiceover: each caption is spoken with Kokoro's "Heart" voice. Clips are made once and kept
 * in a cache, keyed by their words, so recording again only speaks the lines that changed.
 * Turned on by KOKORO_DIR (the folder holding kokoro-v1.0.onnx and voices-v1.0.bin) and
 * VOICE_PYTHON (a Python with kokoro-onnx and soundfile installed). Without them the videos are silent.
 */
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";

export type Clip = { file: string; seconds: number };

const VOICE = process.env.VOICE ?? "af_heart";
const SPEED = Number(process.env.VOICE_SPEED ?? 1);
const CACHE = process.env.VOICE_CACHE ?? path.join(tmpdir(), "jpv-voice");

// the voice reads acronyms like KDP and EPUB well on its own; only markup needs help
const SAY_AS: [RegExp, string][] = [
  [/<b>\+<\/b>/g, "plus button"],
  [/<[^>]+>/g, ""],
];

export function spoken(text: string) {
  return SAY_AS.reduce((t, [re, to]) => t.replace(re, to), text).replace(/\s+/g, " ").trim();
}

export class Narrator {
  private py?: ChildProcessWithoutNullStreams;
  private waiting: ((seconds: number) => void)[] = [];

  static fromEnv() {
    return process.env.KOKORO_DIR && process.env.VOICE_PYTHON ? new Narrator() : undefined;
  }

  private start() {
    mkdirSync(CACHE, { recursive: true });
    this.py = spawn(process.env.VOICE_PYTHON!, [path.join(__dirname, "voice.py")], { env: process.env });
    this.py.stderr.on("data", () => {});
    createInterface({ input: this.py.stdout }).on("line", (line) => this.waiting.shift()?.(JSON.parse(line).seconds));
  }

  /** The spoken clip for a caption, made now if it is not in the cache. */
  async clip(text: string): Promise<Clip> {
    const words = spoken(text);
    const key = createHash("sha1").update(`${VOICE}|${SPEED}|${words}`).digest("hex").slice(0, 16);
    const file = path.join(CACHE, `${key}.wav`);
    const meta = file.replace(/\.wav$/, ".json");
    if (existsSync(meta)) return { file, seconds: JSON.parse(readFileSync(meta, "utf8")).seconds };
    if (!this.py) this.start();
    const seconds = await new Promise<number>((resolve) => {
      this.waiting.push(resolve);
      this.py!.stdin.write(JSON.stringify({ text: words, out: file, voice: VOICE, speed: SPEED }) + "\n");
    });
    writeFileSync(meta, JSON.stringify({ seconds }));
    return { file, seconds };
  }

  close() {
    this.py?.stdin.end();
  }
}
