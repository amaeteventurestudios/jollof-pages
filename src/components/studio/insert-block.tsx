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
import { BLOCK_GROUPS, BLOCKS, type BlockDef, type BlockGroup } from "@/lib/blocks";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
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

/** The Insert menu: every special block, grouped and searchable. */
export function InsertBlockDialog({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (v: boolean) => void; onPick: (b: BlockDef) => void }) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<BlockGroup | "All">("All");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return BLOCKS.filter((b) => (group === "All" || b.group === group) && (!s || `${b.label} ${b.description} ${b.group}`.toLowerCase().includes(s)));
  }, [q, group]);
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setQ("");
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-3xl grid-cols-1 gap-3 p-0 sm:p-0">
        <div className="min-w-0 border-b border-border px-5 pt-5 pb-3">
          <DialogTitle>Insert a block</DialogTitle>
          <DialogDescription>{BLOCKS.length} blocks. Each one looks the same in print, in the ebook and on your website.</DialogDescription>
          <label className="mt-3 flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3">
            <Search className="size-4 text-soft" aria-hidden />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search blocks: letter, chat, table…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label="Search blocks" />
          </label>
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Block groups">
            {(["All", ...BLOCK_GROUPS] as const).map((g) => (
              <button
                key={g}
                type="button"
                role="tab"
                aria-selected={group === g}
                onClick={() => setGroup(g)}
                className={cn("shrink-0 rounded-full border px-3 py-1 text-[13px] transition-colors", group === g ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary")}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-[60vh] min-w-0 overflow-y-auto px-5 pb-5">
          {shown.length === 0 && <p className="py-8 text-center text-sm text-soft">No block matches “{q}”.</p>}
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {shown.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onPick(b);
                }}
                className="group flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary-soft text-primary">
                  <BlockIcon name={b.icon} className="size-4.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{b.label}</span>
                  <span className="block text-[12.5px] leading-snug text-soft">{b.description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
