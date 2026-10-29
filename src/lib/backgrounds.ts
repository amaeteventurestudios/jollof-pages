/**
 * The built-in background library: 112 page backgrounds an author can put behind a whole book,
 * a chapter, or a chapter heading. 64 are GeoPattern tiles (MIT) in four paper tints; 48 are
 * drawn here, including prints inspired by kente, bogolan mudcloth, ankara wax prints and
 * Ndebele house painting, and painted marble spreads that run across both facing pages.
 * All are SVG, so print, EPUB and preview share them.
 */
import GeoPattern from "geopattern";
import { isLibraryBackground, libraryId } from "./background-ref";

export type BackgroundGroup = "Painted" | "African prints" | "Paper and texture" | "Pictures" | "Geometric";

export interface Background {
  id: string;
  name: string;
  group: BackgroundGroup;
  /** the dominant colour, for swatches and to pick a readable text colour */
  tint: string;
  /** a dark page: text over it is set in a light colour */
  dark?: boolean;
}

interface Drawn extends Background {
  /** tiles repeat; covers are stretched over the page; spreads are two pages wide and run across the open book */
  mode: "tile" | "cover" | "spread";
  w: number;
  h: number;
  body: string;
}

const GEO = [
  ["octogons", "Octagons"],
  ["overlappingCircles", "Overlapping circles"],
  ["plusSigns", "Plus signs"],
  ["xes", "Crosses"],
  ["sineWaves", "Waves"],
  ["hexagons", "Hexagons"],
  ["overlappingRings", "Rings"],
  ["plaid", "Plaid"],
  ["triangles", "Triangles"],
  ["squares", "Squares"],
  ["concentricCircles", "Target circles"],
  ["diamonds", "Diamonds"],
  ["tessellation", "Tessellation"],
  ["nestedSquares", "Nested squares"],
  ["mosaicSquares", "Mosaic"],
  ["chevrons", "Chevrons"],
] as const;

const TINTS = [
  ["cream", "Cream", "#f5ecdc"],
  ["blush", "Blush", "#f6e1dc"],
  ["sage", "Sage", "#e3eadb"],
  ["sky", "Sky", "#dfe8f0"],
] as const;

const rect = (fill: string) => `<rect width="100%" height="100%" fill="${fill}"/>`;

// --- drawn backgrounds -------------------------------------------------------------------------

function kente(): string {
  // woven blocks: alternating bands of warp and weft stripes
  const c = ["#e9c46a", "#2a9d8f", "#e76f51", "#264653"];
  let s = rect("#f7efdc");
  for (let i = 0; i < 4; i++) {
    const x = i * 30;
    const col = c[i];
    if (i % 2 === 0) for (let k = 0; k < 4; k++) s += `<rect x="${x + 3}" y="${4 + k * 7}" width="24" height="3" fill="${col}" opacity="0.35"/>`;
    else for (let k = 0; k < 4; k++) s += `<rect x="${x + 4 + k * 6}" y="2" width="3" height="26" fill="${col}" opacity="0.35"/>`;
    s += `<rect x="${x}" y="30" width="30" height="6" fill="${c[(i + 2) % 4]}" opacity="0.25"/>`;
  }
  return s;
}

function bogolan(): string {
  // mudcloth marks: dashes, dots and zigzags on an earth ground
  const ink = "#5b3a24";
  return `${rect("#efe3cf")}<g stroke="${ink}" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.28">
<path d="M8 10h14M30 10h14M52 10h14"/><path d="M6 30l6-6 6 6 6-6 6 6 6-6 6 6 6-6 6 6 6-6 6 6"/>
<path d="M8 50h14M30 50h14M52 50h14"/></g><g fill="${ink}" opacity="0.28"><circle cx="15" cy="62" r="2"/><circle cx="37" cy="62" r="2"/><circle cx="59" cy="62" r="2"/></g>`;
}

