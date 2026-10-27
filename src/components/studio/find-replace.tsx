"use client";

import { useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Match {
  from: number;
  to: number;
}

function findMatches(editor: Editor, query: string, matchCase: boolean): Match[] {
  if (!query) return [];
  const out: Match[] = [];
  const q = matchCase ? query : query.toLowerCase();
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const text = matchCase ? node.text : node.text.toLowerCase();
    let i = text.indexOf(q);
    while (i !== -1) {
      out.push({ from: pos + i, to: pos + i + q.length });
      i = text.indexOf(q, i + q.length);
    }
  });
  return out;
}

export function FindReplace({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [replace, setReplace] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [index, setIndex] = useState(0);
  const [version, setVersion] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const matches = useMemo(() => findMatches(editor, query, matchCase), [editor, query, matchCase, version]);

  function go(i: number) {
    if (!matches.length) return;
    const n = ((i % matches.length) + matches.length) % matches.length;
    setIndex(n);
    editor.chain().focus().setTextSelection(matches[n]).scrollIntoView().run();
  }

  function replaceOne() {
    const m = matches[index];
    if (!m) return;
    editor.chain().focus().insertContentAt(m, replace).run();
    setVersion((v) => v + 1);
  }

  function replaceAll() {
    if (!matches.length) return;
    const tr = editor.state.tr;
    for (const m of [...matches].reverse()) {
      if (replace) tr.insertText(replace, m.from, m.to);
      else tr.delete(m.from, m.to);
    }
    editor.view.dispatch(tr);
    setVersion((v) => v + 1);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border bg-paper px-3 py-2 text-sm">
      <Input
        aria-label="Find"
        placeholder="Find"
        value={query}
        autoFocus
        onChange={(e) => {
          setQuery(e.target.value);
          setIndex(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") go(index + (e.shiftKey ? -1 : 1));
          if (e.key === "Escape") onClose();
        }}
        className="h-8 w-44"
      />
      <span className="tabular w-16 text-soft">{query ? `${matches.length ? index + 1 : 0} of ${matches.length}` : ""}</span>
      <Button size="icon-sm" variant="ghost" aria-label="Previous match" onClick={() => go(index - 1)}>
        <ChevronUp />
      </Button>
      <Button size="icon-sm" variant="ghost" aria-label="Next match" onClick={() => go(index + 1)}>
        <ChevronDown />
      </Button>
      <Input aria-label="Replace with" placeholder="Replace with" value={replace} onChange={(e) => setReplace(e.target.value)} className="h-8 w-44" />
      <Button size="sm" variant="outline" onClick={replaceOne} disabled={!matches.length}>
        Replace
      </Button>
      <Button size="sm" variant="outline" onClick={replaceAll} disabled={!matches.length}>
        Replace all
      </Button>
      <label className="flex items-center gap-1.5 text-soft">
        <input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} /> Match case
      </label>
      <Button size="icon-sm" variant="ghost" aria-label="Close find" className="ml-auto" onClick={onClose}>
        <X />
      </Button>
    </div>
  );
}
