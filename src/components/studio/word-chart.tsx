"use client";

import { fmt, lastDays } from "@/lib/progress";

/** Daily words as bars, with the habit goal drawn as a line. */
export function WordChart({ byDay, days, goal }: { byDay: Map<string, number>; days: number; goal?: number }) {
  const dates = lastDays(days);
  const values = dates.map((d) => Math.max(byDay.get(d) ?? 0, 0));
  const max = Math.max(goal ?? 0, ...values, 100);
  const W = 720;
  const H = 180;
  const bw = W / days;
  const y = (v: number) => H - (v / max) * (H - 8);
  return (
    <figure className="mt-4 rounded-md bg-card p-4">
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full" role="img" aria-label={`Words written per day over the last ${days} days`}>
        {values.map((v, i) => (
          <g key={dates[i]}>
            <rect x={i * bw + 2} y={y(v)} width={bw - 4} height={H - y(v)} rx={2} fill={goal && v >= goal ? "var(--primary)" : "var(--paper-3)"}>
              <title>{`${dates[i]}: ${fmt(v)} words`}</title>
            </rect>
            {(i === 0 || i === days - 1 || i % 7 === 0) && (
              <text x={i * bw + bw / 2} y={H + 16} textAnchor="middle" fontSize="11" fill="var(--soft)">
                {dates[i].slice(5).replace("-", "/")}
              </text>
            )}
          </g>
        ))}
        {goal ? <line x1={0} x2={W} y1={y(goal)} y2={y(goal)} stroke="var(--ink)" strokeDasharray="4 4" strokeWidth={1} /> : null}
      </svg>
      <figcaption className="mt-2 text-[13px] text-soft">Jollof-red bars met the daily habit{goal ? ` of ${fmt(goal)} words` : ""}. Net words: deleting text counts against the day.</figcaption>
    </figure>
  );
}