function adinkraRings(): string {
  const ink = "#3d2b1f";
  return `${rect("#f3ead8")}<g fill="none" stroke="${ink}" stroke-width="1.6" opacity="0.22"><circle cx="24" cy="24" r="14"/><circle cx="24" cy="24" r="7"/><path d="M24 4v40M4 24h40"/></g>`;
}

function ankaraDots(): string {
  return `${rect("#f8ead9")}<g opacity="0.3"><circle cx="16" cy="16" r="10" fill="#d97706"/><circle cx="16" cy="16" r="5" fill="#7c2d12"/><circle cx="48" cy="48" r="10" fill="#0e7490"/><circle cx="48" cy="48" r="5" fill="#f59e0b"/><circle cx="48" cy="16" r="3" fill="#7c2d12"/><circle cx="16" cy="48" r="3" fill="#0e7490"/></g>`;
}

function ndebele(): string {
  return `${rect("#f6f1e7")}<g opacity="0.3" stroke="#111" stroke-width="2.5"><rect x="4" y="4" width="34" height="34" fill="#facc15"/><rect x="42" y="4" width="34" height="34" fill="#2563eb"/><rect x="4" y="42" width="34" height="34" fill="#dc2626"/><rect x="42" y="42" width="34" height="34" fill="#16a34a"/></g><g opacity="0.3" fill="#fff" stroke="#111" stroke-width="2"><path d="M21 12l9 9-9 9-9-9z"/><path d="M59 50l9 9-9 9-9-9z"/></g>`;
}

function shweshwe(): string {
  return `${rect("#e6ecf5")}<g fill="#1e3a8a" opacity="0.22"><circle cx="10" cy="10" r="2"/><circle cx="6" cy="10" r="1.2"/><circle cx="14" cy="10" r="1.2"/><circle cx="10" cy="6" r="1.2"/><circle cx="10" cy="14" r="1.2"/><circle cx="30" cy="30" r="2"/><circle cx="26" cy="30" r="1.2"/><circle cx="34" cy="30" r="1.2"/><circle cx="30" cy="26" r="1.2"/><circle cx="30" cy="34" r="1.2"/></g>`;
}

function raffia(): string {
  let s = rect("#f1e6c8");
  for (let i = 0; i < 8; i++) s += `<path d="M0 ${i * 5 + 2} Q10 ${i * 5} 20 ${i * 5 + 2} T40 ${i * 5 + 2}" stroke="#a16207" stroke-width="1" fill="none" opacity="${0.12 + (i % 3) * 0.06}"/>`;
  return s;
}

function basket(): string {
  return `${rect("#f3e9d2")}<g fill="#92400e" opacity="0.16"><rect x="2" y="2" width="16" height="6" rx="3"/><rect x="2" y="10" width="16" height="6" rx="3"/><rect x="22" y="2" width="6" height="16" rx="3"/><rect x="30" y="2" width="6" height="16" rx="3"/><rect x="2" y="22" width="6" height="16" rx="3"/><rect x="10" y="22" width="6" height="16" rx="3"/><rect x="22" y="22" width="16" height="6" rx="3"/><rect x="22" y="30" width="16" height="6" rx="3"/></g>`;
}

function cowrie(): string {
  return `${rect("#f4ede1")}<g opacity="0.25" fill="#fff" stroke="#78350f" stroke-width="1.2"><ellipse cx="14" cy="14" rx="6" ry="9"/><ellipse cx="42" cy="42" rx="6" ry="9"/></g><g stroke="#78350f" stroke-width="1.2" opacity="0.3"><path d="M14 7v14M42 35v14"/></g>`;
}

