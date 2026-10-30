"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Asterisk,
  AtSign,
  BookA,
  BookHeart,
  BookOpen,
  Briefcase,
  ChartNoAxesColumn,
  CircleAlert,
  CircleHelp,
  Clapperboard,
  Columns2,
  Columns3,
  Contact,
  CookingPot,
  Dumbbell,
  Feather,
  FlaskConical,
  Footprints,
  History,
  Image as ImageIcon,
  ImageUp,
  Info,
  KeyRound,
  Library,
  Lightbulb,
  Link2,
  List,
  ListChecks,
  ListCollapse,
  ListOrdered,
  Mail,
  Mails,
  MessageCircleQuestion,
  MessagesSquare,
  Mic,
  MoveVertical,
  Music,
  Newspaper,
  NotebookPen,
  NotebookText,
  PanelLeft,
  PanelRight,
  PanelRightOpen,
  PenLine,
  Printer,
  Quote,
  Rows3,
  Search,
  Send,
  SeparatorHorizontal,
  Smile,
  Sparkles,
  Sprout,
  StickyNote,
  Table,
  Tablet,
  Target,
  TextQuote,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { BLOCKS, blockTemplate, type BlockDef } from "@/lib/blocks";
import { INTENTS, searchBlocks, type Intent } from "@/lib/block-intents";
import type { DocNode } from "@/lib/doc/types";
import { generateHTML, type JSONContent } from "@tiptap/core";
import { Bookmark, Pencil, Star, Trash2 } from "lucide-react";
import { manuscriptExtensions } from "./editor-extensions";
import { useBlockLibrary, type SavedBlock } from "./block-library";
import { PromptDialog } from "./prompt-dialog";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  Bookmark,
  Asterisk,
  AtSign,
  BookA,
  BookHeart,
  BookOpen,
  Briefcase,
  ChartNoAxesColumn,
  CircleAlert,
  CircleHelp,
  Clapperboard,
  Columns2,
  Columns3,
  Contact,
  CookingPot,
  Dumbbell,
  Feather,
  FlaskConical,
  Footprints,
  History,
  Image: ImageIcon,
  ImageUp,
  Info,
  KeyRound,
  Library,
  Lightbulb,
  Link2,
  List,
  ListChecks,
  ListCollapse,
  ListOrdered,
  Mail,
  Mails,
  MessageCircleQuestion,
  MessagesSquare,
  Mic,
  MoveVertical,
  Music,
  Newspaper,
  NotebookPen,
  NotebookText,
  PanelLeft,
  PanelRight,
  PanelRightOpen,
  PenLine,
  Printer,
  Quote,
  Rows3,
  Send,
  SeparatorHorizontal,
  Smile,
  Sparkles,
  Sprout,
  StickyNote,
  Table,
  Tablet,
  Target,
  TextQuote,
  TriangleAlert,
  Users,
};

export function BlockIcon({ name, className }: { name: string; className?: string }) {
  const I = ICONS[name] ?? StickyNote;
  return <I className={className} aria-hidden />;
}

// a small live picture of each block, drawn by the editor's own rules so it matches the page
const previews = new Map<string, string>();
function previewHtml(node: DocNode | null, key: string): string {
  if (!node) return "";
  let html = previews.get(key);
  if (html === undefined) {
    try {
      html = generateHTML({ type: "doc", content: [node] } as JSONContent, manuscriptExtensions(""));
    } catch {
      html = "";
    }
    previews.set(key, html);
  }
  return html;
}

type Tab = Intent | "favourites" | "recent" | "mine" | "all";

/**
 * The Insert menu: blocks sorted by what the author wants to do, each with a preview in the book's
 * own style, plus favourites, recently used and the author's saved blocks.
 */
