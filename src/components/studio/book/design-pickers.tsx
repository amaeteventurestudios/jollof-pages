"use client";

import { useMemo, useState } from "react";
import { Check, Search, Upload } from "lucide-react";
import { BACKGROUND_GROUPS, BACKGROUNDS, type BackgroundGroup } from "@/lib/backgrounds";
import { ORNAMENTS, ornamentSvg, svgDataUri } from "@/lib/ornaments";
import { backgroundStyle } from "@/lib/render-element";
import { THEME_CATEGORIES, THEMES, type DropCapStyle, type InteriorTheme, type ThemeCategory } from "@/lib/themes";
import { cn } from "@/lib/utils";

function Chips<T extends string>({ items, value, onChange, label }: { items: readonly T[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label={label}>
      {items.map((g) => (
        <button
          key={g}
          type="button"
          role="tab"
          aria-selected={value === g}
          onClick={() => onChange(g)}
          className={cn("shrink-0 rounded-full border px-3 py-1 text-[13px] transition-colors", value === g ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary")}
        >
          {g}
        </button>
      ))}
    </div>
  );
}

function Picked() {
  return (
    <span className="absolute top-2 right-2 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground shadow">
      <Check className="size-3" />
    </span>
  );
}

/** A small page that shows a theme's chapter opening: label, title, ornament and drop cap. */
export function ThemeSwatch({ t, sample = "Know your reader" }: { t: InteriorTheme; sample?: string }) {
  const orn = ornamentSvg(t.ornament, t.accent);
  const glyph = ORNAMENTS.find((o) => o.id === t.ornament)?.glyph;
  const bg = t.openerBackground ? backgroundStyle({ src: `bg:${t.openerBackground}`, strength: 0.7, openerOnly: true }) : "";
  const label = t.chapterLabel === "word" ? "Chapter One" : t.chapterLabel === "number" ? (t.labelStyle === "large" ? "1" : "Chapter 1") : "";
  return (
    <span className="relative block aspect-[3/4] overflow-hidden rounded-md bg-[#fffdf9] px-4 pt-5 text-[#1c1a17] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" style={bg ? cssText(bg) : undefined}>
      <span className="block" style={{ textAlign: t.headingAlign, fontFamily: t.headingCss }}>
        {label && (
          <span
            className="block leading-none"
            style={
              t.labelFont
                ? { fontFamily: `'${t.labelFont}', cursive`, fontSize: 22, color: t.accent }
                : t.labelStyle === "large"
                  ? { fontSize: 28, fontWeight: t.headingWeight, color: t.accent }
                  : { fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: t.accent }
            }
          >
            {label}
          </span>
        )}
        <span
          className="mt-1.5 block leading-tight"
          style={{
            fontSize: 15,
            fontWeight: t.headingWeight,
            fontStyle: t.headingItalic ? "italic" : "normal",
            textTransform: t.headingCase === "upper" ? "uppercase" : "none",
            letterSpacing: t.headingCase === "upper" ? "0.05em" : undefined,
            borderTop: t.headingRule === "above" || t.headingRule === "both" ? `1px solid ${t.accent}` : undefined,
            borderBottom: t.headingRule === "below" || t.headingRule === "both" ? `1px solid ${t.accent}` : undefined,
            paddingTop: t.headingRule === "above" || t.headingRule === "both" ? 4 : undefined,
            paddingBottom: t.headingRule === "below" || t.headingRule === "both" ? 4 : undefined,
          }}
        >
          {sample}
        </span>
        {t.headingRule === "short" && <span className="mt-1.5 block h-px w-8" style={{ background: t.accent, marginInline: t.headingAlign === "center" ? "auto" : 0 }} />}
      </span>
      <span className="mt-2.5 block text-[8.5px] leading-[1.45] text-[#3b3833]" style={{ fontFamily: t.bodyCss, textAlign: "justify" }}>
        <DropCap t={t} />
        very book begins as a promise to a particular reader. Before you outline a single chapter, write down who that reader is.
      </span>
      <span className="mt-2 block text-center text-[9px]" style={{ color: t.accent }}>
        {orn ? <img src={svgDataUri(orn.svg)} alt="" className="mx-auto h-2.5" /> : glyph || " "}
      </span>
    </span>
  );
}

function DropCap({ t, size = 22 }: { t: Pick<InteriorTheme, "dropCap" | "accent" | "headingCss" | "labelFont">; size?: number }) {
  const s = dropCapStyle(t, size);
  if (!s) return <span>E</span>;
  return (
    <span className="float-left mr-0.5" style={s}>
      E
    </span>
  );
}

function dropCapStyle(t: Pick<InteriorTheme, "dropCap" | "accent" | "headingCss" | "labelFont">, size: number): React.CSSProperties | null {
  const base: React.CSSProperties = { fontFamily: t.headingCss, fontSize: size, lineHeight: 0.9 };
  switch (t.dropCap) {
    case "none":
      return null;
    case "classic":
      return base;
    case "tall":
      return { ...base, fontSize: size * 1.35, color: t.accent };
    case "boxed":
      return { ...base, fontSize: size * 0.8, lineHeight: 1, background: t.accent, color: "#fff", padding: "1px 4px", marginTop: 2 };
    case "outline":
      return { ...base, fontSize: size * 0.8, lineHeight: 1, color: t.accent, border: `1.5px solid ${t.accent}`, padding: "0 3px", marginTop: 2 };
    case "circle":
      return { ...base, fontSize: size * 0.7, lineHeight: `${size * 0.95}px`, width: size * 0.95, textAlign: "center", borderRadius: "50%", background: t.accent, color: "#fff", marginTop: 2 };
    case "script":
      return { ...base, fontFamily: t.labelFont ? `'${t.labelFont}', cursive` : t.headingCss, fontSize: size * 1.3, color: t.accent };
    default:
      return { ...base, color: t.accent };
  }
}

function cssText(style: string): React.CSSProperties {
  const out: Record<string, string> = {};
  for (const part of style.split(/;(?![^(]*\))/)) {
    const i = part.indexOf(":");
    if (i < 0) continue;
    const k = part.slice(0, i).trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (k) out[k] = part.slice(i + 1).trim();
  }
  return out as React.CSSProperties;
}

/** All 93 themes, filterable by genre and searchable. */
export function ThemeGallery({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [cat, setCat] = useState<ThemeCategory | "All">("All");
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return THEMES.filter((t) => (cat === "All" || t.category === cat) && (!s || `${t.name} ${t.description} ${t.category}`.toLowerCase().includes(s)));
  }, [cat, q]);
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex h-9 w-full max-w-xs items-center gap-2 rounded-full border border-input bg-card px-3">
          <Search className="size-4 text-soft" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search 93 themes" className="min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label="Search themes" />
        </label>
        <span className="text-[13px] text-soft">{shown.length} shown</span>
      </div>
      <Chips items={["All", ...THEME_CATEGORIES] as const} value={cat} onChange={setCat} label="Theme genres" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" role="radiogroup" aria-label="Interior theme">
        {shown.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={t.id === value}
            onClick={() => onChange(t.id)}
            className={cn("group relative rounded-xl bg-card p-2 text-left ring-2 ring-transparent transition hover:-translate-y-0.5 hover:shadow-lg", t.id === value && "ring-primary")}
          >
            <ThemeSwatch t={t} />
            <span className="mt-2 flex items-baseline justify-between gap-2 px-1">
              <span className="truncate text-sm font-medium">{t.name}</span>
              <span className="shrink-0 text-[11.5px] text-soft">{t.category}</span>
            </span>
            {t.id === value && <Picked />}
          </button>
        ))}
      </div>
    </div>
  );
}

