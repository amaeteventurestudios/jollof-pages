"use client";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/lib/toast";
import { MOCK_PANELS } from "@/lib/mock/jollof-data";
import {
  Plus, Download, Lock, Users, MapPin, MessageSquare,
  Sun, Package, FileText, AlertTriangle
} from "lucide-react";

export default function PanelStudioPage() {
  const { toast } = useToast();
  const [selectedPanel, setSelectedPanel] = useState(MOCK_PANELS[0]);
  const [lockOpen, setLockOpen] = useState(false);
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [panels, setPanels] = useState(MOCK_PANELS.filter((p) => p.pageNumber === 19));
  // Mobile: "list" | "detail" | "structure"
  const [mobilePanel, setMobilePanel] = useState<"list" | "detail" | "structure">("list");

  const handleLockPage = () => {
    setLocked(true);
    setLockOpen(false);
    toast("Page 19 locked. No further edits without revision flow.", "success");
  };

  const handleAddPanel = () => {
    const newPanel = {
      id: `panel-new-${Date.now()}`,
      pageId: "p-019",
      pageNumber: 19,
      panelNumber: panels.length + 1,
      sceneId: "scene-03",
      shotType: "Medium Shot",
      characters: [] as string[],
      dialogue: "",
      caption: "",
      environment: "New environment...",
      lighting: "Natural.",
      props: [] as string[],
      continuityNote: "",
      notes: "",
      status: "draft" as const,
      locked: false,
    };
    setPanels((prev) => [...prev, newPanel]);
    toast("Panel added.", "success");
    setAddPanelOpen(false);
  };

  return (
    <AppShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-jollof-border bg-[#0f0d08]/40 shrink-0">
          <div className="text-center mb-3">
            <div className="text-jollof-orange font-bold text-xs uppercase tracking-widest mb-0.5">Panel Studio · Scene 03 · Pages 7–10</div>
            <h1 className="text-xl sm:text-2xl font-black text-jollof-text">Panel Studio</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-center max-w-2xl mx-auto">
              <select className="w-full sm:w-auto bg-jollof-surface border border-jollof-border rounded-lg px-2.5 py-2 text-xs text-jollof-text focus:outline-none min-h-[40px]">
                <option>Scene 03: Drift Zone Reveal</option>
                <option>Scene 01: Lagos Drift Station</option>
              </select>
              <select className="w-full sm:w-auto bg-jollof-surface border border-jollof-border rounded-lg px-2.5 py-2 text-xs text-jollof-text focus:outline-none min-h-[40px]">
                <option>Page 19</option>
                <option>Page 20</option>
              </select>
              <Button variant="outline" icon={Download} size="sm" onClick={() => toast("Page exported.", "info")}>
                <span className="hidden sm:inline">Export Page</span>
                <span className="sm:hidden">Export</span>
              </Button>
              <Button variant={locked ? "danger" : "secondary"} icon={Lock} size="sm" onClick={() => setLockOpen(true)} disabled={locked}>
                {locked ? "Locked" : "Lock"}
              </Button>
          </div>
        </div>

        {/* Mobile panel switcher */}
        <div className="lg:hidden flex justify-center border-b border-jollof-border shrink-0 overflow-x-auto scrollbar-none">
          {(["list", "detail", "structure"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setMobilePanel(p)}
              className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap min-h-[44px] border-b-2 -mb-px capitalize transition-colors ${mobilePanel === p ? "border-jollof-orange text-jollof-orange" : "border-transparent text-jollof-subtext"}`}
            >
              {p === "list" ? "Panels" : p === "detail" ? "Panel Detail" : "Page Structure"}
            </button>
          ))}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Panel list */}
          <div className={`${mobilePanel === "list" ? "flex" : "hidden"} lg:flex flex-col w-full lg:w-52 shrink-0 border-r border-jollof-border overflow-y-auto items-center lg:items-stretch`}>
            <div className="p-3 border-b border-jollof-border flex items-center justify-between shrink-0 w-full">
              <h3 className="text-xs font-semibold text-jollof-subtext uppercase tracking-wider">Panels · Page 19</h3>
              <button onClick={() => setAddPanelOpen(true)} className="text-jollof-label hover:text-jollof-orange p-1">
                <Plus size={14} />
              </button>
            </div>
            <div className="divide-y divide-jollof-border overflow-y-auto jp-mobile-panel lg:max-w-none">
              {panels.map((panel) => (
                <div
                  key={panel.id}
                  onClick={() => { setSelectedPanel(panel); setMobilePanel("detail"); }}
                  className={`p-3 cursor-pointer hover:bg-jollof-panel/40 transition-colors min-h-[72px] ${selectedPanel.id === panel.id ? "bg-jollof-orange/5 border-l-2 border-l-jollof-orange" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-jollof-text">Panel {panel.panelNumber}</span>
                    <StatusBadge status={panel.status} className="text-[9px]" />
                  </div>
                  <p className="text-[10px] text-jollof-label truncate">{panel.shotType}</p>
                  {panel.characters.length > 0 && (
                    <p className="text-[10px] text-jollof-subtext truncate">{panel.characters.join(", ")}</p>
                  )}
                  <div className="w-full h-10 rounded bg-gradient-to-br from-amber-950/40 to-jollof-surface border border-jollof-border mt-2 flex items-center justify-center">
                    <span className="text-[9px] text-jollof-label">P{panel.panelNumber}</span>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setAddPanelOpen(true)}
                className="w-full p-3 text-xs text-jollof-label hover:text-jollof-orange border-t border-dashed border-jollof-border transition-colors flex items-center gap-2 justify-center min-h-[52px]"
              >
                <Plus size={13} /> Add Panel
              </button>
            </div>
          </div>

          {/* Panel detail */}
          <div className={`${mobilePanel === "detail" ? "flex" : "hidden"} lg:flex flex-col flex-1 overflow-y-auto p-4 sm:p-5`}>
            {selectedPanel && (
              <div className="w-full max-w-2xl mx-auto">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {/* Mobile back */}
                  <button className="lg:hidden text-xs text-jollof-orange mr-2" onClick={() => setMobilePanel("list")}>← Back</button>
                  <h2 className="text-base sm:text-lg font-bold text-jollof-text">Panel {selectedPanel.panelNumber}</h2>
                  <StatusBadge status={selectedPanel.status} />
                  {locked && <StatusBadge status="locked" label="Page Locked" />}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="jollof-card p-4 space-y-4">
                    <div>
                      <label className="block text-[10px] text-jollof-label uppercase tracking-wider mb-1 flex items-center gap-1"><FileText size={10} /> Shot Type</label>
                      <p className="text-sm text-jollof-text font-medium">{selectedPanel.shotType}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] text-jollof-label uppercase tracking-wider mb-1 flex items-center gap-1"><Users size={10} /> Characters</label>
                      {selectedPanel.characters.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {selectedPanel.characters.map((c) => (
                            <span key={c} className="text-xs bg-jollof-surface border border-jollof-border px-2 py-0.5 rounded text-jollof-subtext">{c}</span>
                          ))}
                        </div>
                      ) : <p className="text-xs text-jollof-label">No characters</p>}
                    </div>
                    {(selectedPanel.dialogue || selectedPanel.caption) && (
                      <div>
                        <label className="block text-[10px] text-jollof-label uppercase tracking-wider mb-1 flex items-center gap-1"><MessageSquare size={10} /> {selectedPanel.dialogue ? "Dialogue" : "Caption"}</label>
                        <p className="text-xs text-jollof-text bg-jollof-surface border border-jollof-border rounded p-2 leading-snug italic">{selectedPanel.dialogue || selectedPanel.caption}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] text-jollof-label uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin size={10} /> Environment</label>
                      <p className="text-xs text-jollof-subtext leading-snug">{selectedPanel.environment}</p>
                    </div>
                  </div>

                  <div className="jollof-card p-4 space-y-4">
                    <div>
                      <label className="block text-[10px] text-jollof-label uppercase tracking-wider mb-1 flex items-center gap-1"><Sun size={10} /> Lighting</label>
                      <p className="text-xs text-jollof-subtext leading-snug">{selectedPanel.lighting}</p>
                    </div>
                    {selectedPanel.props.length > 0 && (
                      <div>
                        <label className="block text-[10px] text-jollof-label uppercase tracking-wider mb-1 flex items-center gap-1"><Package size={10} /> Props</label>
                        <div className="space-y-0.5">
                          {selectedPanel.props.map((prop) => (
                            <div key={prop} className="text-xs text-jollof-subtext flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-jollof-orange inline-block shrink-0" />{prop}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedPanel.continuityNote && (
                      <div>
                        <label className="block text-[10px] text-jollof-label uppercase tracking-wider mb-1 flex items-center gap-1"><AlertTriangle size={10} className="text-amber-400" /> Continuity Note</label>
                        <p className="text-xs text-amber-300/80 bg-amber-500/5 border border-amber-500/20 rounded p-2 leading-snug">{selectedPanel.continuityNote}</p>
                      </div>
                    )}
                    {selectedPanel.notes && (
                      <div>
                        <label className="block text-[10px] text-jollof-label uppercase tracking-wider mb-1">Director Notes</label>
                        <p className="text-xs text-jollof-subtext leading-snug">{selectedPanel.notes}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] text-jollof-label uppercase tracking-wider mb-1">Reference Images</label>
                      <div className="grid grid-cols-2 gap-1">
                        {[0, 1].map((i) => (
                          <div key={i} className="aspect-video rounded bg-jollof-surface border border-dashed border-jollof-border flex items-center justify-center">
                            <span className="text-[9px] text-jollof-label">+ Add Ref</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Page structure */}
          <div className={`${mobilePanel === "structure" ? "flex" : "hidden"} lg:flex flex-col w-full lg:w-48 shrink-0 border-l border-jollof-border overflow-y-auto items-center lg:items-stretch`}>
            <div className="p-3 border-b border-jollof-border shrink-0 w-full">
              <h3 className="text-xs font-semibold text-jollof-subtext uppercase tracking-wider">Page Structure</h3>
              <p className="text-[10px] text-jollof-label">Page 1 of 5</p>
            </div>
            <div className="p-2 space-y-1 overflow-y-auto jp-mobile-panel lg:max-w-none">
              {panels.map((panel, i) => (
                <div
                  key={panel.id}
                  onClick={() => { setSelectedPanel(panel); setMobilePanel("detail"); }}
                  className={`rounded p-2 cursor-pointer transition-colors min-h-[52px] ${selectedPanel.id === panel.id ? "bg-jollof-orange/10 border border-jollof-orange/30" : "hover:bg-jollof-panel/40"}`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold text-jollof-text">P{panel.panelNumber}</span>
                    <span className="text-[9px] text-jollof-label truncate">{panel.shotType.split(" ").slice(-1)[0]}</span>
                  </div>
                  <div className="w-full h-8 rounded-sm bg-jollof-surface border border-jollof-border flex items-center justify-center">
                    <span className="text-[8px] text-jollof-label">{i % 3 === 0 ? "⬛⬛" : i % 3 === 1 ? "⬛⬛⬛" : "⬜"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lock Page Modal */}
      <Modal open={lockOpen} onClose={() => setLockOpen(false)} title="Lock Page 19" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">Locking this page prevents further panel edits without entering a revision flow. This action is intentional and logged.</p>
          </div>
          <p className="text-xs text-jollof-subtext">Lock Page 19? All {panels.length} panels will be locked.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={handleLockPage}>Lock Page</Button>
            <Button variant="secondary" className="justify-center" onClick={() => setLockOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Add Panel Modal */}
      <Modal open={addPanelOpen} onClose={() => setAddPanelOpen(false)} title="Add Panel" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Shot Type</label>
            <select className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-3 text-sm text-jollof-text focus:outline-none">
              <option>Wide Establishing Shot</option><option>Medium Shot</option><option>Close-Up</option>
              <option>Insert / Detail Shot</option><option>Full Page Spread</option><option>Over-the-Shoulder</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Environment / Setting</label>
            <input placeholder="Describe the visual environment..." className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-3 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40" />
          </div>
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Dialogue / Caption</label>
            <input placeholder="Optional dialogue or caption..." className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-3 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40" />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={handleAddPanel}>Add Panel</Button>
            <Button variant="secondary" className="justify-center" onClick={() => setAddPanelOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
