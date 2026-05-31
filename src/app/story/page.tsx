"use client";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/lib/toast";
import { MOCK_ACTS, MOCK_SCENES } from "@/lib/mock/jollof-data";
import {
  Plus, ChevronDown, Save, Users,
  MapPin, Cpu
} from "lucide-react";

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

  const handleSaveScene = () => toast("Scene saved (prototype only).", "success");
  const handleAddScene = () => { toast("New scene added to Act 2.", "success"); setAddSceneOpen(false); };

  const tabContent: Record<string, React.ReactNode> = {
    world: (
      <div className="flex flex-col gap-3 p-4">
        <h4 className="text-xs font-semibold text-jollof-subtext uppercase tracking-wider">World Entries</h4>
        {["Lagos Drift Zone", "Drift Corridor 7", "The Sovereign Threshold", "RHYFT Command Tower", "Collapse Field Perimeter"].map((loc) => (
          <div key={loc} className="jollof-panel px-3 py-2 flex items-center gap-2">
            <MapPin size={12} className="text-jollof-orange shrink-0" />
            <span className="text-sm text-jollof-text">{loc}</span>
          </div>
        ))}
      </div>
    ),
    characters: (
      <div className="flex flex-col gap-3 p-4">
        <h4 className="text-xs font-semibold text-jollof-subtext uppercase tracking-wider">Active Characters</h4>
        {["Zane Jaja · Protagonist", "Kira Selene · Scout", "Director Amara · Antagonist", "Ori · Unknown", "Council Elder · Mentor"].map((c) => (
          <div key={c} className="jollof-panel px-3 py-2 flex items-center gap-2">
            <Users size={12} className="text-jollof-orange shrink-0" />
            <span className="text-sm text-jollof-text">{c}</span>
          </div>
        ))}
      </div>
    ),
    outlines: (
      <div className="p-4">
        <h4 className="text-xs font-semibold text-jollof-subtext uppercase tracking-wider mb-3">Series Outline</h4>
        <div className="space-y-2">
          {["Book 1: The Collapse Conjecture — 6 acts, 14 scenes", "Book 2: Drift Zone Uprising — outline phase", "Book 3: The Sovereign Threshold — concept phase"].map((o) => (
            <div key={o} className="jollof-panel px-3 py-2.5">
              <p className="text-xs text-jollof-subtext">{o}</p>
            </div>
          ))}
        </div>
      </div>
    ),
    timelines: (
      <div className="p-4">
        <h4 className="text-xs font-semibold text-jollof-subtext uppercase tracking-wider mb-3">Narrative Timeline</h4>
        <div className="relative pl-4 border-l border-jollof-border space-y-4">
          {[
            { label: "Y-30: The Collapse Event", note: "Global gravitational disaster" },
            { label: "Y-3: Lagos Collapse", note: "Zane witnesses it. Formative event." },
            { label: "Y-0 (Book 1 Start): Anomaly detected", note: "Zane's scanner picks up new signal." },
            { label: "Book 1, Scene 03: Collapse Engine found", note: "RHYFT confirmed." },
          ].map((t) => (
            <div key={t.label} className="relative">
              <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-jollof-orange border border-jollof-dark" />
              <p className="text-xs font-semibold text-jollof-text">{t.label}</p>
              <p className="text-[11px] text-jollof-subtext">{t.note}</p>
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
        <div className="px-6 py-5 border-b border-jollof-border bg-[#0f0d08]/50">
          <div className="flex items-center justify-between mb-1">
            <div>
              <div className="text-jollof-orange font-bold text-xs uppercase tracking-widest mb-0.5">Story Room · Drift Zones · Book 1</div>
              <h1 className="text-2xl font-black text-jollof-text">Story Room</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Button variant="secondary" icon={ChevronDown} size="sm" onClick={() => setViewOptions(!viewOptions)}>
                  View Options
                </Button>
                {viewOptions && (
                  <div className="absolute right-0 top-9 bg-jollof-panel border border-jollof-border rounded-lg shadow-xl z-10 min-w-40">
                    {["Board View", "List View", "Timeline View", "Outline View"].map((v) => (
                      <button key={v} className="block w-full text-left px-3 py-2 text-xs text-jollof-subtext hover:text-jollof-text hover:bg-jollof-surface transition-colors" onClick={() => { toast(`Switched to ${v}`, "info"); setViewOptions(false); }}>
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
        <div className="px-6 bg-[#0f0d08]/30">
          <Tabs tabs={MAIN_TABS} active={activeTab} onChange={setActiveTab} />
        </div>

        {/* Content area */}
        {activeTab === "story" ? (
          <div className="flex flex-1 overflow-hidden">
            {/* Act structure column */}
            <div className="w-52 shrink-0 border-r border-jollof-border overflow-y-auto bg-[#0f0d08]/30">
              <div className="p-3 border-b border-jollof-border flex items-center justify-between">
                <h3 className="text-xs font-semibold text-jollof-subtext uppercase tracking-wider">Act Structure</h3>
                <button onClick={() => toast("Add Act (prototype)", "info")} className="text-jollof-label hover:text-jollof-orange">
                  <Plus size={13} />
                </button>
              </div>
              <div className="p-2 space-y-1">
                {MOCK_ACTS.map((act) => (
                  <div key={act.id} className="rounded-md p-2 hover:bg-jollof-panel/60 transition-colors cursor-pointer">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${act.status === "approved" ? "bg-green-400" : act.status === "in_progress" ? "bg-amber-400" : "bg-jollof-border"}`} />
                      <span className="text-xs font-medium text-jollof-text leading-snug">{act.title}</span>
                    </div>
                    <div className="text-[10px] text-jollof-label pl-3">Pages {act.pages}</div>
                    <div className="mt-1 pl-3">
                      <div className="h-0.5 bg-jollof-border rounded-full overflow-hidden">
                        <div className="h-full bg-jollof-orange" style={{ width: `${act.progress}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={() => toast("Add Act (prototype)", "info")} className="w-full text-xs text-jollof-label hover:text-jollof-orange border border-dashed border-jollof-border rounded-md py-2 mt-2 transition-colors">
                  + Add Act
                </button>
              </div>
            </div>

            {/* Scene board */}
            <div className="flex-1 overflow-y-auto border-r border-jollof-border bg-[#0a0800]/20">
              <div className="p-3 border-b border-jollof-border flex items-center justify-between">
                <h3 className="text-xs font-semibold text-jollof-subtext uppercase tracking-wider">Scenes</h3>
                <button onClick={() => setAddSceneOpen(true)} className="text-xs text-jollof-orange hover:underline flex items-center gap-1">
                  <Plus size={12} /> Add Scene
                </button>
              </div>
              <div className="p-2 space-y-1">
                {MOCK_SCENES.map((scene) => (
                  <div
                    key={scene.id}
                    onClick={() => setSelectedScene(scene)}
                    className={`jollof-panel p-3 cursor-pointer hover:border-jollof-orange/30 transition-all ${selectedScene.id === scene.id ? "border-jollof-orange/50 bg-jollof-orange/5" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-jollof-text leading-snug">{scene.title}</span>
                      <StatusBadge status={scene.status} className="shrink-0" />
                    </div>
                    <p className="text-[11px] text-jollof-subtext leading-snug mb-1.5 line-clamp-2">{scene.beat}</p>
                    <div className="flex items-center gap-2 text-[10px] text-jollof-label">
                      <span>Pages {scene.pageRange}</span>
                      {scene.characters.length > 0 && <span>{scene.characters.length} chars</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected scene detail */}
            {selectedScene && (
              <div className="w-72 shrink-0 overflow-y-auto">
                <div className="p-4 border-b border-jollof-border flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-jollof-subtext uppercase tracking-wider">Scene Detail</h3>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-jollof-label">{selectedScene.id.replace("scene-", "Scene ")}</span>
                    <button className="text-jollof-label hover:text-jollof-orange"><ChevronDown size={12} /></button>
                  </div>
                </div>
                <div className="p-4 space-y-4">
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

                  <Button variant="primary" icon={Save} size="sm" className="w-full justify-center" onClick={handleSaveScene}>
                    Save Scene
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {tabContent[activeTab] ?? (
              <div className="p-8 text-center text-jollof-label text-sm">Select a tab to view content.</div>
            )}
          </div>
        )}
      </div>

      {/* Add Scene Modal */}
      <Modal open={addSceneOpen} onClose={() => setAddSceneOpen(false)} title="Add New Scene">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Scene Title</label>
            <input placeholder="e.g. The Ambush at Corridor 7" className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-2 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40" />
          </div>
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Act</label>
            <select className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-2 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40">
              {MOCK_ACTS.map((a) => <option key={a.id}>{a.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Beat / Goal</label>
            <textarea rows={3} placeholder="What is the purpose of this scene?" className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-2 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40 resize-none" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="primary" className="flex-1" onClick={handleAddScene}>Add Scene</Button>
            <Button variant="secondary" onClick={() => setAddSceneOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
