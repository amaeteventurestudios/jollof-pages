import { cn } from "@/lib/utils";

/**
 * A centred section title and subtitle, each held to one line at every width. The type is sized
 * from the line's own character count against the width of its box (container units), so a
 * longer line simply sets smaller instead of wrapping. Keep titles near 26 characters and
 * subtitles near 46.
 */
export function SectionHead({
  id,
  title,
  sub,
  as: Tag = "h2",
  className,
  subClassName,
}: {
  id?: string;
  title: string;
  sub?: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
  subClassName?: string;
}) {
  return (
    <div className={cn("head mx-auto w-full max-w-[1240px] text-center", className)}>
      <Tag id={id} className="fit fit-title wide font-bold" style={{ ["--n" as string]: title.length }} data-reveal>
        {title}
      </Tag>
      {sub && (
        <p className={cn("fit fit-sub mt-[0.9em]", subClassName)} style={{ ["--n" as string]: sub.length, ["--i" as string]: 1 }} data-reveal>
          {sub}
        </p>
      )}
    </div>
  );
}

/** A real screenshot of the studio. Square, flat, no device chrome. */
export function Shot({ src, alt, w, h, className, eager }: { src: string; alt: string; w: number; h: number; className?: string; eager?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/site/shots/${src}.webp`}
      alt={alt}
      width={w}
      height={h}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={eager ? "high" : undefined}
      className={cn("block h-auto w-full", className)}
    />
  );
}

export function Arrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("arrow size-5", className)} aria-hidden>
      <path d="M4 12h15M13 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}

/** The scotch bonnet star used as a bullet, the same mark that separates the marquee words. */
export function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-[0.8em] shrink-0", className)} aria-hidden>
      <path d="M12 0l2.6 8.4L24 12l-9.4 3.6L12 24l-2.6-8.4L0 12l9.4-3.6z" fill="currentColor" />
    </svg>
  );
}
