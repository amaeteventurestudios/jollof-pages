"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LETTERING_MARK, STYLES, buildCoverPrompt, type Quality, type StyleId, type Target } from "@/lib/cover-ai";
import { errorMessage, fileUrl, pb } from "@/lib/pb";
import { cn } from "@/lib/utils";
import type { CoverDesign } from "./cover-designer";

interface Pack {
  id: string;
  credits: number;
  label: string;
  drafts: number;
  prints: number;
}
interface Account {
  credits: number;
  free: boolean;
  testImages: boolean;
  testPayments: boolean;
  ready: boolean;
  setupError: string;
  costs: Record<Quality, number>;
  packs: Pack[];
}
interface Picture {
  id: string;
  url: string;
  thumb: string;
  target: Target;
  quality: Quality;
  mock: boolean;
  prompt: string;
  width?: number;
  height?: number;
}

type GenRecord = { id: string; collectionId: string; image: string; target: Target; quality: Quality; mock: boolean; prompt: string; width: number; height: number };

const auth = () => ({ Authorization: `Bearer ${pb().authStore.token}`, "Content-Type": "application/json" });

function toPicture(r: GenRecord): Picture {
  const svg = r.image.endsWith(".svg");
  return { id: r.id, url: fileUrl(r, r.image), thumb: fileUrl(r, r.image, svg ? undefined : "480x0"), target: r.target, quality: r.quality, mock: r.mock, prompt: r.prompt, width: r.width, height: r.height };
}

export interface AiCoverPanelProps {
  bookId: string;
  book: { title: string; subtitle?: string; author: string; description?: string };
  design: CoverDesign;
  /** nearest model aspect ratio for the front/back panel, and how much of each edge gets trimmed */
  aspect: string;
  edgePercent: number;
  /** lettered: the picture already carries the title, so the designer should not draw it again */
  onUse: (target: Target, url: string, lettered: boolean) => void;
}

