"use client";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/lib/toast";
import { MOCK_CANON_ENTRIES, MOCK_SUGGESTED_CANON, MOCK_DISPUTED_CANON } from "@/lib/mock/jollof-data";
import {
  Plus, Shield, MapPin, Users, Package, BookOpen, Clock,
  CheckCircle, AlertTriangle, HelpCircle, Link as LinkIcon, ChevronLeft
} from "lucide-react";

const CATEGORIES = ["All", "Characters", "Locations", "Factions", "Objects", "Rules", "Timeline", "Threads"];

export default function CanonVaultPage() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedEntry, setSelectedEntry] = useState(MOCK_CANON_ENTRIES[0]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [addOpen, setAddOpen] = useState(false);
  // Mobile: "list" or "detail"
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  const filtered = MOCK_CANON_ENTRIES.filter((e) => {
    if (selectedCategory !== "All" && e.category !== selectedCategory) return false;
    if (statusFilter !== "All" && e.status !== statusFilter.toLowerCase()) return false;
    return true;
  });

  const handleAddEntry = () => {
    toast("Canon entry added (prototype only). Story OS write pending.", "success");
    setAddOpen(false);
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    Characters: <Users size={13} className="text-jollof-orange" />,
    Locations: <MapPin size={13} className="text-jollof-orange" />,
    Factions: <Shield size={13} className="text-jollof-orange" />,
    Objects: <Package size={13} className="text-jollof-orange" />,
    Rules: <BookOpen size={13} className="text-jollof-orange" />,
    Timeline: <Clock size={13} className="text-jollof-orange" />,
    Threads: <LinkIcon size={13} className="text-jollof-orange" />,
    All: <Shield size={13} className="text-jollof-orange" />,
  };

  return (
    <AppShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-jollof-border shrink-0">
          <div className="text-center">
            <div className="text-jollof-orange font-bold text-xs uppercase tracking-widest mb-0.5">Canon Vault</div>
            <h1 className="text-xl sm:text-2xl font-black text-jollof-text mb-0.5">Canon Vault</h1>
            <p className="text-sm text-jollof-subtext mb-3">Manage the source of truth for characters, world lore, and narrative threads.</p>
          </div>
          <div className="flex justify-center">
            <Button variant="primary" icon={Plus} size="sm" className="w-full sm:w-auto justify-center" onClick={() => setAddOpen(true)}>
              Add Entry
            </Button>
          </div>

          {/* Mobile category chips — horizontal scroll */}
          <div className="flex gap-1.5 mt-3 overflow-x-auto scrollbar-none pb-1 lg:hidden sm:justify-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-jollof-surface border border-jollof-border rounded px-2 py-1 text-xs text-jollof-text focus:outline-none shrink-0"
            >
              {["All", "Confirmed", "Suggested", "Disputed", "Deprecated"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 border transition-all min-h-[36px] ${selectedCategory === cat ? "bg-jollof-orange/10 text-jollof-orange border-jollof-orange/30" : "border-jollof-border text-jollof-subtext"}`}
              >
                {categoryIcons[cat]}
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Desktop category sidebar */}
          <div className="hidden lg:flex w-44 shrink-0 border-r border-jollof-border overflow-y-auto bg-[#0f0d08]/30 flex-col">
            <div className="p-3">
              <div className="mb-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-jollof-surface border border-jollof-border rounded px-2 py-2 text-xs text-jollof-text focus:outline-none"
                >
                  {["All", "Confirmed", "Suggested", "Disputed", "Deprecated"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-0.5 mt-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2.5 rounded-md text-xs font-medium transition-all text-left min-h-[44px] ${selectedCategory === cat ? "bg-jollof-orange/10 text-jollof-orange border border-jollof-orange/20" : "text-jollof-subtext hover:text-jollof-text hover:bg-jollof-panel"}`}
                  >
                    {categoryIcons[cat]}
                    <span>{cat}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Entries list — mobile: show/hide based on mobileView */}
          <div className={`${mobileView === "list" ? "flex" : "hidden"} lg:flex flex-col w-full lg:w-64 shrink-0 border-r border-jollof-border overflow-y-auto items-center lg:items-stretch`}>
            <div className="p-3 border-b border-jollof-border flex items-center justify-between shrink-0 w-full">
              <span className="text-xs font-semibold text-jollof-subtext uppercase tracking-wider">Canon Entries</span>
              <span className="text-xs text-jollof-label">{filtered.length}</span>
            </div>
            <div className="divide-y divide-jollof-border overflow-y-auto jp-mobile-panel lg:max-w-none">
              {filtered.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => { setSelectedEntry(entry); setMobileView("detail"); }}
                  className={`px-3 py-3 cursor-pointer hover:bg-jollof-panel/60 transition-colors min-h-[64px] ${selectedEntry.id === entry.id ? "bg-jollof-orange/5 border-l-2 border-l-jollof-orange" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-sm font-medium text-jollof-text truncate">{entry.title}</span>
                    <StatusBadge status={entry.status} className="shrink-0 text-[9px]" />
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-jollof-label">
                    {categoryIcons[entry.category]}
                    <span>{entry.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Entry detail */}
          <div className={`${mobileView === "detail" ? "flex" : "hidden"} lg:flex flex-col flex-1 overflow-y-auto`}>
            {selectedEntry && (
              <div className="p-4 sm:p-5 w-full max-w-4xl mx-auto">
                {/* Mobile back */}
                <button className="lg:hidden flex items-center gap-1 text-xs text-jollof-orange mb-4" onClick={() => setMobileView("list")}>
                  <ChevronLeft size={14} /> Back to list
                </button>

                <div className="flex flex-col items-center text-center xl:flex-row xl:items-start xl:justify-between xl:text-left mb-4 gap-3">
                  <div>
                    <div className="flex flex-wrap items-center justify-center xl:justify-start gap-2 mb-1">
                      <h2 className="text-lg sm:text-xl font-bold text-jollof-text">{selectedEntry.title}</h2>
                      <StatusBadge status={selectedEntry.status} label={selectedEntry.status.charAt(0).toUpperCase() + selectedEntry.status.slice(1)} />
                    </div>
                    <div className="flex items-center justify-center xl:justify-start gap-2 text-xs text-jollof-label">
                      {categoryIcons[selectedEntry.category]}
                      <span>{selectedEntry.category}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  {/* Confirmed facts */}
                  <div className="jollof-card">
                    <div className="p-4 border-b border-jollof-border flex items-center gap-2">
                      <CheckCircle size={13} className="text-green-400" />
                      <h3 className="text-sm font-semibold text-jollof-text">Confirmed Facts</h3>
                    </div>
                    <div className="p-4 space-y-2">
                      {selectedEntry.confirmedFacts.map((fact, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-jollof-subtext">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1 shrink-0" />
                          <span>{fact}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Linked references */}
                  <div className="jollof-card">
                    <div className="p-4 border-b border-jollof-border">
                      <h3 className="text-sm font-semibold text-jollof-text">Linked References</h3>
                    </div>
                    <div className="p-4 space-y-2">
                      {selectedEntry.linkedReferences.map((ref, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-jollof-subtext">
                          <LinkIcon size={11} className="text-jollof-orange shrink-0" />
                          <span>{ref}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Suggested canon */}
                {MOCK_SUGGESTED_CANON.length > 0 && (
                  <div className="jollof-card mt-4">
                    <div className="p-4 border-b border-jollof-border flex items-center gap-2">
                      <HelpCircle size={13} className="text-amber-400" />
                      <h3 className="text-sm font-semibold text-jollof-text">Suggested Canon</h3>
                      <span className="text-xs bg-amber-400/10 border border-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded tabular-nums">{MOCK_SUGGESTED_CANON.length}</span>
                    </div>
                    <div className="divide-y divide-jollof-border">
                      {MOCK_SUGGESTED_CANON.map((s) => (
                        <div key={s.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-3">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-0.5">
                              <span className="text-xs font-medium text-jollof-text">{s.title}</span>
                              <StatusBadge status="suggested" />
                            </div>
                            <p className="text-[11px] text-jollof-label">{s.agentNote}</p>
                          </div>
                          <div className="flex gap-1.5 shrink-0 justify-center">
                            <Button variant="outline" size="sm" onClick={() => toast(`"${s.title}" confirmed.`, "success")}>Confirm</Button>
                            <Button variant="danger" size="sm" onClick={() => toast(`"${s.title}" rejected.`, "warning")}>Reject</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disputed canon */}
                {MOCK_DISPUTED_CANON.length > 0 && (
                  <div className="jollof-card mt-4">
                    <div className="p-4 border-b border-jollof-border flex items-center gap-2">
                      <AlertTriangle size={13} className="text-red-400" />
                      <h3 className="text-sm font-semibold text-jollof-text">Disputed Canon</h3>
                    </div>
                    <div className="divide-y divide-jollof-border">
                      {MOCK_DISPUTED_CANON.map((d) => (
                        <div key={d.id} className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <span className="text-xs font-medium text-jollof-text">{d.title}</span>
                            <StatusBadge status="disputed" />
                          </div>
                          <p className="text-[11px] text-jollof-subtext mb-2">{d.description}</p>
                          <Button variant="secondary" size="sm" onClick={() => toast("Resolution queued.", "info")}>Resolve Dispute</Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom info — desktop only */}
        <div className="hidden sm:grid sm:grid-cols-3 gap-4 p-4 border-t border-jollof-border shrink-0">
          {[
            { icon: Shield, title: "Single Source of Truth", desc: "Collect and verify every canon fact across characters, world, and story." },
            { icon: CheckCircle, title: "Canon Review & Suggestions", desc: "Surface extracted facts from approved scenes and route through review." },
            { icon: AlertTriangle, title: "Continuity Control", desc: "Track status, resolve disputes, and maintain narrative continuity." },
          ].map((c) => (
            <div key={c.title} className="jollof-panel p-3 flex items-start gap-2 max-w-sm">
              <c.icon size={14} className="text-jollof-orange shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-jollof-text">{c.title}</p>
                <p className="text-[11px] text-jollof-subtext mt-0.5">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Entry Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Canon Entry">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Entry Title</label>
            <input placeholder="e.g. The Equanauts Protocol" className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-3 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Category</label>
              <select className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-3 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40">
                {CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Status</label>
              <select className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-3 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40">
                <option>Confirmed</option><option>Suggested</option><option>Disputed</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Summary</label>
            <textarea rows={3} placeholder="Brief description of this canon entry..." className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-2 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40 resize-none" />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={handleAddEntry}>Add Entry</Button>
            <Button variant="secondary" className="justify-center" onClick={() => setAddOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