function asoOke(): string {
  let s = rect("#f6ecdf");
  const c = ["#9d174d", "#ca8a04", "#065f46"];
  for (let i = 0; i < 6; i++) s += `<rect x="0" y="${i * 8}" width="48" height="${i % 2 ? 2 : 4}" fill="${c[i % 3]}" opacity="0.22"/>`;
  s += `<path d="M0 44l6-4 6 4 6-4 6 4 6-4 6 4 6-4 6 4" stroke="#9d174d" fill="none" stroke-width="1.2" opacity="0.3"/>`;
  return s;
}

function dunes(): string {
  let s = rect("#f6e7cf");
  for (let i = 0; i < 5; i++) s += `<path d="M0 ${12 + i * 12} C25 ${4 + i * 12} 55 ${20 + i * 12} 80 ${12 + i * 12}" stroke="#b45309" fill="none" stroke-width="1.2" opacity="${0.12 + i * 0.03}"/>`;
  return s;
}

function sunburstKente(): string {
  // a woven diamond band, like the border of a strip-woven cloth
  return `${rect("#f8efe0")}<g opacity="0.25"><path d="M0 20l10-10 10 10-10 10z" fill="#b45309"/><path d="M20 20l10-10 10 10-10 10z" fill="#065f46"/><path d="M10 20l10-10 10 10-10 10z" fill="none" stroke="#111" stroke-width="1"/></g>`;
}

function linen(): string {
  let s = rect("#f5f0e6");
  for (let i = 0; i < 12; i++) s += `<path d="M0 ${i * 2 + 1}H24M${i * 2 + 1} 0V24" stroke="#8a7a5c" stroke-width="0.4" opacity="${i % 3 ? 0.08 : 0.14}"/>`;
  return s;
}

function laid(): string {
  let s = rect("#f8f4ea");
  for (let i = 0; i < 10; i++) s += `<path d="M0 ${i * 3 + 1}H60" stroke="#a89878" stroke-width="0.35" opacity="0.18"/>`;
  return s + `<path d="M30 0V30" stroke="#a89878" stroke-width="0.6" opacity="0.2"/>`;
}

const grain = (base: string, op: number) =>
  `<filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.35 0 0 0 0 0.3 0 0 0 0 0.25 0 0 0 ${op} 0"/></filter>${rect(base)}<rect width="100%" height="100%" filter="url(#g)"/>`;

function ruled(): string {
  return `${rect("#fbfaf6")}<path d="M0 23.5H40" stroke="#93c5fd" stroke-width="0.8" opacity="0.6"/>`;
}

function graph(): string {
  return `${rect("#fbfbf8")}<path d="M0 .5H20M.5 0V20" stroke="#94a3b8" stroke-width="0.5" opacity="0.45"/>`;
}

function dotGrid(): string {
  return `${rect("#fbfaf7")}<circle cx="10" cy="10" r="0.9" fill="#94a3b8" opacity="0.6"/>`;
}

function icons(tint: string, ink: string, shape: string): string {
  return `${rect(tint)}<g fill="none" stroke="${ink}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.22">${shape}</g>`;
}

const STAR = (x: number, y: number, r: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(" ")}"/>`;
};

const HEART = (x: number, y: number, s: number) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M12 21s-7-4.4-9.3-9C1 8.6 3.3 5 6.8 5c2.1 0 3.6 1.2 5.2 3 1.6-1.8 3.1-3 5.2-3 3.5 0 5.8 3.6 4.1 7-2.3 4.6-9.3 9-9.3 9z"/>`;

const LEAF = (x: number, y: number, r: number) => `<path transform="translate(${x} ${y}) rotate(${r})" d="M0 0C8-8 20-6 22 0 20 6 8 8 0 0zM0 0h22"/>`;

