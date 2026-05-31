"use client";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/lib/toast";
import { MOCK_ACTS, MOCK_SCENES } from "@/lib/mock/jollof-data";
import { Plus, ChevronDown, Save, Users, MapPin, Cpu } from "lucide-react";

const MAIN_TABS = [
  { id: "story", label: "Story Room" },
  { id: "world", label: "World" },
  { id: "characters", label: "Characters" },
  { id: "outlines", label: "Outlines" },
  { id: "timelines", label: "Timelines" },
];

export default function StoryRoomPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("story");
  const [selectedScene, setSelectedScene] = useState(MOCK_SCENES[2]);
  const [addSceneOpen, setAddSceneOpen] = useState(false);
  const [viewOptions, setViewOptions] = useState(false);
  // Mobile: which panel is active (acts | scenes | detail)
  const [mobilePanel, setMobilePanel] = useState<"acts" | "scenes" | "detail">("scenes");

  const handleSaveScene = () => toast("Scene saved (prototype only).", "success");
  const handleAddScene = () => { toast("New scene added to Act 2.", "success"); setAddSceneOpen(false); };

  const tabContent: Record<string, React.ReactNode> = {
    world: (
      <div className="p-4 space-y-2 w-full max-w-2xl mx-auto">
        <h4 className="text-xs font-semibold text-jollof-subtext uppercase tracking-wider mb-3">World Entries</h4>
        {["Lagos Drift Zone", "Drift Corridor 7", "The Sovereign Threshold", "RHYFT Command Tower", "Collapse Field Perimeter"].map((loc) => (
          <div key={loc} className="jollof-panel px-3 py-2.5 flex items-center gap-2 min-h-[44px]">
            <MapPin size={12} className="text-jollof-orange shrink-0" />
            <span className="text-sm text-jollof-text">{loc}</span>
          </div>
        ))}
      </div>
    ),
    characters: (
      <div className="p-4 space-y-2 w-full max-w-2xl mx-auto">
        <h4 className="text-xs font-semibold text-jollof-subtext uppercase tracking-wider mb-3">Active Characters</h4>
        {["Zane Jaja · Protagonist", "Kira Selene · Scout", "Director Amara · Antagonist", "Ori · Unknown", "Council Elder · Mentor"].map((c) => (
          <div key={c} className="jollof-panel px-3 py-2.5 flex items-center gap-2 min-h-[44px]">
            <Users size={12} className="text-jollof-orange shrink-0" />
            <span className="text-sm text-jollof-text">{c}</span>
          </div>
        ))}
      </div>
    ),
    outlines: (
      <div className="p-4 space-y-2 w-full max-w-2xl mx-auto">
        <h4 className="text-xs font-semibold text-jollof-subtext uppercase tracking-wider mb-3">Series Outline</h4>
        {["Book 1: The Collapse Conjecture — 6 acts, 14 scenes", "Book 2: Drift Zone Uprising — outline phase", "Book 3: The Sovereign Threshold — concept phase"].map((o) => (
          <div key={o} className="jollof-panel px-3 py-3"><p className="text-xs text-jollof-subtext">{o}</p></div>
        ))}
      </div>
    ),
    timelines: (
      <div className="p-4 w-full max-w-2xl mx-auto">
        <h4 className="text-xs font-semibold text-jollof-subtext uppercase tracking-wider mb-3">Narrative Timeline</h4>
        <div className="relative pl-4 border-l border-jollof-border space-y-5">
          {[
            { label: "Y-30: The Collapse Event", note: "Global gravitational disaster" },
            { label: "Y-3: Lagos Collapse", note: "Zane witnesses it. Formative event." },
            { label: "Y-0 (Book 1 Start): Anomaly detected", note: "Zane's scanner picks up new signal." },
            { label: "Book 1, Scene 03: Collapse Engine found", note: "RHYFT confirmed." },
          ].map((t) => (
            <div key={t.label} className="relative">
              <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-jollof-orange border border-jollof-dark" />
              <p className="text-xs font-semibold text-jollof-text">{t.label}</p>
              <p className="text-[11px] text-jollof-subtext mt-0.5">{t.note}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  };

  return (
    <AppShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-jollof-border bg-[#0f0d08]/50 shrink-0">
          <div className="flex flex-col items-center gap-3 text-center xl:flex-row xl:items-start xl:justify-between xl:text-left">
            <div className="text-center xl:text-left">
              <div className="text-jollof-orange font-bold text-xs uppercase tracking-widest mb-0.5">Story Room · Book 1</div>
              <h1 className="text-xl sm:text-2xl font-black text-jollof-text">Story Room</h1>
            </div>
            <div className="flex items-center justify-center gap-2 shrink-0">
              <div className="relative">
                <Button variant="secondary" icon={ChevronDown} size="sm" onClick={() => setViewOptions(!viewOptions)}>
                  <span className="hidden sm:inline">View Options</span>
                  <span className="sm:hidden">View</span>
                </Button>
                {viewOptions && (
                  <div className="absolute right-0 top-9 bg-jollof-panel border border-jollof-border rounded-lg shadow-xl z-10 min-w-36">
                    {["Board View", "List View", "Timeline View"].map((v) => (
                      <button key={v} className="block w-full text-left px-3 py-3 text-xs text-jollof-subtext hover:text-jollof-text hover:bg-jollof-surface transition-colors min-h-[44px]" onClick={() => { toast(`Switched to ${v}`, "info"); setViewOptions(false); }}>
                        {v}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button variant="primary" icon={Plus} size="sm" onClick={() => setAddSceneOpen(true)}>Add</Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-6 bg-[#0f0d08]/30 shrink-0">
          <Tabs tabs={MAIN_TABS} active={activeTab} onChange={setActiveTab} />
        </div>

        {/* Content */}
        {activeTab === "story" ? (
          <>
            {/* Mobile panel switcher */}
            <div className="lg:hidden flex justify-center border-b border-jollof-border shrink-0 overflow-x-auto scrollbar-none">
              {(["acts", "scenes", "detail"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setMobilePanel(p)}
                  className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap min-h-[44px] border-b-2 -mb-px capitalize transition-colors ${mobilePanel === p ? "border-jollof-orange text-jollof-orange" : "border-transparent text-jollof-subtext"}`}
                >
                  {p === "acts" ? "Acts" : p === "scenes" ? "Scenes" : "Scene Detail"}
                </button>
              ))}
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Act structure — desktop: always visible; mobile: conditional */}
              <div className={`${mobilePanel === "acts" ? "flex" : "hidden"} lg:flex w-full lg:w-52 shrink-0 border-r border-jollof-border overflow-y-auto bg-[#0f0d08]/30 flex-col items-center lg:items-stretch`}>
                <div className="p-3 border-b border-jollof-border flex items-center justify-between w-full">
                  <h3 className="text-xs font-semibold text-jollof-subtext uppercase tracking-wider">Act Structure</h3>
                  <button onClick={() => toast("Add Act (prototype)", "info")} className="text-jollof-label hover:text-jollof-orange p-1"><Plus size={13} /></button>
                </div>
                <div className="p-2 space-y-1 jp-mobile-panel lg:max-w-none">
                  {MOCK_ACTS.map((act) => (
                    <div key={act.id} className="rounded-md p-3 hover:bg-jollof-panel/60 transition-colors cursor-pointer min-h-[52px]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${act.status === "approved" ? "bg-green-400" : act.status === "in_progress" ? "bg-amber-400" : "bg-jollof-border"}`} />
                        <span className="text-xs font-medium text-jollof-text leading-snug">{act.title}</span>
                      </div>
                      <div className="text-[10px] text-jollof-label pl-3">Pages {act.pages}</div>
                      <div className="mt-1.5 pl-3">
                        <div className="h-0.5 bg-jollof-border rounded-full overflow-hidden">
                          <div className="h-full bg-jollof-orange" style={{ width: `${act.progress}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => toast("Add Act (prototype)", "info")} className="w-full text-xs text-jollof-label hover:text-jollof-orange border border-dashed border-jollof-border rounded-md py-3 mt-1 transition-colors min-h-[44px]">
                    + Add Act
                  </button>
                </div>
              </div>

              {/* Scene board */}
              <div className={`${mobilePanel === "scenes" ? "flex" : "hidden"} lg:flex flex-col flex-1 overflow-y-auto border-r border-jollof-border bg-[#0a0800]/20 items-center lg:items-stretch`}>
                <div className="p-3 border-b border-jollof-border flex items-center justify-between shrink-0 w-full">
                  <h3 className="text-xs font-semibold text-jollof-subtext uppercase tracking-wider">Scenes</h3>
                  <button onClick={() => setAddSceneOpen(true)} className="text-xs text-jollof-orange flex items-center gap-1 p-1 min-h-[44px]">
                    <Plus size={12} /> Add Scene
                  </button>
                </div>
                <div className="p-2 space-y-1.5 overflow-y-auto jp-mobile-panel lg:max-w-none">
                  {MOCK_SCENES.map((scene) => (
                    <div
                      key={scene.id}
                      onClick={() => { setSelectedScene(scene); setMobilePanel("detail"); }}
                      className={`jollof-panel p-3 cursor-pointer hover:border-jollof-orange/30 transition-all min-h-[72px] ${selectedScene.id === scene.id ? "border-jollof-orange/50 bg-jollof-orange/5" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-jollof-text leading-snug">{scene.title}</span>
                        <StatusBadge status={scene.status} className="shrink-0" />
                      </div>
                      <p className="text-[11px] text-jollof-subtext leading-snug mb-1 line-clamp-2">{scene.beat}</p>
                      <div className="flex items-center gap-2 text-[10px] text-jollof-label">
                        <span>pp. {scene.pageRange}</span>
                        {scene.characters.length > 0 && <span>{scene.characters.length} chars</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scene detail */}
              <div className={`${mobilePanel === "detail" ? "flex" : "hidden"} lg:flex flex-col w-full lg:w-72 shrink-0 overflow-y-auto items-center lg:items-stretch`}>
                <div className="p-4 border-b border-jollof-border flex items-center justify-between shrink-0">
                  <h3 className="text-xs font-semibold text-jollof-subtext uppercase tracking-wider">Scene Detail</h3>
                  <button className="lg:hidden text-xs text-jollof-orange" onClick={() => setMobilePanel("scenes")}>← Back</button>
                </div>
                {selectedScene && (
                  <div className="p-4 space-y-4 overflow-y-auto jp-mobile-panel lg:max-w-none">
                    <div>
                      <h4 className="text-sm font-bold text-jollof-text">{selectedScene.title}</h4>
                      <StatusBadge status={selectedScene.status} className="mt-1" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-jollof-label uppercase tracking-wider mb-1">Beat / Goal</label>
                      <p className="text-xs text-jollof-subtext leading-snug">{selectedScene.beat}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] text-jollof-label uppercase tracking-wider mb-1">Characters</label>
                      <div className="flex flex-wrap gap-1">
                        {selectedScene.characters.map((c) => (
                          <span key={c} className="text-[10px] bg-jollof-surface border border-jollof-border px-1.5 py-0.5 rounded text-jollof-subtext">{c}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-jollof-label uppercase tracking-wider mb-1">Location</label>
                      <span className="text-xs text-jollof-subtext flex items-center gap-1">
                        <MapPin size={10} className="text-jollof-orange" /> {selectedScene.location}
                      </span>
                    </div>
                    <div>
                      <label className="block text-[10px] text-jollof-label uppercase tracking-wider mb-1">Threads</label>
                      <div className="space-y-1">
                        {["RHYFT Conspiracy", "Zane's Origin"].map((t) => (
                          <div key={t} className="text-[11px] text-jollof-subtext flex items-center gap-1">
                            <Cpu size={9} className="text-jollof-orange" /> {t}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-jollof-label uppercase tracking-wider mb-1">Notes</label>
                      <p className="text-[11px] text-jollof-subtext leading-snug">{selectedScene.notes ?? "No notes."}</p>
                    </div>
                    <Button variant="primary" icon={Save} size="sm" className="w-full justify-center" onClick={handleSaveScene}>Save Scene</Button>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {tabContent[activeTab] ?? <div className="p-8 text-center text-jollof-label text-sm">Select a tab to view content.</div>}
          </div>
        )}
      </div>

      {/* Add Scene Modal */}
      <Modal open={addSceneOpen} onClose={() => setAddSceneOpen(false)} title="Add New Scene">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Scene Title</label>
            <input placeholder="e.g. The Ambush at Corridor 7" className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-3 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40" />
          </div>
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Act</label>
            <select className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-3 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40">
              {MOCK_ACTS.map((a) => <option key={a.id}>{a.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Beat / Goal</label>
            <textarea rows={3} placeholder="What is the purpose of this scene?" className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-2 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40 resize-none" />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={handleAddScene}>Add Scene</Button>
            <Button variant="secondary" className="justify-center" onClick={() => setAddSceneOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
