import { cn } from "@/lib/utils";

/**
 * Hand-drawn repeat patterns, one per section, taken from the world around the dish: adire
 * resist-dye circles, rice grains, wax-print scales, a woven strip and pepper seeds. Each tile
 * divides 240px, so the slow drift loops without a seam. Also from Nigeria: uli line drawing
 * (spirals, the python's back, kola lobes), aso-oke strip weaving, nsibidi signs, and a herd of
 * savanna animals for the shelf of finished books.
 */
export type PatternKind = "adire" | "rice" | "wax" | "weave" | "pepper" | "uli" | "aso" | "animals" | "nsibidi";

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
  uli: {
    size: 120,
    draw: (c) => (
      <g fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round">
        {/* spiral */}
        <path d="M30 34c0-5 7-6 9-1s-3 11-10 10-11-8-8-15 13-11 20-6 7 14 2 19" />
        {/* the python's back */}
        <path d="M58 22c6-8 12 8 18 0s12 8 18 0 12 8 18 0" />
        <path d="M58 30c6-8 12 8 18 0s12 8 18 0 12 8 18 0" strokeDasharray="1 5" />
        {/* kola lobes */}
        <path d="M84 70c-10-14 10-14 0 0c14-10 14 10 0 0c10 14-10 14 0 0c-14 10-14-10 0 0" />
        {/* crescents and dots */}
        <path d="M14 84a14 14 0 0 0 24 10" />
        <path d="M20 80a8 8 0 0 0 13 6" />
        <circle cx="46" cy="70" r="1.6" fill={c} />
        <circle cx="52" cy="78" r="1.6" fill={c} />
        <circle cx="46" cy="86" r="1.6" fill={c} />
        <path d="M60 108l8-8 8 8 8-8 8 8" />
        <circle cx="108" cy="104" r="5" />
      </g>
    ),
  },
  aso: {
    size: 96,
    draw: (c) => (
      <g fill={c}>
        {/* narrow woven strips sewn side by side, each with its own stripe and float pattern */}
        <rect x="0" y="0" width="3" height="96" />
        <rect x="9" y="0" width="1.5" height="96" />
        <rect x="14" y="0" width="1.5" height="96" />
        {[0, 12, 24, 36, 48, 60, 72, 84].map((y) => (
          <rect key={y} x="22" y={y + 3} width="18" height="5" opacity="0.8" />
        ))}
        <rect x="46" y="0" width="1.5" height="96" />
        {[0, 24, 48, 72].map((y) => (
          <path key={y} d={`M54 ${y + 12}l7-9 7 9-7 9z`} />
        ))}
        <rect x="74" y="0" width="1.5" height="96" />
        <rect x="80" y="0" width="6" height="96" opacity="0.6" />
        <rect x="90" y="0" width="1.5" height="96" />
      </g>
    ),
  },
  nsibidi: {
    size: 120,
    draw: (c) => (
      <g fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {/* two people together, a home, a meeting, a road and a word kept */}
        <circle cx="22" cy="22" r="10" />
        <path d="M14 22h16M22 14v16" />
        <path d="M60 14l12 12-12 12-12-12z" />
        <circle cx="60" cy="26" r="2" fill={c} />
        <path d="M92 12v24M104 12v24M92 24h12" />
        <path d="M14 66c8-12 24-12 32 0M14 66c8 12 24 12 32 0" />
        <circle cx="30" cy="66" r="2.5" fill={c} />
        <path d="M66 56l8 10-8 10M82 56l8 10-8 10" />
        <path d="M100 58h12v16h-12z" />
        <path d="M100 58l6-6 6 6" />
        <path d="M18 98l12 12M30 98l-12 12" />
        <circle cx="62" cy="104" r="9" />
        <circle cx="62" cy="104" r="3" />
        <path d="M86 104h30" strokeDasharray="4 4" />
      </g>
    ),
  },
  animals: {
    size: 320,
    draw: (c) => (
      <g fill={c}>
        {/* elephant */}
        <g transform="translate(14 40)">
          <ellipse cx="58" cy="40" rx="28" ry="19" />
          <circle cx="28" cy="32" r="14" />
          <ellipse cx="38" cy="33" rx="10" ry="14" />
          <path d="M16 34c-8 12-6 24 0 30l5-2c-5-8-4-17 3-24z" />
          <rect x="38" y="50" width="8" height="22" />
          <rect x="50" y="52" width="8" height="20" />
          <rect x="66" y="52" width="8" height="20" />
          <rect x="77" y="50" width="8" height="22" />
          <path d="M85 34l9 14-2 1-9-12z" />
        </g>
        {/* giraffe */}
        <g transform="translate(196 20)">
          <ellipse cx="40" cy="78" rx="24" ry="12" />
          <path d="M50 72L70 20l9 3-17 54z" />
          <ellipse cx="78" cy="18" rx="11" ry="6" transform="rotate(18 78 18)" />
          <rect x="72" y="6" width="2" height="8" />
          <rect x="77" y="6" width="2" height="8" />
          <rect x="22" y="82" width="4" height="34" />
          <rect x="30" y="84" width="4" height="32" />
          <rect x="48" y="84" width="4" height="32" />
          <rect x="56" y="82" width="4" height="34" />
          <path d="M16 74l-8 14 2 1 8-12z" />
        </g>
        {/* antelope with long curved horns */}
        <g transform="translate(40 210)">
          <ellipse cx="40" cy="30" rx="22" ry="10" />
          <path d="M56 26l10-16 7 3-10 16z" />
          <ellipse cx="70" cy="11" rx="8" ry="5" transform="rotate(-20 70 11)" />
          <path d="M66 7c-2-10 2-18 10-22l1 2c-6 4-8 11-7 19z" />
          <path d="M70 7c0-10 5-17 13-20l1 2c-7 3-10 10-10 18z" />
          <rect x="22" y="34" width="3" height="24" />
          <rect x="30" y="36" width="3" height="22" />
          <rect x="48" y="36" width="3" height="22" />
          <rect x="55" y="34" width="3" height="24" />
          <path d="M18 26l-6 6 2 2 6-5z" />
        </g>
        {/* birds in flight */}
        <path d="M200 230c8-8 16-8 22 0c6-8 14-8 22 0c-8-3-16-1-22 5c-6-6-14-8-22-5z" />
        <path d="M250 276c6-6 12-6 16 0c4-6 10-6 16 0c-6-2-12-1-16 4c-4-5-10-6-16-4z" />
        <path d="M140 150c5-5 10-5 13 0c3-5 8-5 13 0c-5-2-10-1-13 3c-3-4-8-5-13-3z" />
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

/** A hard woven edge between two colour fields: a row of squares in the next section's colour. */
export function Rim({ color, flip, className }: { color: string; flip?: boolean; className?: string }) {
  return (
    <svg aria-hidden className={cn("pointer-events-none absolute inset-x-0 block h-6 w-full", flip ? "top-[-1px] rotate-180" : "bottom-[-1px]", className)}>
      <defs>
        <pattern id={`rim-${color.replace(/\W/g, "")}`} width="48" height="24" patternUnits="userSpaceOnUse">
          <rect x="0" y="12" width="48" height="12" fill={color} />
          <rect x="0" y="0" width="12" height="12" fill={color} />
          <rect x="24" y="0" width="12" height="12" fill={color} />
        </pattern>
      </defs>
      <rect width="100%" height="24" fill={`url(#rim-${color.replace(/\W/g, "")})`} />
    </svg>
  );
}