const FLOWER = (x: number, y: number) =>
  `<g transform="translate(${x} ${y})"><circle r="3"/>${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="3.5" ry="6.5" transform="rotate(${a}) translate(0 -8)"/>`).join("")}</g>`;

const SNOW = (x: number, y: number) => `<g transform="translate(${x} ${y})"><path d="M0-8V8M-7-4L7 4M-7 4L7-4"/><path d="M-2-6L0-8 2-6M-2 6L0 8 2 6"/></g>`;

const NOTE = (x: number, y: number) => `<g transform="translate(${x} ${y})"><circle cx="0" cy="10" r="3"/><path d="M3 10V-4l9-2v12"/><circle cx="9" cy="8" r="3"/></g>`;

const CLOUD = (x: number, y: number) => `<path transform="translate(${x} ${y})" d="M6 16h18a5 5 0 0 0 0-10 7 7 0 0 0-13-2A5 5 0 0 0 6 16z"/>`;

const MOON = (x: number, y: number) => `<path transform="translate(${x} ${y})" d="M12 3a7 7 0 1 0 9 9 9 9 0 1 1-9-9z"/>`;

function confetti(): string {
  const c = ["#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#a855f7"];
  let s = rect("#fdf8f3");
  const pts = [
    [8, 10, 20],
    [40, 6, -30],
    [70, 18, 60],
    [20, 40, -10],
    [55, 44, 40],
    [10, 70, 70],
    [44, 72, -50],
    [72, 60, 15],
  ];
  pts.forEach(([x, y, r], i) => (s += `<rect x="${x}" y="${y}" width="7" height="3" rx="1" fill="${c[i % 5]}" opacity="0.35" transform="rotate(${r} ${x} ${y})"/>`));
  return s;
}

function bokeh(): string {
  return `${rect("#f7f1ea")}<g opacity="0.35"><circle cx="20%" cy="25%" r="9%" fill="#fde68a"/><circle cx="70%" cy="15%" r="6%" fill="#fbcfe8"/><circle cx="80%" cy="60%" r="11%" fill="#bfdbfe"/><circle cx="30%" cy="75%" r="7%" fill="#bbf7d0"/><circle cx="55%" cy="45%" r="4%" fill="#fecaca"/></g>`;
}

function sunburst(): string {
  let s = rect("#fbf3e4");
  for (let i = 0; i < 24; i++) {
    const a = (i * 15 * Math.PI) / 180;
    s += `<path d="M50 50L${(50 + 80 * Math.cos(a)).toFixed(1)} ${(50 + 80 * Math.sin(a)).toFixed(1)}" stroke="#f59e0b" stroke-width="${i % 2 ? 0.4 : 1.2}" opacity="0.2"/>`;
  }
  return s;
}

function topo(): string {
  let s = rect("#f3f4ef");
  for (let i = 1; i < 8; i++) s += `<ellipse cx="50" cy="55" rx="${i * 7}" ry="${i * 5}" transform="rotate(${i * 4} 50 55)" fill="none" stroke="#4d7c0f" stroke-width="0.6" opacity="0.25"/>`;
  return s;
}

function rain(): string {
  return `${rect("#eef2f6")}<g stroke="#475569" stroke-width="1" stroke-linecap="round" opacity="0.2"><path d="M6 4l-3 8M22 14l-3 8M14 28l-3 8M30 2l-3 8M34 26l-3 8"/></g>`;
}

function watercolor(): string {
  return `<filter id="b"><feGaussianBlur stdDeviation="40"/></filter>${rect("#fbf7f2")}<g filter="url(#b)" opacity="0.45"><circle cx="20%" cy="20%" r="22%" fill="#fbcfe8"/><circle cx="80%" cy="35%" r="25%" fill="#bae6fd"/><circle cx="45%" cy="85%" r="28%" fill="#fde68a"/></g>`;
}

function parchment(): string {
  return `<radialGradient id="p" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#fbf4e2"/><stop offset="0.7" stop-color="#f1e2c0"/><stop offset="1" stop-color="#d9c08f"/></radialGradient><rect width="100%" height="100%" fill="url(#p)"/>`;
}

function dusk(): string {
  return `<linearGradient id="d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fde2e4"/><stop offset="1" stop-color="#dbe7f7"/></linearGradient><rect width="100%" height="100%" fill="url(#d)"/>`;
}

