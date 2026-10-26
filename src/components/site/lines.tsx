/** Splits a headline into lines that rise out of a mask one after another. */
export function splitLines(text: string): string[] {
  const t = text.trim();
  const m = t.match(/^(.+?[,;:.])\s+(.+)$/);
  if (m) return [m[1], m[2]];
  const words = t.split(/\s+/);
  if (words.length < 3) return [t];
  const half = Math.ceil(words.length / 2);
  return [words.slice(0, half).join(" "), words.slice(half).join(" ")];
}

export function Lines({ lines, start = 0 }: { lines: string[]; start?: number }) {
  return (
    <>
      {lines.map((l, i) => (
        <span key={i} className="line">
          <span style={{ ["--i" as string]: i + start }}>{l}</span>
        </span>
      ))}
    </>
  );
}
