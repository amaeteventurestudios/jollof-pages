import type { PageChrome } from "@/lib/running-heads";
import { cn } from "@/lib/utils";

/** The running head of a preview page, with the page number beside it when numbers sit at the top. */
export function PageHead({ chrome, head, style }: { chrome?: PageChrome; head: string; style: React.CSSProperties }) {
  const c = chrome;
  const folio = c?.folioTop ? c.folio : "";
  const recto = c?.folioAlign === "right";
  return (
    <div className={cn("absolute flex items-baseline gap-3 text-[0.72em] opacity-75", c?.rule && (head || folio) && "border-b border-current pb-[0.2em]")} style={style}>
      {folio && !recto && <span>{folio}</span>}
      <span
        className={cn("min-w-0 flex-1 truncate", (!c || c.style === "smallcaps") && "tracking-[0.08em] uppercase", c?.style === "italic" && "italic")}
        style={{ textAlign: c?.headAlign ?? "center" }}
      >
        {head}
      </span>
      {folio && recto && <span>{folio}</span>}
    </div>
  );
}