function savanna(): string {
  return `<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fdf1d8"/><stop offset="1" stop-color="#f6d9a8"/></linearGradient><rect width="100%" height="100%" fill="url(#s)"/><g fill="#7c4a1e" opacity="0.18"><path d="M0 828Q150 774 300 819T600 801V900H0z"/><path d="M456 801v-81M456 720q-36-27-60 0M456 720q36-27 60 0" stroke="#7c4a1e" stroke-width="5" fill="none"/></g>`;
}

// --- painted spreads ------------------------------------------------------------------------------

/** a small seeded random generator, so every painted spread comes out the same each time */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PW = 1200;
const PH = 900;

/**
 * Marbled washes that sweep up from one corner, edged with gold veins and scattered gold flecks.
 * Drawn two pages wide (1200 x 900), heaviest on the left page so the right page stays clear for text.
 */
function marble(seed: number, base: string, washes: string[], gold: string, from: "left" | "right" = "left"): string {
  const r = seeded(seed);
  const f = (n: number) => n.toFixed(0);
  let bands = "";
  let veins = "";
  washes.forEach((c, i) => {
    // each band is a wave rising from the bottom corner toward the middle of the spread
    const y0 = PH * (0.32 + i * 0.13 + r() * 0.06);
    const y1 = y0 + PH * (0.08 + r() * 0.1);
    const reach = PW * (0.55 + r() * 0.35);
    const top = `M0 ${f(y0)} C${f(reach * 0.25)} ${f(y0 - 90 - r() * 120)} ${f(reach * 0.55)} ${f(y0 + 60 + r() * 80)} ${f(reach)} ${f(PH * (0.82 + r() * 0.12))}`;
    bands += `<path d="${top} L${f(reach)} ${PH} L0 ${PH}Z" fill="${c}" opacity="${(0.55 + r() * 0.3).toFixed(2)}" filter="url(#soft)"/>`;
    veins += `<path d="${top}" fill="none" stroke="${gold}" stroke-width="${(1 + r() * 2.2).toFixed(1)}" opacity="${(0.55 + r() * 0.4).toFixed(2)}"/>`;
    if (r() > 0.4) veins += `<path d="M0 ${f(y1)} C${f(reach * 0.3)} ${f(y1 - 60)} ${f(reach * 0.6)} ${f(y1 + 70)} ${f(reach * 0.92)} ${f(PH)}" fill="none" stroke="${gold}" stroke-width="0.8" opacity="0.5"/>`;
  });
  let flecks = "";
  for (let i = 0; i < 70; i++) {
    // flecks cluster along the upper edge of the washes, thinning out toward the right page
    const x = Math.pow(r(), 1.6) * PW * 0.9;
    const y = PH * (0.18 + r() * 0.55) + (x / PW) * 120;
    const rad = r() < 0.12 ? 5 + r() * 7 : 0.8 + r() * 3;
    flecks += `<circle cx="${f(x)}" cy="${f(y)}" r="${rad.toFixed(1)}" fill="${gold}" opacity="${(0.55 + r() * 0.45).toFixed(2)}"/>`;
  }
  const art = `<filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="14"/></filter>${rect(base)}<g>${bands}</g><g>${veins}</g><g>${flecks}</g>`;
  return from === "left" ? art : `<g transform="translate(${PW} 0) scale(-1 1)">${art}</g>`;
}

