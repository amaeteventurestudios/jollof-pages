"use client";

import { useState } from "react";
import { BubbleMenu } from "@tiptap/react/menus";
import { useEditorState, type Editor } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import { Bold, Ellipsis, Italic, Link2, MessageSquarePlus, Sparkles, Underline } from "lucide-react";
import { PromptDialog } from "./prompt-dialog";
import { cn } from "@/lib/utils";
import { openContextMenu, type EditorTool } from "./context-menu";

function Btn({ label, active, on, children }: { label: string; active?: boolean; on: (e: React.MouseEvent<HTMLButtonElement>) => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={on}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn("grid size-8 place-items-center rounded text-ink-2 hover:bg-muted hover:text-ink [&_svg]:size-4", active && "bg-primary-soft text-primary")}
    >
      {children}
    </button>
  );
}

/** Bold, italic, a heading, a link, a comment and AI right above the words you select. More opens the full menu. */
export function SelectionToolbar({ editor, onTool }: { editor: Editor; onTool?: (t: EditorTool) => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      link: e.isActive("link"),
      style: e.isActive("heading", { level: 2 }) ? "h2" : e.isActive("heading", { level: 3 }) ? "h3" : e.isActive("heading", { level: 4 }) ? "h4" : "p",
    }),
  });
  const [prompt, setPrompt] = useState<null | "link">(null);
  const c = () => editor.chain().focus();
  return (
    <>
      <BubbleMenu
        editor={editor}
        options={{ placement: "top", offset: 8 }}
        shouldShow={({ editor: e, state }) => {
          const { selection } = state;
          if (!e.isEditable || selection.empty || !(selection instanceof TextSelection)) return false;
          return state.doc.textBetween(selection.from, selection.to, " ").trim().length > 0;
        }}
        className="flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-lg"
      >
        <Btn label="Bold" active={s.bold} on={() => c().toggleBold().run()}>
          <Bold />
        </Btn>
        <Btn label="Italic" active={s.italic} on={() => c().toggleItalic().run()}>
          <Italic />
        </Btn>
        <Btn label="Underline" active={s.underline} on={() => c().toggleUnderline().run()}>
          <Underline />
        </Btn>
        <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />
        <select
          aria-label="Text style"
          value={s.style}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "p") c().setParagraph().run();
            else c().setHeading({ level: Number(v.slice(1)) as 2 | 3 | 4 }).run();
          }}
          className="h-8 rounded border-0 bg-transparent px-1 text-[13px] text-ink-2 hover:bg-muted"
        >
          <option value="p">Body text</option>
          <option value="h2">Heading</option>
          <option value="h3">Subheading</option>
          <option value="h4">Minor heading</option>
        </select>
        <Btn label={s.link ? "Remove link" : "Link"} active={s.link} on={() => (s.link ? c().unsetLink().run() : setPrompt("link"))}>
          <Link2 />
        </Btn>
        <Btn label="Comment" on={() => onTool?.("comments")}>
          <MessageSquarePlus />
        </Btn>
        <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onTool?.("assistant")}
          className="inline-flex h-8 items-center gap-1 rounded px-2 text-[13px] font-medium text-primary hover:bg-primary-soft [&_svg]:size-4"
        >
          <Sparkles aria-hidden /> AI Rewrite
        </button>
        <Btn
          label="More"
          on={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            openContextMenu(editor, r.left, r.bottom + 4);
          }}
        >
          <Ellipsis />
        </Btn>
      </BubbleMenu>
      <PromptDialog
        open={prompt === "link"}
        title="Add a link"
        label="Web address"
        placeholder="https://"
        onClose={() => setPrompt(null)}
        onSubmit={(v) => {
          const href = /^(https?:|mailto:)/i.test(v) ? v : `https://${v}`;
          c().extendMarkRange("link").setLink({ href }).run();
        }}
      />
    </>
  );
}