export function InsertBlockDialog({
  open,
  onOpenChange,
  onPick,
  onPickSaved,
  previewCss,
  fontFamily,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (b: BlockDef) => void;
  onPickSaved?: (b: SavedBlock) => void;
  /** the book's block styles scoped to .jp-preview */
  previewCss?: string;
  fontFamily?: string;
}) {
  const lib = useBlockLibrary();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("popular");
  const [renaming, setRenaming] = useState<SavedBlock | null>(null);
  const tabs: { id: Tab; label: string }[] = [
    { id: "popular", label: "Popular" },
    { id: "favourites", label: `Favourites${lib.prefs.favourites.length ? ` (${lib.prefs.favourites.length})` : ""}` },
    { id: "recent", label: "Recently used" },
    { id: "mine", label: `My blocks${lib.saved?.length ? ` (${lib.saved.length})` : ""}` },
    ...INTENTS.slice(1).map((i) => ({ id: i.id as Tab, label: i.label })),
    { id: "all", label: "All" },
  ];
  const byKey = (k: string): BlockDef | SavedBlock | null => (k.startsWith("saved:") ? (lib.saved ?? []).find((b) => `saved:${b.id}` === k) ?? null : (BLOCKS.find((b) => b.id === k) ?? null));
  const s = q.trim().toLowerCase();
  const items: (BlockDef | SavedBlock)[] = s
    ? [...(lib.saved ?? []).filter((b) => b.name.toLowerCase().includes(s)), ...searchBlocks(s)]
    : tab === "favourites"
      ? lib.prefs.favourites.map(byKey).filter((b): b is BlockDef | SavedBlock => !!b)
      : tab === "recent"
        ? lib.prefs.recent.map(byKey).filter((b): b is BlockDef | SavedBlock => !!b)
        : tab === "mine"
          ? (lib.saved ?? [])
          : tab === "all"
            ? BLOCKS
            : (INTENTS.find((i) => i.id === tab)?.blocks ?? []).map((id) => BLOCKS.find((b) => b.id === id)).filter((b): b is BlockDef => !!b);

  const pick = (it: BlockDef | SavedBlock) => {
    onOpenChange(false);
    setQ("");
    if (isSaved(it)) {
      lib.used(`saved:${it.id}`);
      onPickSaved?.(it);
    } else {
      lib.used(it.id);
      onPick(it);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setQ("");
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-4xl grid-cols-1 gap-3 p-0 sm:p-0">
        {previewCss && <style>{previewCss}</style>}
        <div className="min-w-0 border-b border-border px-5 pt-5 pb-3">
          <DialogTitle>Insert a block</DialogTitle>
          <DialogDescription>
            {BLOCKS.length} blocks, shown in your book&apos;s style. Each one looks the same in print, in the ebook and on your website. Tip: type / on the page to insert without leaving the keyboard.
          </DialogDescription>
          <label className="mt-3 flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3">
            <Search className="size-4 text-soft" aria-hidden />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="What do you want to add? Try: reader activity, quote, text messages…"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              aria-label="Search blocks"
            />
          </label>
          {!s && (
            <div role="tablist" aria-label="Kinds of block" className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={cn("shrink-0 rounded-full border px-3 py-1 text-[13px] transition-colors", tab === t.id ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary")}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="max-h-[60vh] min-w-0 overflow-y-auto px-5 pb-5">
          {items.length === 0 && (
            <p className="py-8 text-center text-sm text-soft">
              {s
                ? `No block matches “${q}”.`
                : tab === "favourites"
                  ? "Star a block to keep it here."
                  : tab === "recent"
                    ? "Blocks you insert show up here."
                    : tab === "mine"
                      ? "Right-click any block on the page and choose Save as a reusable block. It will be here in every book."
                      : "Nothing here yet."}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {items.map((it) => {
              const saved = isSaved(it);
              const key = saved ? `saved:${it.id}` : it.id;
              const html = saved ? previewHtml(it.content, key + it.updated) : previewHtml(blockTemplate(it.id), key);
              const fav = lib.isFavourite(key);
              return (
                <div key={key} className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md">
                  <button type="button" onClick={() => pick(it)} className="flex flex-1 flex-col text-left" aria-label={`Insert ${saved ? it.name : it.label}`}>
                    <div aria-hidden className="jp-preview manuscript pointer-events-none relative h-28 overflow-hidden border-b border-border bg-[#faf8f7] dark:bg-background">
                      {html ? (
                        <div className="ProseMirror absolute top-0 left-0 w-[200%] origin-top-left scale-50 p-5 text-[17px] leading-relaxed text-ink" style={{ fontFamily }} dangerouslySetInnerHTML={{ __html: html }} />
                      ) : (
                        <div className="grid h-full place-items-center text-primary">
                          <BlockIcon name={saved ? "Bookmark" : it.icon} className="size-8" />
                        </div>
                      )}
                    </div>
                    <span className="flex items-start gap-2.5 p-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary-soft text-primary">
                        <BlockIcon name={saved ? "Bookmark" : it.icon} className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{saved ? it.name : it.label}</span>
                        <span className="block text-[12.5px] leading-snug text-soft">{saved ? "Your saved block" : it.description}</span>
                      </span>
                    </span>
                  </button>
                  <div className="absolute top-1.5 right-1.5 flex gap-1">
                    {saved && (
                      <>
                        <IconBtn label={`Rename ${it.name}`} on={() => setRenaming(it)}>
                          <Pencil />
                        </IconBtn>
                        <IconBtn
                          label={`Delete ${it.name}`}
                          on={() => {
                            if (confirm(`Delete the saved block “${it.name}”? Copies already in your books stay.`)) void lib.remove(it.id);
                          }}
                        >
                          <Trash2 />
                        </IconBtn>
                      </>
                    )}
                    <IconBtn label={fav ? "Remove from favourites" : "Add to favourites"} pressed={fav} on={() => lib.toggleFavourite(key)}>
                      <Star className={cn(fav && "fill-primary text-primary")} />
                    </IconBtn>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <PromptDialog
          open={!!renaming}
          title="Rename this block"
          label="Name"
          initial={renaming?.name ?? ""}
          onClose={() => setRenaming(null)}
          onSubmit={(v) => {
            if (renaming && v.trim()) void lib.rename(renaming.id, v.trim());
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function isSaved(it: BlockDef | SavedBlock): it is SavedBlock {
  return "content" in it;
}

function IconBtn({ label, on, pressed, children }: { label: string; on: () => void; pressed?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={on}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cn(
        "grid size-7 place-items-center rounded-md border border-border bg-card/90 text-ink-2 opacity-0 shadow-sm transition group-hover:opacity-100 hover:text-ink focus-visible:opacity-100 [&_svg]:size-3.5",
        pressed && "opacity-100",
      )}
    >
      {children}
    </button>
  );
}

interface EmojiItem {
  emoji?: string;
  name: string;
  tags: string[];
  group?: string;
}

/** Every emoji, searchable by name. The list comes from Tiptap's emoji data, loaded when opened. */
export function EmojiDialog({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (v: boolean) => void; onPick: (emoji: string) => void }) {
  const [all, setAll] = useState<EmojiItem[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    if (!open || all.length) return;
    import("@tiptap/extension-emoji").then((m) => setAll((m.emojis as EmojiItem[]).filter((e) => e.emoji && e.group)));
  }, [open, all.length]);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase().replace(/\s+/g, "_");
    return (s ? all.filter((e) => e.name.includes(s) || e.tags.some((t) => t.includes(s))) : all).slice(0, 400);
  }, [all, q]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle>Emoji</DialogTitle>
        <label className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3">
          <Search className="size-4 text-soft" aria-hidden />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: heart, party, fire…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label="Search emoji" />
        </label>
        <div className="grid max-h-72 grid-cols-8 gap-1 overflow-y-auto" role="listbox" aria-label="Emoji">
          {!all.length && <p className="col-span-8 py-6 text-center text-sm text-soft">Loading…</p>}
          {shown.map((e) => (
            <button
              key={e.name}
              type="button"
              title={e.name.replace(/_/g, " ")}
              onClick={() => {
                onOpenChange(false);
                onPick(e.emoji!);
              }}
              className="grid aspect-square place-items-center rounded text-2xl hover:bg-paper-2"
            >
              {e.emoji}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
