"use client";

import Link from "next/link";
import { useRef, useState } from "react";

export interface BookRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  meta: string;
  cover: string;
  accent: string;
}

/** The list as big rows. Each fills with red on hover and its cover follows the pointer. */
export function BookRows({ rows, start = 1 }: { rows: BookRow[]; start?: number }) {
  const follow = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<BookRow | null>(null);

  function move(e: React.PointerEvent) {
    if (e.pointerType !== "mouse" || !follow.current) return;
    follow.current.style.left = `${e.clientX}px`;
    follow.current.style.top = `${e.clientY}px`;
  }

  return (
    <>
      <ul className="border-t-2 border-on-ground" onPointerMove={move} onPointerLeave={() => setActive(null)}>
        {rows.map((b, i) => (
          <li key={b.id} className="border-b-2 border-on-ground" data-reveal style={{ ["--i" as string]: i }}>
            <Link
              href={`/books/${b.slug}`}
              className="row group grid grid-cols-[2.5rem_1fr_auto] items-center gap-x-4 px-2 py-6 sm:grid-cols-[4rem_1fr_auto_auto] sm:gap-x-8 sm:px-4 sm:py-8"
              onPointerEnter={(e) => e.pointerType === "mouse" && setActive(b)}
            >
              <span className="tabular text-[0.95rem] font-semibold">{String(i + start).padStart(2, "0")}</span>
              <span>
                <span className="wide block text-[clamp(1.5rem,1rem+2.4vw,3.25rem)] leading-[0.98] font-bold tracking-[-0.04em]">{b.title}</span>
                {b.subtitle && <span className="row-soft mt-2 block text-[1rem] text-on-ground/70 transition-colors">{b.subtitle}</span>}
              </span>
              <span className="tabular hidden text-right sm:block">{b.meta}</span>
              <svg viewBox="0 0 24 24" className="row-arrow size-7 sm:size-9" aria-hidden>
                <path d="M4 12h15M13 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.2" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
      <div ref={follow} className="cover-follow w-[180px]" data-on={!!active} aria-hidden>
        {active &&
          (active.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={active.cover} alt="" className="aspect-[2/3] w-full object-cover shadow-[0_30px_60px_-20px_rgba(58,20,10,0.6)]" />
          ) : (
            <div className="flex aspect-[2/3] w-full items-end p-4 text-cream" style={{ background: active.accent }}>
              {active.title}
            </div>
          ))}
      </div>
    </>
  );
}