const PAINTED: Drawn[] = (
  [
    ["marble-gold", "Marble and gold", "#f6eddf", ["#e9dfcd", "#ddd6cb", "#cdc8c1", "#b8bcc1"], "#c99a3d", false],
    ["marble-night", "Night marble", "#1c2330", ["#2a3343", "#384356", "#4a566a", "#232a36"], "#d6aa4e", true],
    ["ink-wash", "Ink wash", "#f4f2ee", ["#e0e4ea", "#c7ced8", "#9ea9b8", "#6f7d91"], "#8d99ab", false],
    ["sea-glass", "Sea glass", "#eef5f3", ["#d4e9e4", "#b6d9d1", "#90c4b9", "#609f96"], "#c9a24a", false],
    ["blush-marble", "Blush marble", "#f8ece8", ["#f2dad4", "#e9c4bc", "#ddaba1", "#c98d81"], "#c79a52", false],
    ["sage-marble", "Sage marble", "#eff2e8", ["#dee6d3", "#c9d5b9", "#afc099", "#8ba174"], "#b8913f", false],
    ["terracotta-wash", "Terracotta wash", "#f6e9df", ["#f0d3c0", "#e3b197", "#d08e6d", "#b16b49"], "#b9853a", false],
    ["indigo-night", "Indigo night", "#141a33", ["#1f2851", "#2b376b", "#3a4886", "#10152d"], "#e0b65a", true],
    ["emerald-night", "Emerald night", "#0f2620", ["#16372e", "#1f4b3e", "#2a6050", "#0b1d18"], "#d8b25a", true],
    ["sunset-wash", "Sunset wash", "#fbefe4", ["#fbdac5", "#f6c3a9", "#eeaa90", "#df907d"], "#cf9b4f", false],
    ["aubergine-night", "Aubergine night", "#24152a", ["#34213b", "#452b4d", "#583a60", "#1a0f1d"], "#e0b05c", true],
    ["sand-gold", "Sand and gold", "#f7f0e2", ["#eee2c9", "#e1d0ad", "#d2bc90", "#c0a676"], "#b48a36", false],
  ] as const
).map(([id, name, base, washes, gold, dark], i) => ({
  id,
  name,
  group: "Painted" as const,
  tint: base,
  dark,
  mode: "spread" as const,
  w: PW,
  h: PH,
  body: marble(101 + i * 37, base, [...washes], gold),
}));

