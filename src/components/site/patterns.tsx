import { cn } from "@/lib/utils";

/**
 * Hand-drawn repeat patterns, one per section, taken from the world around the dish: adire
 * resist-dye circles, rice grains, wax-print scales, a woven strip and pepper seeds. Each tile
 * divides 240px, so the slow drift loops without a seam.
 */
export type PatternKind = "adire" | "rice" | "wax" | "weave" | "pepper";

const TILES: Record<PatternKind, { size: number; draw: (c: string) => React.ReactNode }> = {
  adire: {
    size: 120,
    draw: (c) => (
      <g fill="none" stroke={c} strokeWidth="2.2">
        <circle cx="60" cy="60" r="40" />
        <circle cx="60" cy="60" r="28" strokeDasharray="3 5" />
        <circle cx="60" cy="60" r="15" />
        <circle cx="60" cy="60" r="4" fill={c} />
        <circle cx="0" cy="0" r="10" />
        <circle cx="120" cy="0" r="10" />
        <circle cx="0" cy="120" r="10" />
        <circle cx="120" cy="120" r="10" />
        <path d="M0 60h12M108 60h12M60 0v12M60 108v12" strokeLinecap="round" />
      </g>
    ),
  },
  rice: {
    size: 120,
    draw: (c) => (
      <g fill={c}>
        {[
          [14, 18, 20],
          [52, 10, -35],
          [92, 26, 60],
          [30, 56, -70],
          [72, 64, 15],
          [104, 82, -20],
          [16, 96, 45],
          [58, 104, -50],
          [94, 112, 80],
        ].map(([x, y, r], i) => (
          <rect key={i} x={x - 7} y={y - 2.6} width="14" height="5.2" rx="2.6" transform={`rotate(${r} ${x} ${y})`} />
        ))}
      </g>
    ),
  },
  wax: {
    size: 80,
    draw: (c) => (
      <g fill="none" stroke={c} strokeWidth="2">
        {[0, 40, 80].map((y) =>
          [-40, 0, 40, 80].map((x) => (
            <g key={`${x}-${y}`} transform={`translate(${x + (y % 80 ? 20 : 0)} ${y})`}>
              <path d="M0 0a20 20 0 0 0 40 0" />
              <path d="M8 0a12 12 0 0 0 24 0" />
              <circle cx="20" cy="0" r="3" fill={c} />
            </g>
          )),
        )}
      </g>
    ),
  },
  weave: {
    size: 48,
    draw: (c) => (
      <g fill="none" stroke={c} strokeWidth="2.4" strokeLinejoin="round">
        <path d="M0 12l12-8 12 8 12-8 12 8" />
        <path d="M0 36l12-8 12 8 12-8 12 8" />
        <rect x="20" y="17" width="8" height="8" fill={c} stroke="none" transform="rotate(45 24 21)" />
        <rect x="-4" y="41" width="8" height="8" fill={c} stroke="none" transform="rotate(45 0 45)" />
        <rect x="44" y="41" width="8" height="8" fill={c} stroke="none" transform="rotate(45 48 45)" />
      </g>
    ),
  },
  pepper: {
    size: 40,
    draw: (c) => (
      <g fill={c}>
        <circle cx="10" cy="10" r="2.4" />
        <circle cx="30" cy="30" r="2.4" />
        <circle cx="30" cy="10" r="1.1" />
        <circle cx="10" cy="30" r="1.1" />
      </g>
    ),
  },
};

export function Pattern({ id, kind, color, opacity = 1, drift = true, className }: { id: string; kind: PatternKind; color: string; opacity?: number; drift?: boolean; className?: string }) {
  const t = TILES[kind];
  return (
    <div aria-hidden className={cn("pattern pointer-events-none absolute inset-0 overflow-hidden", className)} style={{ opacity }}>
      <svg className={cn("pattern-svg absolute", drift && "pattern-drift")} width="100%" height="100%">
        <defs>
          <pattern id={id} width={t.size} height={t.size} patternUnits="userSpaceOnUse">
            {t.draw(color)}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    </div>
  );
}

/** A soft rim between two colour fields, like the edge of the pot. */
export function Rim({ color, flip, className }: { color: string; flip?: boolean; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 1440 64" preserveAspectRatio="none" className={cn("pointer-events-none absolute inset-x-0 block h-[clamp(28px,4vw,64px)] w-full", flip ? "top-[-1px] rotate-180" : "bottom-[-1px]", className)}>
      <path d="M0 64V40C180 8 360 0 540 14s360 44 540 34 270-38 360-44v60z" fill={color} />
    </svg>
  );
}