/** "Make artwork with AI": the studio writes the prompt from the book and its colours, the writer edits and pays per picture. */
export function AiCoverPanel({ bookId, book, design, aspect, edgePercent, onUse }: AiCoverPanelProps) {
  const [account, setAccount] = useState<Account | null>(null);
  const [target, setTarget] = useState<Target>("front");
  const [style, setStyle] = useState<StyleId>("photo");
  const [idea, setIdea] = useState("");
  const [usePalette, setUsePalette] = useState(true);
  const [lettering, setLettering] = useState(false);
  const [matchCurrent, setMatchCurrent] = useState(false);
  const [quality, setQuality] = useState<Quality>("draft");
  const [count, setCount] = useState(2);
  const [prompt, setPrompt] = useState("");
  const [edited, setEdited] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [pictures, setPictures] = useState<Picture[]>([]);

  const reference = matchCurrent ? (target === "front" ? design.imageUrl : design.backImageUrl || design.imageUrl) : "";
  const built = buildCoverPrompt({
    target,
    style,
    idea,
    book,
    palette: { bg: design.bg, fg: design.fg, accent: design.accent },
    usePalette,
    lettering,
    aspect,
    edgePercent,
    matchReference: Boolean(reference),
  });
  // the prompt follows the choices above until the writer edits it by hand
  const text = edited ? prompt : built;

  const loadAccount = useCallback(
    () =>
      fetch("/api/credits", { headers: auth() })
        .then((res) => (res.ok ? res.json() : null))
        .then((a: Account | null) => a && setAccount(a))
        .catch(() => undefined),
    [],
  );

  useEffect(() => {
    fetch("/api/credits", { headers: auth() })
      .then((res) => (res.ok ? res.json() : null))
      .then((a: Account | null) => a && setAccount(a))
      .catch(() => undefined);
    pb()
      .collection("cover_generations")
      .getList<GenRecord>(1, 24, { filter: pb().filter("book = {:b} && status = 'done'", { b: bookId }), sort: "-created" })
      .then((l) => setPictures(l.items.map(toPicture)))
      .catch(() => undefined);
  }, [bookId]);

  // back from Stripe Checkout
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const state = q.get("credits");
    if (!state) return;
    const sessionId = q.get("session_id");
    q.delete("credits");
    q.delete("session_id");
    window.history.replaceState(null, "", `${window.location.pathname}?${q.toString()}`);
    if (state === "cancelled") {
      Promise.resolve().then(() => setMsg("Payment cancelled. Nothing was charged."));
      return;
    }
    if (sessionId) {
      fetch("/api/credits/confirm", { method: "POST", headers: auth(), body: JSON.stringify({ sessionId }) })
        .then((r) => r.json())
        .then((d) => {
          if (d.error) setMsg(d.error);
          else if (d.paid) setMsg(d.added ? `Payment received: ${d.added} credits added.` : "Payment received. Your credits are in.");
          else setMsg("Stripe has not confirmed the payment yet. Your credits appear as soon as it does.");
          if (typeof d.credits === "number") setAccount((a) => (a ? { ...a, credits: d.credits } : a));
        })
        .catch(() => setMsg("Could not check the payment. Refresh in a minute."));
    }
  }, []);

  async function topUp(pack: string) {
    setBusy(pack);
    setMsg("");
    try {
      const res = await fetch("/api/credits/checkout", { method: "POST", headers: auth(), body: JSON.stringify({ pack, bookId }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || res.statusText);
      if (d.url) {
        window.location.assign(d.url);
        return;
      }
      setMsg(`Test mode: ${d.credits} free test credits added. No payment was taken.`);
      await loadAccount();
    } catch (e) {
      setMsg(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function generate(opts?: { prompt?: string; quality?: Quality; count?: number; referenceUrl?: string; target?: Target }) {
    const q = opts?.quality ?? quality;
    setBusy(opts ? "upscale" : "generate");
    setMsg(q === "print" ? "Making print-ready pictures. 4K takes up to a minute…" : "Making pictures…");
    try {
      const res = await fetch("/api/covers/generate", {
        method: "POST",
        headers: auth(),
        body: JSON.stringify({
          bookId,
          prompt: opts?.prompt ?? text,
          target: opts?.target ?? target,
          quality: q,
          aspect,
          count: opts?.count ?? count,
          referenceUrl: opts?.referenceUrl ?? (reference || undefined),
          palette: { bg: design.bg, fg: design.fg, accent: design.accent },
        }),
      });
      const d = await res.json();
      if (typeof d.credits === "number") setAccount((a) => (a ? { ...a, credits: d.credits } : a));
      if (!res.ok) throw new Error(d.error || res.statusText);
      setPictures((p) => [...d.images, ...p]);
      setMsg(d.test ? "Test mode: these are sample pictures, not real artwork. Add a fal.ai key on the server for real ones." : d.charged ? `Done. ${d.charged} credits used.` : "Done.");
    } catch (e) {
      setMsg(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const cost = account ? account.costs[quality] * count : 0;
  const short = account && !account.free && account.credits < cost;

  return (
    <div id="ai-artwork" className="mt-8 scroll-mt-20 rounded-md border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="size-5 text-primary" /> Make artwork with AI
          </h2>
          <p className="mt-1 max-w-prose text-sm text-ink-2">
            Describe what you want. We write the prompt from your book and your cover colours, and the picture drops straight into the designer. Pay as you go, no subscription.
          </p>
        </div>
        {account && (
          <div className="text-right text-sm">
            <p className="font-medium">{account.free ? "Unlimited (publisher account)" : `${account.credits} credits`}</p>
            {(account.testImages || account.testPayments) && (
              <Badge variant="warning" className="mt-1">
                Test mode{account.testImages ? ": sample pictures" : ""}
                {account.testPayments ? ", no payments" : ""}
              </Badge>
            )}
          </div>
        )}
      </div>

      {account && !account.ready && <p className="mt-3 rounded bg-paper-2 p-3 text-sm">Not set up on the server yet: {account.setupError}</p>}

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="grid h-fit gap-4 text-sm">
          <div role="tablist" aria-label="Which panel" className="grid w-fit grid-cols-2 gap-1 rounded-md bg-paper-2 p-1">
            {(["front", "back"] as const).map((t) => (
              <button key={t} role="tab" type="button" aria-selected={target === t} onClick={() => setTarget(t)} className={cn("rounded px-3 py-1.5", target === t ? "bg-card font-medium" : "text-ink-2")}>
                {t === "front" ? "Front cover" : "Back cover"}
              </button>
            ))}
          </div>

          <fieldset>
            <legend className="font-medium">Style</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStyle(s.id)}
                  className={cn("rounded-md border px-3 py-1.5", style === s.id ? "border-primary bg-primary-soft text-primary" : "border-input bg-card hover:bg-muted")}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="grid gap-1">
            <span className="font-medium">What should the picture show?</span>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              rows={3}
              placeholder="A lone baobab tree at dusk, seen from below, with a flock of birds leaving it"
              className="rounded-md border border-input bg-card px-3 py-2"
            />
          </label>

          <div className="grid gap-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={usePalette} onChange={(e) => setUsePalette(e.target.checked)} />
              Use my cover colours
              <span className="flex gap-1">
                {[design.bg, design.accent, design.fg].map((c, i) => (
                  <span key={i} className="inline-block size-4 rounded-sm border border-border" style={{ background: c }} title={c} />
                ))}
              </span>
            </label>
            {target === "front" && (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={lettering} onChange={(e) => setLettering(e.target.checked)} /> Put the title and author on the picture
              </label>
            )}
            {(target === "front" ? design.imageUrl : design.backImageUrl || design.imageUrl) && (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={matchCurrent} onChange={(e) => setMatchCurrent(e.target.checked)} /> Match my current {target === "front" ? "front" : "cover"} artwork
              </label>
            )}
          </div>

          <label className="grid gap-1">
            <span className="flex items-center justify-between font-medium">
              Prompt
              {edited && (
                <button type="button" className="inline-flex items-center gap-1 text-[13px] font-normal text-primary underline" onClick={() => setEdited(false)}>
                  <RefreshCw className="size-3" /> Rewrite from my choices
                </button>
              )}
            </span>
            <textarea
              value={text}
              onChange={(e) => {
                setPrompt(e.target.value);
                setEdited(true);
              }}
              rows={7}
              className="rounded-md border border-input bg-card px-3 py-2 text-[13px] leading-relaxed"
            />
            <span className="text-[13px] text-soft">Written for you from the choices above. Edit it freely. Portrait {aspect}, sized for your trim.</span>
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            {(["draft", "print"] as const).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuality(q)}
                className={cn("rounded-md border p-3 text-left", quality === q ? "border-primary bg-primary-soft" : "border-input bg-card hover:bg-muted")}
              >
                <span className="block font-medium">
                  {q === "draft" ? "Draft" : "Print-ready 4K"} {account && <span className="font-normal text-ink-2">· {account.costs[q]} credits each</span>}
                </span>
                <span className="text-[13px] text-soft">{q === "draft" ? "Fast and cheap, for trying ideas." : "Large enough for a paperback at 300 dpi."}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              How many
              <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="h-9 rounded-md border border-input bg-card px-2">
                {[1, 2, 3, 4].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <Button onClick={() => generate()} disabled={!!busy || !account?.ready || Boolean(short) || text.trim().length < 10}>
              {busy === "generate" ? <Loader2 className="animate-spin" /> : <Wand2 />}
              Make {count} picture{count > 1 ? "s" : ""}
              {account && !account.free ? ` · ${cost} credits` : ""}
            </Button>
          </div>

          {account && !account.free && (
            <div className="grid gap-2 border-t border-border pt-4">
              <p className="font-medium">{short ? "Top up to make these pictures" : "Top up credits"}</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {account.packs.map((p) => (
                  <button key={p.id} type="button" disabled={!!busy} onClick={() => topUp(p.id)} className="rounded-md border border-input bg-card p-3 text-left hover:bg-muted disabled:opacity-50">
                    <span className="flex items-center gap-2 font-semibold">
                      {busy === p.id && <Loader2 className="size-4 animate-spin" />}
                      {p.label} · {p.credits} credits
                    </span>
                    <span className="text-[13px] text-soft">
                      About {p.drafts} drafts or {p.prints} print-ready covers
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[13px] text-soft">One-off payments through Stripe. Credits never expire. If a picture fails, the credits come back.</p>
            </div>
          )}

          {msg && (
            <p className="text-sm text-ink-2" role="status">
              {msg}
            </p>
          )}
        </div>

        <div>
          <p className="text-sm font-medium">Your pictures</p>
          {pictures.length === 0 ? (
            <p className="mt-2 text-sm text-soft">Nothing yet. Pictures you make for this book are kept here.</p>
          ) : (
            <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {pictures.map((p) => (
                <li key={p.id} className="grid gap-1.5 text-[13px]">
                  <a href={p.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded border border-border bg-paper">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.thumb} alt={p.prompt.slice(0, 120)} className="aspect-[2/3] w-full object-cover" loading="lazy" />
                  </a>
                  <span className="flex flex-wrap gap-1">
                    <Badge variant="outline">{p.quality === "print" ? "4K" : "Draft"}</Badge>
                    <Badge variant="outline">{p.target === "front" ? "Front" : "Back"}</Badge>
                    {p.mock && <Badge variant="warning">Sample</Badge>}
                  </span>
                  <span className="flex flex-wrap gap-x-3 gap-y-1">
                    <button type="button" className="text-primary underline" onClick={() => onUse("front", p.url, p.prompt.includes(LETTERING_MARK))}>
                      Use on front
                    </button>
                    <button type="button" className="text-primary underline" onClick={() => onUse("back", p.url, false)}>
                      Use on back
                    </button>
                    {p.quality === "draft" && (
                      <button
                        type="button"
                        disabled={!!busy}
                        className="text-primary underline disabled:opacity-50"
                        title="Remake this picture at 4K, keeping its look"
                        onClick={() =>
                          generate({
                            quality: "print",
                            count: 1,
                            target: p.target,
                            referenceUrl: p.url,
                            prompt: `Recreate the attached picture at high resolution, keeping its composition, subject, colours and style exactly. ${p.prompt}`,
                          })
                        }
                      >
                        {busy === "upscale" ? "Working…" : "Make 4K"}
                      </button>
                    )}
                    <a href={p.url} download className="inline-flex items-center gap-1 text-ink-2 underline">
                      <Download className="size-3" /> Save
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
