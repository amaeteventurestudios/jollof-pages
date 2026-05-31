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
  AlertTriangle, Users, MapPin, Activity, FileText, Eye
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
      <div className="p-5 max-w-6xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-jollof-label mb-3">
          <Link href="/story" className="hover:text-jollof-orange transition-colors">Story Room</Link>
          <ChevronRight size={12} />
          <Link href="/books/book-01" className="hover:text-jollof-orange transition-colors">Book 1</Link>
          <ChevronRight size={12} />
          <span className="text-jollof-subtext">Scene 03</span>
        </div>

        <div className="text-jollof-orange font-bold text-xs uppercase tracking-widest mb-0.5">Scene Workspace</div>
        <h1 className="text-2xl font-black text-jollof-text mb-1">Scene Workspace</h1>
        <p className="text-sm text-jollof-subtext mb-5">Draft, review, and approve one scene with canon and continuity in view.</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main writing area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Scene header */}
            <div className="jollof-card p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-base font-bold text-jollof-text">{scene.title}</h2>
                <StatusBadge status={status} />
                <div className="flex items-center gap-1 text-xs text-jollof-label ml-auto">
                  <Eye size={12} />
                  <span>{scene.wordCount} words</span>
                  <span className="mx-1">·</span>
                  <span>Pages {scene.pageRange}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
                <div>
                  <span className="text-jollof-label">Location</span>
                  <p className="text-jollof-subtext">{scene.location}</p>
                </div>
                <div>
                  <span className="text-jollof-label">Act</span>
                  <p className="text-jollof-subtext">Act 2 · Confrontation</p>
                </div>
                <div>
                  <span className="text-jollof-label">Last edited</span>
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
                  <span>Distraction-free mode</span>
                </div>
              </div>
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                rows={16}
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
            <div className="flex items-center gap-2">
              <Button variant="secondary" icon={Save} onClick={handleSave}>Save Draft</Button>
              <Button variant="danger" icon={RotateCcw} onClick={() => setRevisionOpen(true)}>Request Revision</Button>
              <Button
                variant="primary"
                icon={CheckCircle}
                onClick={handleApprove}
                disabled={status === "approved"}
                className="ml-auto"
              >
                {status === "approved" ? "Approved ✓" : "Approve Scene"}
              </Button>
            </div>
          </div>

          {/* Right panel */}
          <div className="space-y-4">
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
                <Button
                  variant="outline"
                  icon={Activity}
                  size="sm"
                  className="w-full justify-center"
                  onClick={handleContinuityCheck}
                  disabled={runningCheck}
                >
                  {runningCheck ? "Running..." : "Run Continuity Check"}
                </Button>
              </div>
            </div>

            {/* Canon references */}
            <div className="jollof-card">
              <div className="p-4 border-b border-jollof-border">
                <h3 className="text-sm font-semibold text-jollof-text">Canon References</h3>
              </div>
              <div className="p-3 space-y-1.5">
                {["Drift Physics", "Lagos Drift Zone", "RHYFT", "Collapse Engine"].map((entry) => (
                  <Link key={entry} href="/canon" className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-jollof-panel transition-colors">
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
              <div className="p-3 space-y-1.5">
                {scene.characters.map((c) => (
                  <Link key={c} href={c === "Zane Jaja" ? "/characters/zane-jaja" : "#"} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-jollof-panel transition-colors">
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
                <Link href="/canon" className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-jollof-panel transition-colors">
                  <MapPin size={11} className="text-jollof-orange shrink-0" />
                  <span className="text-xs text-jollof-subtext hover:text-jollof-text">{scene.location}</span>
                </Link>
              </div>
            </div>

            {/* Info */}
            <div className="jollof-panel p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={13} className="text-jollof-orange" />
                <span className="text-xs font-semibold text-jollof-text">Clear Approval Flow</span>
              </div>
              <p className="text-[11px] text-jollof-subtext">Fix continuity, resolve changes, and approve scenes to keep your story production moving.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Request Revision Modal */}
      <Modal open={revisionOpen} onClose={() => setRevisionOpen(false)} title="Request Revision">
        <div className="space-y-4">
          <p className="text-xs text-jollof-subtext">Describe what needs to change in this scene. This will queue the scene for revision and notify the team.</p>
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Revision Note</label>
            <textarea
              value={revisionNote}
              onChange={(e) => setRevisionNote(e.target.value)}
              rows={4}
              placeholder="e.g. Zane's access to the Inner Ring needs to be established earlier..."
              className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-2 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Priority</label>
            <select className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-2 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40">
              <option>Critical — blocks production</option>
              <option>High — needs fix before approval</option>
              <option>Normal — fix in next pass</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="danger" className="flex-1" onClick={handleRevision}>Submit Revision Request</Button>
            <Button variant="secondary" onClick={() => setRevisionOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
