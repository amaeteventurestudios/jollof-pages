"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listChanges, trackChangesOn, type Change } from "@/components/studio/track-changes";
import type { CollabRole } from "@/lib/collab";
import { cn } from "@/lib/utils";

function focus(editor: Editor, c: Change) {
  editor.chain().setTextSelection({ from: c.from, to: c.to }).scrollIntoView().run();
  editor.view.focus();
}

/** Track changes: turn recording on or off, and accept or reject what others suggested. */
export function ChangesPanel({ editor, role }: { editor: Editor | null; role: CollabRole }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? { on: trackChangesOn(e.state), changes: listChanges(e.state.doc) } : null),
    equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  });
  if (!editor || !state) return <p className="text-sm text-soft">Open a chapter to see its tracked changes.</p>;
  const decide = role === "owner" || role === "cowriter";
  const { on, changes } = state;

  return (
    <div className="grid gap-4">
      {role === "editor" ? (
        <p className="border-l-4 border-primary bg-primary-soft p-3 text-sm text-ink-2">Everything you type or delete is kept as a suggestion. The author accepts or rejects each one.</p>
      ) : role === "commenter" ? (
        <p className="text-sm text-soft">You can see suggested changes here. Only the author and co-writers can accept them.</p>
      ) : (
        <label className="flex cursor-pointer items-start gap-3 border border-border p-3">
          <input type="checkbox" className="mt-1 size-4 accent-[var(--primary)]" checked={on} onChange={(e) => editor.chain().focus().setTrackChanges(e.target.checked).run()} />
          <span>
            <span className="block text-sm font-medium">Track my changes</span>
            <span className="block text-[13px] text-soft">Keep your own edits as suggestions too, to review them later.</span>
          </span>
        </label>
      )}

      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium">
          {changes.length} {changes.length === 1 ? "change" : "changes"} in this chapter
        </h3>
      </div>
      {decide && changes.length > 1 && (
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" onClick={() => editor.chain().focus().resolveAllChanges(true).run()}>
            <Check /> Accept all
          </Button>
          <Button size="sm" variant="outline" onClick={() => editor.chain().focus().resolveAllChanges(false).run()}>
            <X /> Reject all
          </Button>
        </div>
      )}
      {!changes.length ? (
        <p className="text-sm text-soft">Nothing waiting. Suggested insertions show underlined in green and deletions struck through in red.</p>
      ) : (
        <ol className="grid gap-2">
          {changes.map((c) => (
            <li key={`${c.type}-${c.from}`} className="border border-border bg-card">
              <button type="button" onClick={() => focus(editor, c)} className="block w-full px-3 pt-2.5 pb-2 text-left hover:bg-paper">
                <span className="flex items-center gap-2 text-xs">
                  <span className={cn("px-1.5 py-0.5 font-medium", c.type === "insert" ? "bg-[#dcf2e3] text-[#14532d]" : "bg-[#fbe0dc] text-[#8a1c0e]")}>
                    {c.type === "insert" ? "Added" : "Deleted"}
                  </span>
                  <span className="truncate text-soft">by {c.username}</span>
                </span>
                <span className={cn("mt-1.5 line-clamp-3 block text-sm", c.type === "delete" ? "text-ink-2 line-through" : "text-ink")}>{c.text.replace(/¶/g, " ") || "(a paragraph break)"}</span>
              </button>
              {decide && (
                <div className="flex gap-1 border-t border-border px-2 py-1.5">
                  <Button size="sm" variant="ghost" onClick={() => editor.chain().focus().resolveChanges([c], true).run()}>
                    <Check /> Accept
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => editor.chain().focus().resolveChanges([c], false).run()}>
                    <X /> Reject
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