export const DROP_CAPS: { id: DropCapStyle; label: string }[] = [
  { id: "classic", label: "Classic" },
  { id: "accent", label: "Coloured" },
  { id: "tall", label: "Tall" },
  { id: "boxed", label: "Boxed" },
  { id: "outline", label: "Framed" },
  { id: "circle", label: "Circle" },
  { id: "script", label: "Script" },
  { id: "none", label: "None" },
];

export function DropCapPicker({ theme, value, onChange }: { theme: InteriorTheme; value: DropCapStyle; onChange: (v: DropCapStyle) => void }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(4.75rem,1fr))] gap-2" role="radiogroup" aria-label="Drop cap">
      {DROP_CAPS.map((d) => (
        <button
          key={d.id}
          type="button"
          role="radio"
          aria-checked={value === d.id}
          onClick={() => onChange(d.id)}
          className={cn("relative grid place-items-center gap-1 rounded-lg bg-card p-2 ring-2 ring-transparent hover:ring-paper-3", value === d.id && "ring-primary hover:ring-primary")}
        >
          <span className="grid h-10 place-items-center text-[#1c1a17]">{d.id === "none" ? <span className="text-sm text-soft">Aa</span> : <DropCap t={{ ...theme, dropCap: d.id }} size={26} />}</span>
          <span className="text-[12px]">{d.label}</span>
        </button>
      ))}
    </div>
  );
}

