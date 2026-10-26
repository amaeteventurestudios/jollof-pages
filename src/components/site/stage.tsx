"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { BookObject } from "./book-object";
import { spineOf, type StageBook } from "@/lib/site-data";

interface StageState {
  active: string | null;
  pages: number | null;
  setPages: (n: number | null) => void;
}
const StageContext = createContext<StageState>({ active: null, pages: null, setPages: () => undefined });
export const useStage = () => useContext(StageContext);

/**
 * The fixed half of the page. Sections mark themselves with data-stage="<book id>"; whichever is
 * in the middle of the viewport puts its book on the stage.
 */
export function StageProvider({ books, children }: { books: StageBook[]; children: React.ReactNode }) {
  const [active, setActive] = useState<string | null>(books[0]?.id ?? null);
  const [pages, setPages] = useState<number | null>(null);
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-stage]"));
    if (!els.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting && e.target instanceof HTMLElement && e.target.dataset.stage) setActive(e.target.dataset.stage);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return <StageContext.Provider value={{ active, pages, setPages }}>{children}</StageContext.Provider>;
}

export function Stage({ books, className }: { books: StageBook[]; className?: string }) {
  const { active, pages } = useStage();
  const [scale, setScale] = useState(48);
  useEffect(() => {
    const fit = () => setScale(Math.max(26, Math.min(64, (window.innerHeight * (window.innerWidth < 1024 ? 0.34 : 0.58)) / 9)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const current = books.find((b) => b.id === active) ?? books[0];
  if (!current) return null;
  const p = pages ?? current.pages;
  return (
    <div className={className}>
      <div className="relative h-full overflow-hidden bg-ink">
        {books.map((b) => (
          <div
            key={b.id}
            aria-hidden={b.id !== current.id}
            className="absolute inset-0 flex items-center justify-center pb-14 transition-opacity duration-[1600ms]"
            style={{ opacity: b.id === current.id ? 1 : 0 }}
          >
            <div className="stage-drift">
              <BookObject book={b} scale={scale} pages={b.id === current.id ? p : b.pages} className={b.id === current.id ? "book3d-enter" : ""} />
            </div>
          </div>
        ))}
        <div className="t-small absolute inset-x-0 bottom-0 flex h-14 items-center justify-between gap-4 bg-paper px-5 text-ink">
          <span className="truncate">
            {current.title}
            {current.author ? `, ${current.author}` : ""}
          </span>
          <span className="tabular shrink-0 text-soft">
            {current.trimLabel} · {p} pages · spine {spineOf({ pages: p, paper: current.paper }).toFixed(3)} in
          </span>
        </div>
      </div>
    </div>
  );
}
