/**
 * Records the studio video guides from a running studio.
 *
 *   npm run videos                    # every guide
 *   npm run videos -- new-book import # just these
 *
 * Needs a studio at STUDIO_URL (default http://localhost:3000) seeded with the demo books
 * (npm run seed -- --demo, then npm run videos:demo-data), OWNER_EMAIL / OWNER_PASSWORD,
 * Playwright with Chromium, and FFmpeg. See scripts/video-guides/README.md.
 * Writes public/learn/videos/<id>.mp4, .jpg (poster) and .vtt (captions), and the lengths to
 * src/lib/video-guides.json.
 */
import { execFileSync, execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium, type Browser } from "playwright";
import { VIDEO_GUIDES } from "../../src/lib/video-guides";
import { Director, OVERLAY_SCRIPT, Recorder, type Cue } from "./director";
import { Narrator } from "./narrator";
import { SCENES } from "./scenes";

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "public/learn/videos");
const LENGTHS = path.join(ROOT, "src/lib/video-guides.json");
const BASE = process.env.STUDIO_URL ?? "http://localhost:3000";
const VIEWPORT = { width: 1440, height: 900 };
const SCALE = 4 / 3; // frames come out at 1920 x 1200

async function signIn(browser: Browser) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill(process.env.OWNER_EMAIL ?? "owner@example.com");
  await page.getByLabel("Password").fill(process.env.OWNER_PASSWORD ?? "change-me-please");
  await page.getByRole("button", { name: "Open the studio" }).click();
  await page.waitForURL(/\/studio/);
  await page.waitForTimeout(1000);
  const state = await page.context().storageState();
  await page.close();
  return state;
}

function vtt(cues: Cue[]) {
  const ts = (s: number) => {
    const ms = Math.max(0, Math.round(s * 1000));
    const h = Math.floor(ms / 3600000),
      m = Math.floor(ms / 60000) % 60,
      sec = Math.floor(ms / 1000) % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
  };
  return "WEBVTT\n\n" + cues.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n`).join("\n");
}

/** Turns timestamped screencast frames into an H.264 MP4, with the voiceover if there is one, and a poster frame. */
function encode(id: string, frames: { t: number; data: Buffer }[], t0: number, end: number, voice: { start: number; file: string }[], poster = 0.45) {
  const dir = mkdtempSync(path.join(tmpdir(), `jpv-${id}-`));
  try {
    const kept = frames.filter((f) => f.t >= t0 - 0.05);
    const lines: string[] = [];
    kept.forEach((f, i) => {
      const name = `f${String(i).padStart(5, "0")}.jpg`;
      writeFileSync(path.join(dir, name), f.data);
      const next = i + 1 < kept.length ? kept[i + 1].t : t0 + end;
      lines.push(`file '${name}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
    });
    lines.push(`file 'f${String(kept.length - 1).padStart(5, "0")}.jpg'`);
    writeFileSync(path.join(dir, "list.txt"), lines.join("\n"));
    const mp4 = path.join(OUT, `${id}.mp4`);
    // each spoken line is placed at the moment its caption appeared
    const audio = voice.length
      ? [
          ...voice.flatMap((v) => ["-i", v.file]),
          "-filter_complex",
          voice.map((v, i) => `[${i + 1}:a]adelay=${Math.round(v.start * 1000)}:all=1[a${i}]`).join(";") + ";" + voice.map((_, i) => `[a${i}]`).join("") + `amix=inputs=${voice.length}:normalize=0,apad[aout]`,
          "-map", "0:v", "-map", "[aout]", "-c:a", "aac", "-b:a", "96k", "-shortest",
        ]
      : [];
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", path.join(dir, "list.txt"), ...audio, "-vf", "fps=30,scale=1920:-2:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-movflags", "+faststart", mp4]);
    // the poster is a frame part way in, well after the title card
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", (end * poster).toFixed(2), "-i", mp4, "-frames:v", "1", "-vf", "scale=960:-2", "-q:v", "4", path.join(OUT, `${id}.jpg`)]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  const only = process.argv.slice(2);
  const guides = VIDEO_GUIDES.filter((g) => !only.length || only.includes(g.id));
  const missing = guides.filter((g) => !SCENES[g.id]);
  if (missing.length) throw new Error(`No scene for: ${missing.map((g) => g.id).join(", ")}`);
  mkdirSync(OUT, { recursive: true });
  const lengths: Record<string, number> = JSON.parse(readFileSync(LENGTHS, "utf8"));
  const browser = await chromium.launch();
  // VIDEO_RESET is a shell command that puts the demo studio back as it was, run before each
  // video so one video's edits never show up in the next
  const reset = process.env.VIDEO_RESET;
  let storageState = reset ? undefined : await signIn(browser);
  const failed: string[] = [];
  const narrator = Narrator.fromEnv();
  if (!narrator) console.log("No KOKORO_DIR / VOICE_PYTHON: recording without a voiceover.");
  else {
    // speak every caption up front, so recording never waits on the voice
    const lines = [...readFileSync(path.join(__dirname, "scenes.ts"), "utf8").matchAll(/d\.say\(\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => JSON.parse(`"${m[1]}"`) as string);
    for (const g of guides) lines.push(`${g.title}. ${g.summary}`);
    for (const line of lines) await narrator.clip(line);
    console.log(`Voiceover ready: ${lines.length} lines`);
  }

  for (const guide of guides) {
    const scene = SCENES[guide.id];
    if (reset) {
      execSync(reset, { stdio: "ignore" });
      storageState = await signIn(browser);
    }
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE, storageState, colorScheme: "light", reducedMotion: "no-preference" });
    await context.addInitScript(() => {
      localStorage.setItem("jp-resize-hint", "1");
      localStorage.setItem("jp-theme", "light");
    });
    await context.addInitScript(OVERLAY_SCRIPT);
    context.setDefaultTimeout(10000);
    const page = await context.newPage();
    const rec = new Recorder(page);
    const d = new Director(page, rec, BASE, narrator);
    try {
      await d.goto(scene.start);
      if (scene.setup) await scene.setup(d);
      await rec.start();
      await d.title(guide.group, guide.title, guide.summary);
      await scene.run(d);
      await d.hush();
      await d.wait(900);
      d.finish();
      const end = rec.now();
      await rec.stop();
      encode(guide.id, rec.frames, rec.t0, end, d.voice, scene.poster);
      writeFileSync(path.join(OUT, `${guide.id}.vtt`), vtt(d.cues));
      lengths[guide.id] = Math.round(end);
      console.log(`✓ ${guide.id} (${Math.round(end)} s)`);
    } catch (e) {
      failed.push(guide.id);
      await page.screenshot({ path: path.join(tmpdir(), `jpv-fail-${guide.id}.png`) }).catch(() => {});
      console.error(`✗ ${guide.id}: ${(e as Error).message.split("\n")[0]}`);
      await rec.stop();
    }
    await context.close();
  }
  await browser.close();
  narrator?.close();
  writeFileSync(LENGTHS, JSON.stringify(Object.fromEntries(Object.entries(lengths).sort()), null, 2) + "\n");
  if (failed.length) {
    console.error(`Failed: ${failed.join(" ")} (screenshots in ${tmpdir()}/jpv-fail-*.png)`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
