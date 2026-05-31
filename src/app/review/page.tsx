"use client";
import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/lib/toast";
import { MOCK_REVIEW_ITEMS } from "@/lib/mock/jollof-data";
import {
  AlertTriangle, Shield, Layers, RotateCcw, CheckCircle,
  Clock, User, ExternalLink, MessageSquare, Flag, Zap
} from "lucide-react";

const FILTER_TABS = [
  { id: "all", label: "All", count: 4 },
  { id: "critical", label: "Critical", count: 1 },
  { id: "warnings", label: "Warnings", count: 3 },
  { id: "canon", label: "Canon", count: 2 },
  { id: "panels", label: "Panels", count: 1 },
  { id: "revisions", label: "Revisions", count: 0 },
];

export default function ReviewQueuePage() {
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState(MOCK_REVIEW_ITEMS[0]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [suggestFixOpen, setSuggestFixOpen] = useState(false);
  const [fixNote, setFixNote] = useState("");
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

  const filtered = MOCK_REVIEW_ITEMS.filter((item) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "critical") return item.severity === "critical";
    if (activeFilter === "warnings") return item.severity === "warning";
    if (activeFilter === "canon") return item.type === "canon";
    if (activeFilter === "panels") return item.type === "panels";
    if (activeFilter === "revisions") return item.type === "revision";
    return true;
  });

  const handleBlock = (id: string) => {
    setStatuses((prev) => ({ ...prev, [id]: "blocked" }));
    toast("Item marked as blocked.", "warning");
  };
  const handleSuggestFix = () => {
    toast(`Fix suggested: "${fixNote || "No note"}"`, "success");
    setSuggestFixOpen(false);
    setFixNote("");
  };
  const handleAddNote = () => {
    toast("Note added to review item.", "success");
    setAddNoteOpen(false);
    setNoteText("");
  };

  const severityIcon = (sev: string) =>
    sev === "critical" ? (
      <AlertTriangle size={13} className="text-red-400" />
    ) : (
      <AlertTriangle size={13} className="text-amber-400" />
    );

  const typeIcon: Record<string, React.ReactNode> = {
    continuity: <Shield size={12} className="text-blue-400" />,
    canon: <Shield size={12} className="text-jollof-orange" />,
    panels: <Layers size={12} className="text-purple-400" />,
    revision: <RotateCcw size={12} className="text-amber-400" />,
  };

  return (
    <AppShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-5 border-b border-jollof-border">
          <div className="text-jollof-orange font-bold text-xs uppercase tracking-widest mb-0.5">Review Queue</div>
          <h1 className="text-2xl font-black text-jollof-text mb-0.5">Review Queue</h1>
          <p className="text-sm text-jollof-subtext">Keep approvals, blockers, canon suggestions, panel reviews, and revision work organized in one place.</p>
        </div>

        {/* Filter tabs */}
        <div className="px-6 pt-3 border-b border-jollof-border bg-[#0f0d08]/20">
          <Tabs tabs={FILTER_TABS} active={activeFilter} onChange={setActiveFilter} />
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Items list */}
          <div className="w-80 shrink-0 border-r border-jollof-border overflow-y-auto">
            <div className="p-3 border-b border-jollof-border flex items-center justify-between">
              <span className="text-xs font-semibold text-jollof-subtext uppercase tracking-wider">Review Items</span>
              <span className="text-xs text-jollof-label">{filtered.length}</span>
            </div>
            {filtered.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle size={24} className="text-green-400 mx-auto mb-2" />
                <p className="text-sm text-jollof-subtext">No items in this category.</p>
              </div>
            ) : (
              <div className="divide-y divide-jollof-border">
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`px-4 py-3 cursor-pointer hover:bg-jollof-panel/40 transition-colors ${selectedItem.id === item.id ? "bg-jollof-orange/5 border-l-2 border-l-jollof-orange" : ""}`}
                  >
                    <div className="flex items-start gap-2 mb-1">
                      {severityIcon(item.severity)}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-jollof-text leading-snug">{item.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {typeIcon[item.type]}
                          <span className="text-[10px] text-jollof-label">{item.type}</span>
                          <span className="text-[10px] text-jollof-label">·</span>
                          <StatusBadge
                            status={statuses[item.id] ?? item.severity}
                            className="text-[9px]"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-jollof-label pl-5">
                      <Clock size={9} />
                      <span>Due {item.dueDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selectedItem && (
            <div className="flex-1 overflow-y-auto p-5">
              <div className="max-w-2xl">
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  {severityIcon(selectedItem.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h2 className="text-lg font-bold text-jollof-text">{selectedItem.title}</h2>
                      <StatusBadge status={statuses[selectedItem.id] ?? selectedItem.severity} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-jollof-label">
                      <span className="flex items-center gap-1"><User size={10} /> {selectedItem.assignedTo}</span>
                      <span className="flex items-center gap-1"><Clock size={10} /> Due {selectedItem.dueDate}</span>
                      <span className="flex items-center gap-1">{typeIcon[selectedItem.type]} {selectedItem.type}</span>
                    </div>
                  </div>
                </div>

                {/* Issue description */}
                <div className="jollof-card p-4 mb-4">
                  <h3 className="text-xs font-semibold text-jollof-subtext uppercase tracking-wider mb-2">Issue Description</h3>
                  <p className="text-sm text-jollof-text leading-relaxed">{selectedItem.description}</p>
                </div>

                {/* Scene reference */}
                <div className="jollof-card p-4 mb-4">
                  <h3 className="text-xs font-semibold text-jollof-subtext uppercase tracking-wider mb-2">References</h3>
                  <div className="flex items-center gap-2">
                    <Flag size={12} className="text-jollof-orange" />
                    <span className="text-sm text-jollof-subtext">{selectedItem.scene}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedItem.affectedEntities.map((e) => (
                      <span key={e} className="text-xs bg-jollof-surface border border-jollof-border px-2 py-0.5 rounded text-jollof-subtext">{e}</span>
                    ))}
                  </div>
                </div>

                {/* Issue detail */}
                <div className="jollof-card p-4 mb-4">
                  <h3 className="text-xs font-semibold text-jollof-subtext uppercase tracking-wider mb-2">Issue</h3>
                  <p className="text-sm text-jollof-subtext leading-relaxed">{selectedItem.issue}</p>
                </div>

                {/* Suggested resolution */}
                {selectedItem.actionSuggestion && (
                  <div className="bg-jollof-orange/5 border border-jollof-orange/20 rounded-lg p-4 mb-4">
                    <h3 className="text-xs font-semibold text-jollof-orange uppercase tracking-wider mb-1.5">Suggested Fix</h3>
                    <p className="text-sm text-jollof-text/80 leading-relaxed">{selectedItem.actionSuggestion}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={selectedItem.type === "continuity" || selectedItem.type === "panels" ? "/scenes/scene-03" : "/canon"}>
                    <Button variant="secondary" icon={ExternalLink} size="sm">
                      Open in Story
                    </Button>
                  </Link>
                  <Button variant="outline" icon={Zap} size="sm" onClick={() => setSuggestFixOpen(true)}>
                    Suggest Fix
                  </Button>
                  <Button
                    variant="danger"
                    icon={Flag}
                    size="sm"
                    onClick={() => handleBlock(selectedItem.id)}
                    disabled={statuses[selectedItem.id] === "blocked"}
                  >
                    {statuses[selectedItem.id] === "blocked" ? "Blocked ✓" : "Mark as Blocked"}
                  </Button>
                  <Button variant="ghost" icon={MessageSquare} size="sm" onClick={() => setAddNoteOpen(true)}>
                    Add Note
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom info */}
        <div className="grid grid-cols-3 gap-4 p-4 border-t border-jollof-border">
          {[
            { icon: AlertTriangle, title: "Surface What Matters", desc: "Critical issues rise to the top so nothing slips through." },
            { icon: Zap, title: "Take Action, Fast", desc: "Review details, references, and resolution tools in one focused view." },
            { icon: CheckCircle, title: "Keep Production Moving", desc: "Clear ownership, SLAs, and quick actions help you ship with confidence." },
          ].map((c) => (
            <div key={c.title} className="jollof-panel p-3 flex items-start gap-2">
              <c.icon size={14} className="text-jollof-orange shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-jollof-text">{c.title}</p>
                <p className="text-[11px] text-jollof-subtext mt-0.5">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Suggest Fix Modal */}
      <Modal open={suggestFixOpen} onClose={() => setSuggestFixOpen(false)} title="Suggest Fix" size="sm">
        <div className="space-y-4">
          <p className="text-xs text-jollof-subtext">Describe your suggested resolution for this review item. This will be routed to the relevant team member.</p>
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Fix Description</label>
            <textarea
              value={fixNote}
              onChange={(e) => setFixNote(e.target.value)}
              rows={4}
              placeholder="Describe the fix..."
              className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-2 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="primary" className="flex-1" onClick={handleSuggestFix}>Submit Fix</Button>
            <Button variant="secondary" onClick={() => setSuggestFixOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Add Note Modal */}
      <Modal open={addNoteOpen} onClose={() => setAddNoteOpen(false)} title="Add Note" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Note</label>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
              placeholder="Add a context note..."
              className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-2 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="primary" className="flex-1" onClick={handleAddNote}>Add Note</Button>
            <Button variant="secondary" onClick={() => setAddNoteOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