const DRAWN: Drawn[] = [
  ...PAINTED,
  { id: "kente", name: "Kente weave", group: "African prints", tint: "#f7efdc", mode: "tile", w: 120, h: 36, body: kente() },
  { id: "bogolan", name: "Bogolan mudcloth", group: "African prints", tint: "#efe3cf", mode: "tile", w: 74, h: 72, body: bogolan() },
  { id: "adinkra", name: "Adinkra rings", group: "African prints", tint: "#f3ead8", mode: "tile", w: 48, h: 48, body: adinkraRings() },
  { id: "ankara", name: "Ankara dots", group: "African prints", tint: "#f8ead9", mode: "tile", w: 64, h: 64, body: ankaraDots() },
  { id: "ndebele", name: "Ndebele blocks", group: "African prints", tint: "#f6f1e7", mode: "tile", w: 80, h: 80, body: ndebele() },
  { id: "shweshwe", name: "Shweshwe florets", group: "African prints", tint: "#e6ecf5", mode: "tile", w: 40, h: 40, body: shweshwe() },
  { id: "raffia", name: "Raffia", group: "African prints", tint: "#f1e6c8", mode: "tile", w: 40, h: 40, body: raffia() },
  { id: "basket", name: "Basket weave", group: "African prints", tint: "#f3e9d2", mode: "tile", w: 40, h: 40, body: basket() },
  { id: "cowrie", name: "Cowrie shells", group: "African prints", tint: "#f4ede1", mode: "tile", w: 56, h: 56, body: cowrie() },
  { id: "aso-oke", name: "Aso oke stripes", group: "African prints", tint: "#f6ecdf", mode: "tile", w: 48, h: 48, body: asoOke() },
  { id: "dunes", name: "Sahara dunes", group: "African prints", tint: "#f6e7cf", mode: "tile", w: 80, h: 60, body: dunes() },
  { id: "strip-weave", name: "Strip weave border", group: "African prints", tint: "#f8efe0", mode: "tile", w: 40, h: 40, body: sunburstKente() },
  { id: "linen", name: "Linen", group: "Paper and texture", tint: "#f5f0e6", mode: "tile", w: 24, h: 24, body: linen() },
  { id: "laid", name: "Laid paper", group: "Paper and texture", tint: "#f8f4ea", mode: "tile", w: 60, h: 30, body: laid() },
  { id: "parchment", name: "Parchment", group: "Paper and texture", tint: "#f1e2c0", mode: "cover", w: 600, h: 900, body: parchment() },
  { id: "grain", name: "Paper grain", group: "Paper and texture", tint: "#f7f3ea", mode: "tile", w: 160, h: 160, body: grain("#f7f3ea", 0.18) },
  { id: "kraft", name: "Kraft", group: "Paper and texture", tint: "#e7d3b0", mode: "tile", w: 160, h: 160, body: grain("#e7d3b0", 0.22) },
  { id: "watercolor", name: "Watercolour wash", group: "Paper and texture", tint: "#fbf7f2", mode: "cover", w: 600, h: 900, body: watercolor() },
  { id: "ruled", name: "Ruled notebook", group: "Paper and texture", tint: "#fbfaf6", mode: "tile", w: 40, h: 24, body: ruled() },
  { id: "graph", name: "Graph paper", group: "Paper and texture", tint: "#fbfbf8", mode: "tile", w: 20, h: 20, body: graph() },
  { id: "dot-grid", name: "Dot grid", group: "Paper and texture", tint: "#fbfaf7", mode: "tile", w: 20, h: 20, body: dotGrid() },
  { id: "dusk", name: "Dusk gradient", group: "Paper and texture", tint: "#fde2e4", mode: "cover", w: 600, h: 900, body: dusk() },
  { id: "stars", name: "Stars", group: "Pictures", tint: "#eef0f8", mode: "tile", w: 80, h: 80, body: icons("#eef0f8", "#3730a3", STAR(18, 18, 7) + STAR(58, 50, 5) + STAR(30, 66, 3)) },
  { id: "moons", name: "Moons", group: "Pictures", tint: "#eceff7", mode: "tile", w: 72, h: 72, body: icons("#eceff7", "#312e81", MOON(6, 6) + MOON(42, 40)) },
  { id: "hearts", name: "Hearts", group: "Pictures", tint: "#fbe9ec", mode: "tile", w: 64, h: 64, body: icons("#fbe9ec", "#be123c", HEART(6, 6, 0.8) + HEART(38, 36, 0.6)) },
  { id: "leaves", name: "Leaves", group: "Pictures", tint: "#e9f1e4", mode: "tile", w: 72, h: 72, body: icons("#e9f1e4", "#3f6212", LEAF(8, 20, -20) + LEAF(40, 54, 30)) },
  { id: "florals", name: "Florals", group: "Pictures", tint: "#fbeef3", mode: "tile", w: 72, h: 72, body: icons("#fbeef3", "#9d174d", FLOWER(18, 18) + FLOWER(54, 54)) },
  { id: "snow", name: "Snowflakes", group: "Pictures", tint: "#eef4fa", mode: "tile", w: 64, h: 64, body: icons("#eef4fa", "#1e40af", SNOW(16, 16) + SNOW(48, 46)) },
  { id: "music", name: "Music notes", group: "Pictures", tint: "#f3effa", mode: "tile", w: 64, h: 64, body: icons("#f3effa", "#5b21b6", NOTE(10, 12) + NOTE(40, 40)) },
  { id: "clouds", name: "Clouds", group: "Pictures", tint: "#eef5fb", mode: "tile", w: 80, h: 64, body: icons("#eef5fb", "#0369a1", CLOUD(4, 6) + CLOUD(44, 36)) },
  { id: "confetti", name: "Confetti", group: "Pictures", tint: "#fdf8f3", mode: "tile", w: 84, h: 84, body: confetti() },
  { id: "bokeh", name: "Bokeh", group: "Pictures", tint: "#f7f1ea", mode: "cover", w: 600, h: 900, body: bokeh() },
  { id: "sunburst", name: "Sunburst", group: "Pictures", tint: "#fbf3e4", mode: "cover", w: 100, h: 100, body: sunburst() },
  { id: "topo", name: "Contour lines", group: "Pictures", tint: "#f3f4ef", mode: "cover", w: 100, h: 110, body: topo() },
  { id: "rain", name: "Rain", group: "Pictures", tint: "#eef2f6", mode: "tile", w: 40, h: 40, body: rain() },
  { id: "savanna", name: "Savanna horizon", group: "Pictures", tint: "#fdf1d8", mode: "cover", w: 600, h: 900, body: savanna() },
];

