/**
 * Plain-text helpers for the RTF, plain text and public-domain imports. No DOM here, so they run
 * in tests as well as the browser.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Drop Project Gutenberg's licence header and footer, keeping only the book between the markers. */
export function stripGutenberg(text: string): string {
  const start = text.match(/\*{3}\s*START OF (THE|THIS) PROJECT GUTENBERG E(BOOK|TEXT)[^*]*\*{3}/i);
  const end = text.match(/\*{3}\s*END OF (THE|THIS) PROJECT GUTENBERG E(BOOK|TEXT)[^*]*\*{3}/i);
  if (!start || start.index === undefined) return text;
  const from = start.index + start[0].length;
  const to = end?.index !== undefined && end.index > from ? end.index : text.length;
  return text.slice(from, to);
}

/** A line that opens a chapter in an old book: "CHAPTER I.", "Chapter 12: The Road", "PART TWO", "PROLOGUE". */
const CHAPTER_LINE = /^\s*((chapter|part|book|letter)\s+([0-9]+|[ivxlc]+|[a-z-]+)\b.*|(prologue|epilogue|preface|introduction|afterword)\.?)\s*$/i;

/**
 * Plain text as Markdown. Text that already uses # headings is left alone; otherwise chapter lines
 * become headings and paragraphs are rejoined from hard-wrapped lines.
 */
export function plainTextToMarkdown(raw: string): string {
  const text = stripGutenberg(raw.replace(/\r\n?/g, "\n"));
  if (/^#{1,3}\s+\S/m.test(text)) return text;
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return blocks
    .map((b) => {
      const lines = b.split("\n").map((l) => l.trim());
      if (CHAPTER_LINE.test(lines[0])) {
        // "CHAPTER I." followed by its title on the next line reads as one heading
        const title = lines.slice(1).join(" ").trim();
        return `# ${lines[0].replace(/\.$/, "")}${title ? `: ${title}` : ""}`;
      }
      return lines.join(" ").replace(/\s+/g, " ");
    })
    .join("\n\n");
}

/**
 * The text of an RTF file as simple HTML: paragraphs, bold and italic, and headings for
 * Heading styles or chapter lines. Pictures, tables and fields are skipped.
 */
export function rtfToHtml(rtf: string): string {
  const paras: { html: string; heading: number }[] = [];
  let cur = "";
  let heading = 0;
  // one entry per open group: skip this group, bold, italic
  const stack: { skip: boolean; b: boolean; i: boolean }[] = [{ skip: false, b: false, i: false }];
  let open = { b: false, i: false };
  let uc = 1; // characters to skip after a \u escape
  let skipChars = 0;
  const top = () => stack[stack.length - 1];

  const syncTags = () => {
    const want = top();
    if (open.i && !want.i) cur += "</em>";
    if (open.b && !want.b) cur += "</strong>";
    if (!open.b && want.b) cur += "<strong>";
    if (!open.i && want.i) cur += "<em>";
    open = { b: want.b, i: want.i };
  };
  const emit = (s: string) => {
    if (top().skip) return;
    if (skipChars > 0) {
      skipChars--;
      return;
    }
    syncTags();
    cur += esc(s);
  };
  const endPara = () => {
    if (open.i) cur += "</em>";
    if (open.b) cur += "</strong>";
    open = { b: false, i: false };
    const plain = cur.replace(/<[^>]+>/g, "").trim();
    if (plain) paras.push({ html: cur.trim(), heading: heading || (CHAPTER_LINE.test(plain) && plain.length < 80 ? 1 : 0) });
    cur = "";
    heading = 0;
  };

  const SKIP_DESTS = /^(fonttbl|colortbl|stylesheet|info|pict|object|header|footer|headerl|headerr|footerl|footerr|footnote|field|fldinst|listtable|listoverridetable|rsidtbl|themedata|colorschememapping|latentstyles|datastore|xmlnstbl|generator|filetbl|revtbl|bkmkstart|bkmkend)$/;
  let i = 0;
  while (i < rtf.length) {
    const ch = rtf[i];
    if (ch === "{") {
      stack.push({ ...top() });
      i++;
    } else if (ch === "}") {
      if (stack.length > 1) stack.pop();
      i++;
    } else if (ch === "\\") {
      const next = rtf[i + 1];
      if (next === "'") {
        emit(String.fromCharCode(parseInt(rtf.slice(i + 2, i + 4), 16)));
        i += 4;
      } else if (next === "*") {
        top().skip = true;
        i += 2;
      } else if (next === "\\" || next === "{" || next === "}") {
        emit(next);
        i += 2;
      } else if (next === "~") {
        emit(" ");
        i += 2;
      } else if (next === "\n" || next === "\r") {
        endPara();
        i += 2;
      } else {
        const m = rtf.slice(i + 1).match(/^([a-z]+)(-?\d+)? ?/i);
        if (!m) {
          i += 2;
          continue;
        }
        const [all, word, num] = m;
        i += 1 + all.length;
        const n = num === undefined ? undefined : Number(num);
        if (SKIP_DESTS.test(word)) top().skip = true;
        else if (word === "par" || word === "line" || word === "sect" || word === "page") {
          if (!top().skip) endPara();
        } else if (word === "b") top().b = n !== 0;
        else if (word === "i") top().i = n !== 0;
        else if (word === "plain") {
          top().b = false;
          top().i = false;
        } else if (word === "s" && n !== undefined && !top().skip) heading = n >= 1 && n <= 3 ? n : 0;
        else if (word === "outlinelevel" && n !== undefined && !top().skip) heading = Math.min(n + 1, 3);
        else if (word === "tab") emit(" ");
        else if (word === "emdash") emit("—");
        else if (word === "endash") emit("–");
        else if (word === "lquote") emit("‘");
        else if (word === "rquote") emit("’");
        else if (word === "ldblquote") emit("“");
        else if (word === "rdblquote") emit("”");
        else if (word === "bullet") emit("•");
        else if (word === "uc" && n !== undefined) uc = n;
        else if (word === "u" && n !== undefined) {
          emit(String.fromCharCode(n < 0 ? n + 65536 : n));
          skipChars = uc;
        }
      }
    } else if (ch === "\n" || ch === "\r") {
      i++;
    } else {
      emit(ch);
      i++;
    }
  }
  endPara();
  return paras.map((p) => (p.heading ? `<h${p.heading}>${p.html}</h${p.heading}>` : `<p>${p.html}</p>`)).join("\n");
}
