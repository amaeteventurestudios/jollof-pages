/**
 * The "director" for the video guides: drives a real studio page with Playwright while a
 * screencast records it. It draws a visible cursor, click ripples, a highlight ring and a
 * caption bar into the page, so every video shows what is clicked and why.
 */
import type { CDPSession, Locator, Page } from "playwright";
import type { Narrator } from "./narrator";

export interface Cue {
  start: number;
  end: number;
  text: string;
}

/** Injected into every page. Builds the overlay and exposes window.__jpv to the director. */
export const OVERLAY_SCRIPT = `(() => {
  if (window.__jpv) return;
  const css = \`
    #jpv-root{position:fixed;inset:0;pointer-events:none;z-index:2147483647;font-family:"Archivo",ui-sans-serif,system-ui,sans-serif}
    #jpv-cursor{position:absolute;left:0;top:0;width:26px;height:26px;transform:translate(-3px,-2px);transition:left .7s cubic-bezier(.65,0,.35,1),top .7s cubic-bezier(.65,0,.35,1);filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
    .jpv-ripple{position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid #c2410c;animation:jpv-r .6s ease-out forwards}
    @keyframes jpv-r{from{transform:scale(.3);opacity:1}to{transform:scale(1.4);opacity:0}}
    #jpv-ring{position:absolute;border:3px solid #c2410c;box-shadow:0 0 0 6px rgba(194,65,12,.18);opacity:0;transition:all .35s ease}
    #jpv-cap{position:absolute;left:50%;bottom:28px;transform:translate(-50%,12px);max-width:min(900px,86vw);padding:14px 22px;background:rgba(28,20,16,.92);color:#fff;font-size:21px;line-height:1.35;text-align:center;opacity:0;transition:opacity .3s ease,transform .3s ease}
    #jpv-cap.on{opacity:1;transform:translate(-50%,0)}
    #jpv-cap b{color:#fdba74;font-weight:600}
    #jpv-title{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 9vw;background:#9a3412;color:#fff;opacity:0;transition:opacity .45s ease;background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.07) 0 2px,transparent 2px 14px)}
    #jpv-title.on{opacity:1}
    #jpv-title small{font-size:18px;letter-spacing:.14em;text-transform:uppercase;opacity:.85}
    #jpv-title h1{margin:14px 0 0;font-size:56px;line-height:1.05;letter-spacing:-.02em;font-weight:600}
    #jpv-title p{margin:18px 0 0;font-size:24px;opacity:.9;max-width:760px}
  \`;
  // the overlay lives in a closed shadow root, so locators like getByText never match a caption
  let shadow = null;
  const mount = () => {
    if (shadow) return;
    const host = document.createElement("div");
    host.id = "jpv-host";
    shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = css;
    shadow.appendChild(style);
    const root = document.createElement("div");
    root.id = "jpv-root";
    root.innerHTML = '<div id="jpv-ring"></div><div id="jpv-cap"></div><div id="jpv-title"></div>' +
      '<svg id="jpv-cursor" viewBox="0 0 24 24"><path d="M4 2l15 9.5-6.6 1.4 3.9 7.4-3 1.6-3.9-7.5L4 19z" fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    shadow.appendChild(root);
    document.body.appendChild(host);
    const p = window.__jpvPos || { x: innerWidth * 0.62, y: innerHeight * 0.55 };
    const c = shadow.getElementById("jpv-cursor");
    c.style.transition = "none"; c.style.left = p.x + "px"; c.style.top = p.y + "px";
    requestAnimationFrame(() => (c.style.transition = ""));
    if (window.__jpvCap) window.__jpv.caption(window.__jpvCap);
  };
  const $ = (id) => { mount(); return shadow.getElementById(id); };
  window.__jpv = {
    move(x, y, ms) { const c = $("jpv-cursor"); c.style.transitionDuration = (ms / 1000) + "s"; c.style.left = x + "px"; c.style.top = y + "px"; window.__jpvPos = { x, y }; },
    click(x, y) { const r = document.createElement("div"); r.className = "jpv-ripple"; r.style.left = x + "px"; r.style.top = y + "px"; $("jpv-root").appendChild(r); setTimeout(() => r.remove(), 700); },
    ring(b) { const r = $("jpv-ring"); if (!b) { r.style.opacity = 0; return; } const pad = 6; Object.assign(r.style, { left: (b.x - pad) + "px", top: (b.y - pad) + "px", width: (b.width + pad * 2) + "px", height: (b.height + pad * 2) + "px", opacity: 1 }); },
    caption(html) { const c = $("jpv-cap"); window.__jpvCap = html; if (!html) { c.classList.remove("on"); return; } c.innerHTML = html; c.classList.add("on"); },
    title(kicker, h, p) { const t = $("jpv-title"); if (!h) { t.classList.remove("on"); return; } t.innerHTML = "<small>" + kicker + "</small><h1>" + h + "</h1>" + (p ? "<p>" + p + "</p>" : ""); t.classList.add("on"); },
  };
  if (document.body) mount(); else addEventListener("DOMContentLoaded", mount);
})();`;

