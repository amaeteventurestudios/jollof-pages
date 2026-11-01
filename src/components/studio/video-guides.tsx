"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { VIDEO_GROUPS, VIDEO_GUIDES, VIDEO_LENGTHS, videoCaptions, videoPoster, videoSrc, type VideoGroup, type VideoGuide } from "@/lib/video-guides";
import { cn } from "@/lib/utils";

const length = (id: string) => {
  const s = VIDEO_LENGTHS[id];
  return s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "";
};

/** Plays one video guide, with previous and next to move through the rest. */
export function VideoPlayer({ id, onChange }: { id: string | null; onChange: (id: string | null) => void }) {
  const index = VIDEO_GUIDES.findIndex((v) => v.id === id);
  const v = VIDEO_GUIDES[index];
  const ref = useRef<HTMLVideoElement>(null);

  // the captions are burned into the picture; the track is for screen readers and search
  useEffect(() => {
    const video = ref.current;
    const t = video?.textTracks[0];
    if (t) t.mode = "hidden";
    // the videos are narrated; if the browser won't start them with sound (say, opened from a
    // link), they start muted and the volume button turns the voice on
    video?.play().catch(() => {
      video.muted = true;
      video.play().catch(() => {});
    });
  }, [id]);

  return (
    <Dialog open={!!v} onOpenChange={(open) => !open && onChange(null)}>
      {/* sized so the whole 16:10 video and its header fit on a laptop screen */}
      <DialogContent className="max-w-none gap-0 overflow-hidden rounded-none p-0" style={{ width: "min(1100px, calc(100vw - 2rem), (100dvh - 9rem) * 1.6)" }}>
        {v && (
          <>
            <div className="flex flex-wrap items-center gap-3 py-3 pr-12 pl-5">
              <div className="mr-auto min-w-0">
                <p className="text-xs tracking-[0.12em] text-primary uppercase">{v.group}</p>
                <DialogTitle className="mt-0.5 text-lg font-medium">{v.title}</DialogTitle>
                <DialogDescription className="text-soft">{v.summary}</DialogDescription>
              </div>
              <Button variant="outline" size="sm" disabled={index === 0} onClick={() => onChange(VIDEO_GUIDES[index - 1].id)}>
                <ArrowLeft /> Previous
              </Button>
              <Button variant="outline" size="sm" disabled={index === VIDEO_GUIDES.length - 1} onClick={() => onChange(VIDEO_GUIDES[index + 1].id)}>
                Next <ArrowRight />
              </Button>
            </div>
            <video key={v.id} ref={ref} src={videoSrc(v.id)} poster={videoPoster(v.id)} controls playsInline preload="auto" className="aspect-[16/10] w-full bg-black">
              <track kind="captions" src={videoCaptions(v.id)} srcLang="en" label="English" />
            </video>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Thumb({ v, onPlay, small }: { v: VideoGuide; onPlay: (id: string) => void; small?: boolean }) {
  return (
    <button type="button" onClick={() => onPlay(v.id)} className="group grid gap-2 text-left">
      <span className="relative block aspect-[16/10] overflow-hidden border border-border bg-paper-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- static posters, already sized */}
        <img src={videoPoster(v.id)} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        <span className="absolute inset-0 grid place-items-center bg-black/0 transition-colors group-hover:bg-black/15">
          <span className={cn("grid place-items-center bg-primary text-primary-foreground shadow-lg transition-transform group-hover:scale-110", small ? "size-9" : "size-12")}>
            <Play className={cn("fill-current", small ? "size-4" : "size-5")} />
          </span>
        </span>
        {length(v.id) && <span className="tabular absolute right-2 bottom-2 bg-black/75 px-1.5 py-0.5 text-xs text-white">{length(v.id)}</span>}
      </span>
      <span>
        <span className={cn("block font-medium group-hover:text-primary", small && "text-sm")}>{v.title}</span>
        {!small && <span className="mt-0.5 block text-sm text-soft">{v.summary}</span>}
      </span>
    </button>
  );
}

/** The videos that go with one written guide, shown inside it. */
export function VideoStrip({ tutorial, onPlay }: { tutorial: string; onPlay: (id: string) => void }) {
  const videos = VIDEO_GUIDES.filter((v) => v.tutorial === tutorial);
  if (!videos.length) return null;
  return (
    <div className="border-b border-border px-6 py-5 sm:px-10">
      <p className="text-sm font-medium">Watch it done</p>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {videos.map((v) => (
          <Thumb key={v.id} v={v} onPlay={onPlay} small />
        ))}
      </div>
    </div>
  );
}

/** Every video guide, grouped by part of the Desk. */
export function VideoLibrary({ onPlay }: { onPlay: (id: string) => void }) {
  const [group, setGroup] = useState<VideoGroup | "All">("All");
  const shown = VIDEO_GUIDES.filter((v) => group === "All" || v.group === group);
  return (
    <section id="videos" aria-labelledby="videos-title" className="mt-14 scroll-mt-44 xl:scroll-mt-20">
      <h2 id="videos-title" className="text-[clamp(1.4rem,2.4vw,1.9rem)] leading-tight tracking-[-0.02em]">
        Video guides
      </h2>
      <p className="mt-1 max-w-2xl text-soft">A short video for every feature, recorded in the Desk itself. Most are under a minute.</p>
      <div className="mt-5 flex flex-wrap gap-1" role="group" aria-label="Show videos about">
        {(["All", ...VIDEO_GROUPS] as const).map((g) => (
          <Button key={g} size="sm" variant={group === g ? "secondary" : "ghost"} aria-pressed={group === g} onClick={() => setGroup(g)}>
            {g}
          </Button>
        ))}
      </div>
      <div className="mt-6 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((v) => (
          <Thumb key={v.id} v={v} onPlay={onPlay} />
        ))}
      </div>
    </section>
  );
}
