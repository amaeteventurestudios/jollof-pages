"use client";
import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/lib/toast";
import { MOCK_SCENES, MOCK_CONTINUITY_FLAGS } from "@/lib/mock/jollof-data";
import {
  ChevronRight, Save, RotateCcw, CheckCircle, Shield,
  AlertTriangle, Users, MapPin, Activity, FileText, Eye, ChevronDown
} from "lucide-react";

export default function SceneWorkspacePage() {
  const { toast } = useToast();
  const scene = MOCK_SCENES.find((s) => s.id === "scene-03")!;
  const [draftText, setDraftText] = useState(scene.draft ?? "");
  const [notes, setNotes] = useState(scene.notes ?? "");
  const [status, setStatus] = useState(scene.status);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [continuityResult, setContinuityResult] = useState<null | "clean" | "flagged">(null);
  const [runningCheck, setRunningCheck] = useState(false);
  const [showSidePanels, setShowSidePanels] = useState(false);

  const handleSave = () => toast("Draft saved successfully.", "success");
  const handleApprove = () => {
    setStatus("approved");
    toast("Scene 03 approved. Canon and pages updated (prototype only).", "success");
  };
  const handleRevision = () => {
    toast(`Revision requested: "${revisionNote || "No note"}"`, "warning");
    setRevisionOpen(false);
    setRevisionNote("");
  };
  const handleContinuityCheck = async () => {
    setRunningCheck(true);
    setContinuityResult(null);
    await new Promise((r) => setTimeout(r, 1200));
    setRunningCheck(false);
    setContinuityResult("flagged");
    toast("Continuity check complete — 2 warnings found.", "warning");
  };

  const sceneFlags = MOCK_CONTINUITY_FLAGS.filter((f) => f.sceneId === "scene-03");

  return (
    <AppShell>
      <div className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8 xl:px-10 w-full">

        {/* Breadcrumb */}
        <div className="flex items-center justify-center gap-2 text-xs text-jollof-label mb-3 overflow-x-auto scrollbar-none whitespace-nowrap">
          <Link href="/story" className="hover:text-jollof-orange transition-colors shrink-0">Story Room</Link>
          <ChevronRight size={12} className="shrink-0" />
          <Link href="/books/book-01" className="hover:text-jollof-orange transition-colors shrink-0">Book 1</Link>
          <ChevronRight size={12} className="shrink-0" />
          <span className="text-jollof-subtext shrink-0">Scene 03</span>
        </div>

        <div className="text-center sm:text-left mb-4">
          <div className="text-jollof-orange font-bold text-xs uppercase tracking-widest mb-0.5">Scene Workspace</div>
          <h1 className="text-xl sm:text-2xl font-black text-jollof-text mb-0.5">Scene Workspace</h1>
          <p className="text-sm text-jollof-subtext">Draft, review, and approve one scene with canon and continuity in view.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Main writing area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Scene header */}
            <div className="jollof-card p-4 text-center xl:text-left">
              <div className="flex flex-wrap items-center justify-center xl:justify-start gap-2 mb-2">
                <h2 className="text-base font-bold text-jollof-text">{scene.title}</h2>
                <StatusBadge status={status} />
              </div>
              <div className="flex flex-wrap items-center justify-center xl:justify-start gap-1 text-xs text-jollof-label mb-3">
                <Eye size={11} />
                <span>{scene.wordCount} words · Pages {scene.pageRange}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-jollof-label block mb-0.5">Location</span>
                  <p className="text-jollof-subtext leading-snug">{scene.location}</p>
                </div>
                <div>
                  <span className="text-jollof-label block mb-0.5">Act</span>
                  <p className="text-jollof-subtext">Act 2 · Confrontation</p>
                </div>
                <div>
                  <span className="text-jollof-label block mb-0.5">Last edited</span>
                  <p className="text-jollof-subtext">{scene.lastEdited}</p>
                </div>
              </div>
            </div>

            {/* Draft editor */}
            <div className="jollof-card">
              <div className="flex items-center justify-between p-3 border-b border-jollof-border">
                <span className="text-xs font-semibold text-jollof-subtext uppercase tracking-wider">Scene Draft</span>
                <div className="flex items-center gap-1 text-xs text-jollof-label">
                  <FileText size={11} />
                  <span className="hidden sm:inline">Distraction-free</span>
                </div>
              </div>
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                rows={14}
                className="w-full bg-transparent p-4 text-sm text-jollof-text placeholder:text-jollof-label focus:outline-none resize-none font-mono leading-relaxed"
                placeholder="Start writing your scene draft here..."
              />
            </div>

            {/* Notes */}
            <div className="jollof-card p-4">
              <label className="block text-xs font-semibold text-jollof-subtext uppercase tracking-wider mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-2 text-sm text-jollof-text placeholder:text-jollof-label focus:outline-none focus:border-jollof-orange/40 resize-none"
                placeholder="Continuity notes, visual direction, character reminders..."
              />
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-center">
              <Button variant="secondary" icon={Save} onClick={handleSave} className="w-full sm:w-auto justify-center">Save Draft</Button>
              <Button variant="danger" icon={RotateCcw} onClick={() => setRevisionOpen(true)} className="w-full sm:w-auto justify-center">Request Revision</Button>
              <Button
                variant="primary"
                icon={CheckCircle}
                onClick={handleApprove}
                disabled={status === "approved"}
                className="w-full sm:w-auto justify-center"
              >
                {status === "approved" ? "Approved ✓" : "Approve Scene"}
              </Button>
            </div>

            {/* Mobile: toggle for side panels */}
            <button
              className="lg:hidden w-full flex items-center justify-between px-4 py-3 jollof-panel text-xs text-jollof-subtext"
              onClick={() => setShowSidePanels(!showSidePanels)}
            >
              <span>Continuity, Canon & References</span>
              <ChevronDown size={14} className={`transition-transform ${showSidePanels ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Right panels */}
          <div className={`space-y-4 ${showSidePanels ? "block" : "hidden"} lg:block`}>
            {/* Continuity check */}
            <div className="jollof-card">
              <div className="p-4 border-b border-jollof-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-jollof-text">Continuity Check</h3>
                <Shield size={14} className="text-jollof-orange" />
              </div>
              <div className="p-4 space-y-3">
                {continuityResult === null && !runningCheck && (
                  <p className="text-xs text-jollof-subtext">Run the continuity check to validate this scene against canon and prior scenes.</p>
                )}
                {runningCheck && (
                  <div className="flex items-center gap-2 text-xs text-amber-400">
                    <Activity size={13} className="animate-spin" />
                    <span>Agent 3 running check...</span>
                  </div>
                )}
                {continuityResult === "flagged" && (
                  <div className="space-y-2">
                    {sceneFlags.map((flag) => (
                      <div key={flag.id} className={`flex items-start gap-2 text-xs p-2 rounded border ${flag.severity === "critical" ? "border-red-500/20 bg-red-500/5 text-red-400" : "border-amber-500/20 bg-amber-500/5 text-amber-400"}`}>
                        <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                        <span>{flag.description}</span>
                      </div>
                    ))}
                    <p className="text-[11px] text-jollof-label">Critical flags block approval.</p>
                  </div>
                )}
                <Button variant="outline" icon={Activity} size="sm" className="w-full justify-center" onClick={handleContinuityCheck} disabled={runningCheck}>
                  {runningCheck ? "Running..." : "Run Continuity Check"}
                </Button>
              </div>
            </div>

            {/* Canon references */}
            <div className="jollof-card">
              <div className="p-4 border-b border-jollof-border">
                <h3 className="text-sm font-semibold text-jollof-text">Canon References</h3>
              </div>
              <div className="p-3 space-y-0.5">
                {["Drift Physics", "Lagos Drift Zone", "RHYFT", "Collapse Engine"].map((entry) => (
                  <Link key={entry} href="/canon" className="flex items-center gap-2 px-2 py-2.5 rounded hover:bg-jollof-panel transition-colors min-h-[44px]">
                    <Shield size={11} className="text-jollof-orange shrink-0" />
                    <span className="text-xs text-jollof-subtext hover:text-jollof-text transition-colors">{entry}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Linked characters */}
            <div className="jollof-card">
              <div className="p-4 border-b border-jollof-border">
                <h3 className="text-sm font-semibold text-jollof-text">Linked Characters</h3>
              </div>
              <div className="p-3 space-y-0.5">
                {scene.characters.map((c) => (
                  <Link key={c} href={c === "Zane Jaja" ? "/characters/zane-jaja" : "#"} className="flex items-center gap-2 px-2 py-2.5 rounded hover:bg-jollof-panel transition-colors min-h-[44px]">
                    <Users size={11} className="text-jollof-orange shrink-0" />
                    <span className="text-xs text-jollof-subtext hover:text-jollof-text transition-colors">{c}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Linked locations */}
            <div className="jollof-card">
              <div className="p-4 border-b border-jollof-border">
                <h3 className="text-sm font-semibold text-jollof-text">Linked Locations</h3>
              </div>
              <div className="p-3">
                <Link href="/canon" className="flex items-center gap-2 px-2 py-2.5 rounded hover:bg-jollof-panel transition-colors min-h-[44px]">
                  <MapPin size={11} className="text-jollof-orange shrink-0" />
                  <span className="text-xs text-jollof-subtext hover:text-jollof-text">{scene.location}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Request Revision Modal */}
      <Modal open={revisionOpen} onClose={() => setRevisionOpen(false)} title="Request Revision">
        <div className="space-y-4">
          <p className="text-xs text-jollof-subtext">Describe what needs to change in this scene.</p>
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Revision Note</label>
            <textarea value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)} rows={4} placeholder="e.g. Zane's access to the Inner Ring needs to be established earlier..." className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-2 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Priority</label>
            <select className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-3 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40">
              <option>Critical — blocks production</option>
              <option>High — needs fix before approval</option>
              <option>Normal — fix in next pass</option>
            </select>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button variant="danger" className="flex-1 justify-center" onClick={handleRevision}>Submit Revision Request</Button>
            <Button variant="secondary" className="justify-center" onClick={() => setRevisionOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