/** The first visible match: pages often keep a hidden copy of a control for small screens. */
const shown = (l: Locator) => l.filter({ visible: true }).first();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Records the page through the Chrome DevTools screencast: sharp text, frames kept with timestamps. */
export class Recorder {
  frames: { t: number; data: Buffer }[] = [];
  private cdp?: CDPSession;
  t0 = 0;

  constructor(private page: Page) {}

  async start() {
    this.cdp = await this.page.context().newCDPSession(this.page);
    this.cdp.on("Page.screencastFrame", async (f) => {
      this.frames.push({ t: f.metadata.timestamp ?? Date.now() / 1000, data: Buffer.from(f.data, "base64") });
      await this.cdp?.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
    });
    const vp = this.page.viewportSize()!;
    await this.cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: vp.width * 2, maxHeight: vp.height * 2, everyNthFrame: 1 });
    this.t0 = Date.now() / 1000;
  }

  now() {
    return Date.now() / 1000 - this.t0;
  }

  async stop() {
    await this.cdp?.send("Page.stopScreencast").catch(() => {});
    await this.cdp?.detach().catch(() => {});
  }
}

export class Director {
  cues: Cue[] = [];
  voice: { start: number; file: string }[] = [];
  private open?: Cue;

  constructor(
    public page: Page,
    public rec: Recorder,
    public base: string,
    private narrator?: Narrator,
  ) {}

  /** Starts the spoken line, if there is a voiceover, and says how long it runs in ms. */
  private async speak(text: string) {
    if (!this.narrator) return 0;
    const clip = await this.narrator.clip(text);
    this.voice.push({ start: this.rec.now(), file: clip.file });
    return clip.seconds * 1000 + 450;
  }

  wait(ms: number) {
    return this.page.waitForTimeout(ms);
  }

  async goto(path: string) {
    await this.page.goto(this.base + path, { waitUntil: "networkidle" });
    await this.wait(600);
  }

  /** Shows and speaks a caption until the next one. It stays up long enough to read and hear. */
  async say(text: string, hold?: number) {
    this.endCue();
    if (this.narrator) await this.narrator.clip(text); // made before the caption shows, so no pause
    await this.page.evaluate((t) => window.__jpv.caption(t), text);
    this.open = { start: this.rec.now(), end: 0, text: text.replace(/<[^>]+>/g, "") };
    const spoken = await this.speak(text);
    const words = text.replace(/<[^>]+>/g, "").split(/\s+/).length;
    await this.wait(Math.max(hold ?? Math.max(1800, words * 330), spoken));
  }

  async hush() {
    this.endCue();
    await this.page.evaluate(() => window.__jpv.caption(""));
  }

  private endCue() {
    if (this.open) {
      this.open.end = this.rec.now();
      this.cues.push(this.open);
      this.open = undefined;
    }
  }

  finish() {
    this.endCue();
  }

  async title(kicker: string, heading: string, line?: string, ms = 2600) {
    const words = line ? `${heading}. ${line}` : heading;
    if (this.narrator) await this.narrator.clip(words);
    await this.page.evaluate(([k, h, p]) => window.__jpv.title(k, h, p), [kicker, heading, line ?? ""] as const);
    ms = Math.max(ms, await this.speak(words));
    this.cues.push({ start: this.rec.now(), end: this.rec.now() + ms / 1000, text: heading });
    await this.wait(ms);
    await this.page.evaluate(() => window.__jpv.title("", "", ""));
    await this.wait(500);
  }

  /** Glides the cursor to the middle of an element. */
  async point(target: Locator, opts: { ring?: boolean; ms?: number } = {}) {
    target = shown(target);
    await target.scrollIntoViewIfNeeded();
    await this.wait(150);
    const b = await target.boundingBox();
    if (!b) throw new Error(`Not visible: ${target}`);
    const x = b.x + Math.min(b.width / 2, 60 + b.width * 0.15),
      y = b.y + b.height / 2;
    const ms = opts.ms ?? 750;
    await this.page.evaluate(([x, y, ms]) => window.__jpv.move(x, y, ms), [x, y, ms]);
    await this.page.mouse.move(x, y, { steps: 6 });
    if (opts.ring) await this.page.evaluate((b) => window.__jpv.ring(b), b);
    await this.wait(ms + 120);
    return { x, y };
  }

