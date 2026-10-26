"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Asterisk,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  MessageSquareQuote,
  NotebookPen,
  Quote,
  Redo2,
  Search,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import { manuscriptExtensions } from "./editor-extensions";
import { FindReplace } from "./find-replace";
import { PromptDialog } from "./prompt-dialog";
import { cn } from "@/lib/utils";
import { pb, fileUrl, errorMessage } from "@/lib/pb";
import { userId } from "@/lib/studio";
import type { DocNode } from "@/lib/doc/types";

interface Props {
  chapterId: string;
  bookId: string;
  initial: DocNode | null;
  onChange: (doc: DocNode, words: number) => void;
  /** CSS applied to the writing surface so it matches the chosen interior theme */
  fontFamily: string;
}

export function ManuscriptEditor({ chapterId, bookId, initial, onChange, fontFamily }: Props) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const editor = useEditor(
    {
      extensions: manuscriptExtensions(),
      content: initial ?? { type: "doc", content: [{ type: "paragraph" }] },
      immediatelyRender: false,
      editorProps: {
        attributes: { class: "prose-manuscript", "aria-label": "Manuscript", spellcheck: "true" },
      },
      onUpdate: ({ editor }) => {
        onChangeRef.current(editor.getJSON() as DocNode, editor.storage.characterCount.words());
      },
    },
    [chapterId],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {editor && <Toolbar editor={editor} bookId={bookId} />}
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#faf8f7]" id="manuscript-scroll">
        <div className="manuscript mx-auto max-w-[44rem] px-6 py-10 text-[1.1875rem] leading-[1.7] text-ink sm:px-10" style={{ fontFamily }}>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

function ToolButton({ on, active, label, children, disabled }: { on: () => void; active?: boolean; label: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={on}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded text-ink-2 transition-colors hover:bg-paper-2 disabled:opacity-40 [&_svg]:size-4",
        active && "bg-primary-soft text-primary",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, bookId }: { editor: Editor; bookId: string }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      h4: e.isActive("heading", { level: 4 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      callout: e.isActive("callout"),
      link: e.isActive("link"),
      center: e.isActive({ textAlign: "center" }),
      right: e.isActive({ textAlign: "right" }),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const [prompt, setPrompt] = useState<null | "link" | "footnote">(null);
  const [find, setFind] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const style = s.h2 ? "h2" : s.h3 ? "h3" : s.h4 ? "h4" : "p";

  async function upload(file: File) {
    setUploading(true);
    try {
      const rec = await pb().collection("assets").create({ owner: userId(), book: bookId, file, alt: file.name.replace(/\.[^.]+$/, "") });
      editor.chain().focus().setImage({ src: fileUrl(rec, rec.file), alt: rec.alt }).run();
    } catch (e) {
      alert(`Image upload failed: ${errorMessage(e)}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative border-b border-border bg-card">
      <div className="flex items-center gap-0.5 overflow-x-auto px-2 py-1.5">
        <label className="sr-only" htmlFor="para-style">
          Paragraph style
        </label>
        <select
          id="para-style"
          value={style}
          onChange={(e) => {
            const v = e.target.value;
            const c = editor.chain().focus();
            if (v === "p") c.setParagraph().run();
            else c.toggleHeading({ level: Number(v.slice(1)) as 2 | 3 | 4 }).run();
          }}
          className="mr-1 h-8 rounded border border-input bg-card px-2 text-sm"
        >
          <option value="p">Body text</option>
          <option value="h2">Heading</option>
          <option value="h3">Subheading</option>
          <option value="h4">Minor heading</option>
        </select>
        <ToolButton label="Bold" active={s.bold} on={() => editor.chain().focus().toggleBold().run()}>
          <Bold />
        </ToolButton>
        <ToolButton label="Italic" active={s.italic} on={() => editor.chain().focus().toggleItalic().run()}>
          <Italic />
        </ToolButton>
        <ToolButton label="Underline" active={s.underline} on={() => editor.chain().focus().toggleUnderline().run()}>
          <Underline />
        </ToolButton>
        <ToolButton label="Strikethrough" active={s.strike} on={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough />
        </ToolButton>
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <ToolButton label="Align left" active={!s.center && !s.right} on={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft />
        </ToolButton>
        <ToolButton label="Center" active={s.center} on={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter />
        </ToolButton>
        <ToolButton label="Align right" active={s.right} on={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight />
        </ToolButton>
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <ToolButton label="Bulleted list" active={s.bullet} on={() => editor.chain().focus().toggleBulletList().run()}>
          <List />
        </ToolButton>
        <ToolButton label="Numbered list" active={s.ordered} on={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered />
        </ToolButton>
        <ToolButton label="Block quote" active={s.quote} on={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote />
        </ToolButton>
        <ToolButton
          label="Callout box"
          active={s.callout}
          on={() => {
            if (s.callout) editor.chain().focus().lift("callout").run();
            else editor.chain().focus().wrapIn("callout").run();
          }}
        >
          <MessageSquareQuote />
        </ToolButton>
        <ToolButton label="Scene break" on={() => editor.chain().focus().setHorizontalRule().run()}>
          <Asterisk />
        </ToolButton>
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <ToolButton label="Link" active={s.link} on={() => (s.link ? editor.chain().focus().unsetLink().run() : setPrompt("link"))}>
          <Link2 />
        </ToolButton>
        <ToolButton label="Footnote" on={() => setPrompt("footnote")}>
          <NotebookPen />
        </ToolButton>
        <ToolButton label={uploading ? "Uploading image" : "Image"} disabled={uploading} on={() => fileRef.current?.click()}>
          <ImagePlus />
        </ToolButton>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <ToolButton label="Undo" disabled={!s.canUndo} on={() => editor.chain().focus().undo().run()}>
          <Undo2 />
        </ToolButton>
        <ToolButton label="Redo" disabled={!s.canRedo} on={() => editor.chain().focus().redo().run()}>
          <Redo2 />
        </ToolButton>
        <ToolButton label="Find and replace" active={find} on={() => setFind((v) => !v)}>
          <Search />
        </ToolButton>
      </div>
      {find && <FindReplace editor={editor} onClose={() => setFind(false)} />}
      <PromptDialog
        open={prompt === "link"}
        title="Add a link"
        label="Web address"
        placeholder="https://"
        onClose={() => setPrompt(null)}
        onSubmit={(v) => {
          const href = /^(https?:|mailto:)/i.test(v) ? v : `https://${v}`;
          editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
        }}
      />
      <PromptDialog
        open={prompt === "footnote"}
        title="Add a footnote"
        label="Note text"
        multiline
        onClose={() => setPrompt(null)}
        onSubmit={(v) => editor.chain().focus().insertContent({ type: "footnote", attrs: { text: v } }).run()}
      />
    </div>
  );
}