const GEO_BG: Background[] = GEO.flatMap(([gen, name]) => TINTS.map(([t, tname, tint]) => ({ id: `${gen}-${t}`, name: `${name}, ${tname.toLowerCase()}`, group: "Geometric" as const, tint })));

export const BACKGROUNDS: Background[] = [...DRAWN.map(({ id, name, group, tint, dark }) => ({ id, name, group, tint, ...(dark ? { dark } : {}) })), ...GEO_BG];

export const BACKGROUND_GROUPS: BackgroundGroup[] = ["Painted", "African prints", "Paper and texture", "Pictures", "Geometric"];

/** The colour text should take over a background: light over the dark painted spreads, else none. */
export function textOverBackground(src: string | undefined): string | null {
  if (!src || !isLibraryBackground(src)) return null;
  return getBackground(libraryId(src))?.dark ? "#f3ede2" : null;
}

export function getBackground(id: string | undefined): Background | undefined {
  return id ? BACKGROUNDS.find((b) => b.id === id) : undefined;
}

export interface BackgroundArt {
  svg: string;
  width: number;
  height: number;
  mode: "tile" | "cover" | "spread";
}

const cache = new Map<string, BackgroundArt>();

/** The background as SVG. `strength` (0 to 1) fades it toward white so text stays readable. */
export function backgroundArt(id: string, strength = 1): BackgroundArt | null {
  const key = `${id}@${strength}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let art: BackgroundArt | null = null;
  const drawn = DRAWN.find((d) => d.id === id);
  // fade toward the page's own colour, so a dark spread stays dark
  const veil = strength < 1 ? `<rect width="100%" height="100%" fill="${drawn?.dark ? drawn.tint : "#fff"}" opacity="${(1 - strength).toFixed(2)}"/>` : "";
  if (drawn) {
    art = {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${drawn.w}" height="${drawn.h}" viewBox="0 0 ${drawn.w} ${drawn.h}" preserveAspectRatio="${drawn.mode === "tile" ? "none" : "xMidYMid slice"}">${drawn.body}${veil}</svg>`,
      width: drawn.w,
      height: drawn.h,
      mode: drawn.mode,
    };
  } else {
    const geo = GEO.find(([gen]) => id.startsWith(`${gen}-`));
    const tint = TINTS.find(([t]) => id === `${geo?.[0]}-${t}`);
    if (geo && tint) {
      const raw = GeoPattern.generate(`jollof-${geo[0]}`, { generator: geo[0], color: tint[2] }).toString();
      const m = raw.match(/width="([\d.]+)" height="([\d.]+)"/);
      const w = Number(m?.[1] ?? 100);
      const h = Number(m?.[2] ?? 100);
      art = { svg: raw.replace(/<\/svg>$/, `${veil}</svg>`).replace("<svg ", `<svg viewBox="0 0 ${w} ${h}" `), width: w, height: h, mode: "tile" };
    }
  }
  if (art) cache.set(key, art);
  return art;
}

export { isLibraryBackground, libraryId } from "./background-ref";