  async ring(target: Locator | null) {
    if (!target) return this.page.evaluate(() => window.__jpv.ring(null));
    target = shown(target);
    await target.scrollIntoViewIfNeeded();
    const b = await target.boundingBox();
    await this.page.evaluate((b) => window.__jpv.ring(b), b);
  }

  async click(target: Locator, opts: { ring?: boolean; after?: number } = {}) {
    target = shown(target);
    const { x, y } = await this.point(target, opts);
    await this.page.evaluate(([x, y]) => window.__jpv.click(x, y), [x, y]);
    await target.click();
    if (opts.ring) await this.page.evaluate(() => window.__jpv.ring(null));
    await this.wait(opts.after ?? 700);
  }

  /** Types like a person, so viewers can follow along. */
  async type(target: Locator, text: string, opts: { clear?: boolean; delay?: number } = {}) {
    target = shown(target);
    await this.click(target, { after: 200 });
    if (opts.clear) {
      await target.selectText();
      await this.page.keyboard.press("Backspace");
    }
    await this.page.keyboard.type(text, { delay: opts.delay ?? 45 });
    await this.wait(500);
  }

  async press(key: string, after = 500) {
    await this.page.keyboard.press(key);
    await this.wait(after);
  }

  /** Selects a phrase in the manuscript editor, with the cursor sweeping across it. */
  async selectText(phrase: string) {
    const find = ([phrase, select]: [string, boolean]) => {
      const root = document.querySelector(".ProseMirror");
      if (!root) return null;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const i = n.textContent!.indexOf(phrase);
        if (i < 0) continue;
        const range = document.createRange();
        range.setStart(n, i);
        range.setEnd(n, i + phrase.length);
        if (!select) {
          (n.parentElement as HTMLElement).scrollIntoView({ block: "center" });
          const rects = range.getClientRects();
          const a = rects[0],
            z = rects[rects.length - 1];
          return { x: a.left, y: a.top + a.height / 2, x2: z.right, y2: z.top + z.height / 2 };
        }
        (root as HTMLElement).focus();
        const sel = window.getSelection()!;
        sel.removeAllRanges();
        sel.addRange(range);
        return null;
      }
      if (!select) throw new Error(`Text not found: ${phrase}`);
      return null;
    };
    const box = (await this.page.evaluate(find, [phrase, false] as [string, boolean]))!;
    await this.wait(300);
    await this.page.evaluate(([x, y]) => window.__jpv.move(x, y, 600), [box.x, box.y]);
    await this.wait(700);
    await this.page.evaluate(([x, y]) => window.__jpv.move(x, y, 700), [box.x2, box.y2]);
    await this.page.evaluate(find, [phrase, true] as [string, boolean]);
    await this.wait(900);
  }

  /** Drags one element onto another, for drag-and-drop reordering. */
  async drag(from: Locator, to: Locator) {
    const a = await this.point(from);
    const b = (await to.boundingBox())!;
    const target = { x: b.x + b.width / 2, y: b.y + b.height * 0.75 };
    await this.page.mouse.down();
    await this.page.mouse.move(a.x, a.y + 8, { steps: 3 });
    for (let i = 1; i <= 30; i++) {
      const y = a.y + 8 + ((target.y - a.y - 8) * i) / 30;
      await this.page.mouse.move(a.x, y);
      await this.page.evaluate(([x, y]) => window.__jpv.move(x, y, 40), [a.x, y]);
      await this.wait(35);
    }
    await this.wait(500);
    await this.page.mouse.up();
    await this.wait(900);
  }

  /** Scrolls the page smoothly so the motion reads on video. */
  async scroll(dy: number, ms = 900) {
    await this.page.evaluate(([dy]) => window.scrollBy({ top: dy, behavior: "smooth" }), [dy]);
    await this.wait(ms);
  }

  async scrollTo(target: Locator, block: ScrollLogicalPosition = "center") {
    target = shown(target);
    await target.evaluate((el, block) => el.scrollIntoView({ behavior: "smooth", block }), block);
    await this.wait(900);
  }
}

declare global {
  interface Window {
    __jpv: {
      move(x: number, y: number, ms: number): void;
      click(x: number, y: number): void;
      ring(b: { x: number; y: number; width: number; height: number } | null): void;
      caption(html: string): void;
      title(kicker: string, h: string, p: string): void;
    };
  }
}

export { sleep };