/** All 60 ornaments. `allowTheme` adds a "theme's ornament" choice (for one scene break). */
export function OrnamentPicker({ value, accent, onChange }: { value: string; accent: string; onChange: (id: string) => void }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2" role="radiogroup" aria-label="Scene-break ornament">
      {ORNAMENTS.map((o) => {
        const art = ornamentSvg(o.id, accent);
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            title={o.name}
            onClick={() => onChange(o.id)}
            className={cn("relative grid h-14 place-items-center rounded-lg bg-[#fffdf9] ring-2 ring-transparent hover:ring-paper-3", value === o.id && "ring-primary hover:ring-primary")}
          >
            {art ? (
              <img src={svgDataUri(art.svg)} alt={o.name} className="h-5 max-w-[88%]" />
            ) : o.kind === "rule" ? (
              <span className="block h-px w-8" style={{ background: accent }} />
            ) : o.kind === "double" ? (
              <span className="block h-1 w-8 border-y" style={{ borderColor: accent }} />
            ) : o.kind === "space" ? (
              <span className="text-[11px] text-[#8a847a]">blank</span>
            ) : (
              <span className="text-sm tracking-[0.2em]" style={{ color: accent }}>
                {o.glyph}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The background library, by group, plus "none" and an upload button. `value` is "bg:<id>", an
 * image URL, "" (none) or "none".
 */
export function BackgroundPicker({ value, onChange, onUpload, noneLabel = "No background" }: { value: string; onChange: (v: string) => void; onUpload?: () => void; noneLabel?: string }) {
  const [group, setGroup] = useState<BackgroundGroup>(() => BACKGROUNDS.find((b) => `bg:${b.id}` === value)?.group ?? "Painted");
  const list = BACKGROUNDS.filter((b) => b.group === group);
  const uploaded = !!value && value !== "none" && !value.startsWith("bg:");
  return (
    <div className="grid gap-3">
      <Chips items={BACKGROUND_GROUPS} value={group} onChange={setGroup} label="Background groups" />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8" role="radiogroup" aria-label="Background">
        <button
          type="button"
          role="radio"
          aria-checked={!value || value === "none"}
          onClick={() => onChange("")}
          className={cn("relative grid aspect-[3/4] place-items-center rounded-lg border border-dashed border-paper-3 bg-card p-2 text-center text-[12px] text-soft", (!value || value === "none") && "ring-2 ring-primary")}
        >
          {noneLabel}
        </button>
        {onUpload && (
          <button
            type="button"
            onClick={onUpload}
            className={cn("relative grid aspect-[3/4] place-items-center gap-1 rounded-lg border border-dashed border-paper-3 bg-card p-2 text-center text-[12px]", uploaded && "ring-2 ring-primary")}
            style={uploaded ? { backgroundImage: `url("${value}")`, backgroundSize: "cover" } : undefined}
          >
            {!uploaded && <Upload className="size-4 text-soft" />}
            <span className={cn(uploaded && "rounded bg-card/90 px-1.5")}>{uploaded ? "Your picture" : "Upload your own"}</span>
            {uploaded && <Picked />}
          </button>
        )}
        {list.map((b) => {
          const v = `bg:${b.id}`;
          return (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={value === v}
              title={b.name}
              onClick={() => onChange(v)}
              className={cn("group relative aspect-[3/4] overflow-hidden rounded-lg shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] ring-2 ring-transparent transition hover:-translate-y-0.5 hover:shadow-md", value === v && "ring-primary")}
              style={cssText(backgroundStyle({ src: v, strength: 1, openerOnly: false }))}
            >
              <span className="absolute inset-x-1 bottom-1 truncate rounded bg-white/85 px-1.5 py-0.5 text-[11px] text-[#1c1a17] opacity-0 transition group-hover:opacity-100">{b.name}</span>
              {value === v && <Picked />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
