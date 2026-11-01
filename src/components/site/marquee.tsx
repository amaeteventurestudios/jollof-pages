/** A strip that runs sideways forever; pauses under the pointer. */
export function Marquee({ items, className, speed = 38 }: { items: string[]; className?: string; speed?: number }) {
  const run = [...items, ...items];
  return (
    <div className={`marquee overflow-hidden ${className ?? ""}`} aria-label={items.join(", ")} role="marquee">
      <div className="marquee-track" style={{ ["--speed" as string]: `${speed}s` }} aria-hidden>
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0 items-center">
            {run.map((t, i) => (
              <span key={i} className="flex items-center">
                <span className="wide px-6 whitespace-nowrap sm:px-10">{t}</span>
                <svg viewBox="0 0 24 24" className="size-[0.7em] shrink-0" aria-hidden>
                  <path d="M12 0l2.6 8.4L24 12l-9.4 3.6L12 24l-2.6-8.4L0 12l9.4-3.6z" fill="currentColor" />
                </svg>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
