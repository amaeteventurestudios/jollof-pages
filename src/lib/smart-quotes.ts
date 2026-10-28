import type { Node as PMNode, Schema } from "@tiptap/pm/model";
import { Transform } from "@tiptap/pm/transform";

/**
 * Straight quotes to typographer's quotes. Every change swaps one character for one character, so
 * positions in the text never move.
 */

const OPENS_AFTER = /[\s([{—–\-/“‘￼]/;

export function curlQuotes(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const prev = i === 0 ? "" : text[i - 1];
    const next = text[i + 1] ?? "";
    const opening = prev === "" || OPENS_AFTER.test(prev);
    if (c === '"') out += opening ? "“" : "”";
    else if (c === "'") {
      // ’90s and 'tis read as apostrophes; a quote after a space opens; anything after a letter closes
      if (opening && /\d/.test(next)) out += "’";
      else if (opening) out += "‘";
      else out += "’";
    } else out += c;
  }
  return out;
}

export function countStraightQuotes(text: string): number {
  let n = 0;
  for (const c of text) if (c === '"' || c === "'") n++;
  return n;
}

/** Text of each paragraph or heading, with its document position. Inline images and notes count as one character. */
function textblocks(doc: PMNode): { pos: number; text: string }[] {
  const out: { pos: number; text: string }[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    out.push({ pos: pos + 1, text: node.textBetween(0, node.content.size, undefined, "￼") });
    return false;
  });
  return out;
}

/** A transform that curls every straight quote in a document, keeping bold, italic and links. */
export function curlQuotesTransform<T extends Transform = Transform>(doc: PMNode, schema: Schema, tr: T = new Transform(doc) as T): { tr: T; changed: number } {
  let changed = 0;
  for (const block of textblocks(doc)) {
    const curled = curlQuotes(block.text);
    for (let i = 0; i < curled.length; i++) {
      if (curled[i] === block.text[i]) continue;
      const pos = block.pos + i;
      const marks = doc.nodeAt(pos)?.marks ?? [];
      tr.replaceWith(pos, pos + 1, schema.text(curled[i], marks));
      changed++;
    }
  }
  return { tr, changed };
}

/** Straight quotes left in a document, for the inconsistencies list. */
export function straightQuotesIn(doc: PMNode): number {
  return textblocks(doc).reduce((n, b) => n + countStraightQuotes(b.text), 0);
}

