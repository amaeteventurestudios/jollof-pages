/** Finds passages elsewhere in a book that say much the same as the selected words. */

const STOP = new Set(
  "a an and are as at be but by for from has have he her his i in is it its me my not of on or our she so that the their them they this to was we were what when which who will with you your".split(" "),
);

function words(s: string): Set<string> {
  return new Set((s.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? []).filter((w) => w.length > 2 && !STOP.has(w)));
}

export interface Passage {
  chapterId: string;
  chapterTitle: string;
  text: string;
  /** 0 to 1: the share of meaningful words the two have in common */
  score: number;
}

/** Sentences (or pairs of sentences) scoring at least `min`, best first, leaving out the selection itself. */
export function similarPassages(selection: string, chapters: { id: string; title: string; text: string }[], min = 0.3, limit = 8): Passage[] {
  const target = words(selection);
  if (target.size < 3) return [];
  const self = selection.replace(/\s+/g, " ").trim();
  const out: Passage[] = [];
  for (const c of chapters) {
    const sentences = c.text.replace(/\s+/g, " ").match(/[^.!?…]+[.!?…]*/g) ?? [];
    // a two-sentence window catches ideas that run over a full stop
    for (let i = 0; i < sentences.length; i++) {
      const text = (sentences[i] + (target.size > 12 && sentences[i + 1] ? sentences[i + 1] : "")).trim();
      if (!text || self.includes(text) || text.includes(self)) continue;
      const w = words(text);
      if (w.size < 3) continue;
      let common = 0;
      for (const x of w) if (target.has(x)) common++;
      const score = common / Math.min(target.size, w.size) * (common / Math.max(target.size, w.size)) ** 0.25;
      if (score >= min) out.push({ chapterId: c.id, chapterTitle: c.title, text, score: Math.round(score * 100) / 100 });
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
