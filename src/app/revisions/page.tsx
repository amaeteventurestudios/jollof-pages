"use client";
import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/lib/toast";
import { MOCK_REVISION_IMPACTS } from "@/lib/mock/jollof-data";
import {
  AlertTriangle, CheckCircle, RotateCcw, Flag, Shield,
  FileText, Layers, ChevronRight, ArrowRight, Info
} from "lucide-react";

export default function RevisionsPage() {
  const { toast } = useToast();
  const revision = MOCK_REVISION_IMPACTS[0];
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    setConfirmed(true);
    setConfirmOpen(false);
    toast("Revision confirmed. Downstream staleness markers applied (prototype only).", "success");
  };

  const handleSendToReview = () => {
    toast("Revision impact sent to Review Queue.", "info");
  };

  return (
    <AppShell>
      <div className="p-6 max-w-5xl">
        <div className="text-jollof-orange font-bold text-xs uppercase tracking-widest mb-0.5">Revision Impact View</div>
        <h1 className="text-2xl font-black text-jollof-text mb-0.5">Revision Impact View</h1>
        <p className="text-sm text-jollof-subtext mb-5">See what breaks when a canon, scene, character, or panel changes.</p>

        {/* Status banner */}
        {confirmed && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-5 flex items-center gap-3">
            <CheckCircle size={18} className="text-green-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-400">Revision Confirmed</p>
              <p className="text-xs text-green-400/70">Downstream staleness markers applied. Affected scenes and panels are now marked stale.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Changed object panel */}
          <div className="space-y-4">
            <div className="jollof-card">
              <div className="p-4 border-b border-jollof-border">
                <h3 className="text-sm font-semibold text-jollof-text">Changed Object</h3>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <span className="text-[10px] text-jollof-label uppercase tracking-wider">Type</span>
                  <p className="text-sm font-medium text-jollof-text capitalize mt-0.5">{revision.changedObject.type}</p>
                </div>
                <div>
                  <span className="text-[10px] text-jollof-label uppercase tracking-wider">Object</span>
                  <p className="text-sm font-medium text-jollof-orange mt-0.5">{revision.changedObject.title}</p>
                </div>
                <div>
                  <span className="text-[10px] text-jollof-label uppercase tracking-wider">Field Changed</span>
                  <p className="text-sm text-jollof-subtext mt-0.5">{revision.changedObject.field}</p>
                </div>

                {/* Before/after */}
                <div className="space-y-2">
                  <div className="jollof-surface border border-red-500/20 rounded-lg p-2.5">
                    <span className="text-[10px] text-red-400 uppercase tracking-wider block mb-1">Before</span>
                    <p className="text-xs text-jollof-subtext">{revision.changedObject.before}</p>
                  </div>
                  <div className="flex justify-center"><ArrowRight size={14} className="text-jollof-label" /></div>
                  <div className="jollof-surface border border-green-500/20 rounded-lg p-2.5">
                    <span className="text-[10px] text-green-400 uppercase tracking-wider block mb-1">After</span>
                    <p className="text-xs text-jollof-subtext">{revision.changedObject.after}</p>
                  </div>
                </div>

                <div className="pt-1">
                  <span className="text-[10px] text-jollof-label">Triggered by:</span>
                  <p className="text-xs text-jollof-subtext">{revision.triggeredBy}</p>
                </div>
                <StatusBadge status="warning" label="Pending Confirmation" className="w-full justify-center" />
              </div>
            </div>
          </div>

          {/* Impact columns */}
          <div className="lg:col-span-2 space-y-4">
            {/* Impacted scenes */}
            <div className="jollof-card">
              <div className="p-4 border-b border-jollof-border flex items-center gap-2">
                <FileText size={14} className="text-amber-400" />
                <h3 className="text-sm font-semibold text-jollof-text">Impacted Scenes</h3>
                <span className="ml-auto text-xs text-jollof-label">{revision.impactedScenes.length}</span>
              </div>
              <div className="divide-y divide-jollof-border">
                {revision.impactedScenes.map((scene) => (
                  <div key={scene.id} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <AlertTriangle size={12} className={scene.severity === "critical" ? "text-red-400" : "text-amber-400"} />
                      <Link href="/scenes/scene-03" className="text-sm font-medium text-jollof-text hover:text-jollof-orange transition-colors">
                        {scene.title}
                      </Link>
                      <StatusBadge status={scene.severity} className="ml-auto text-[9px]" />
                    </div>
                    <p className="text-xs text-jollof-subtext pl-5">{scene.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Impacted pages + panels */}
            <div className="grid grid-cols-2 gap-4">
              <div className="jollof-card">
                <div className="p-4 border-b border-jollof-border flex items-center gap-2">
                  <FileText size={14} className="text-purple-400" />
                  <h3 className="text-sm font-semibold text-jollof-text">Impacted Pages</h3>
                </div>
                <div className="divide-y divide-jollof-border">
                  {revision.impactedPages.map((page) => (
                    <div key={page.id} className="px-4 py-2.5 flex items-center justify-between">
                      <Link href="/pages" className="text-xs text-jollof-text hover:text-jollof-orange transition-colors">{page.label}</Link>
                      <StatusBadge status={page.severity} className="text-[9px]" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="jollof-card">
                <div className="p-4 border-b border-jollof-border flex items-center gap-2">
                  <Layers size={14} className="text-blue-400" />
                  <h3 className="text-sm font-semibold text-jollof-text">Impacted Panels</h3>
                </div>
                <div className="divide-y divide-jollof-border">
                  {revision.impactedPanels.map((panel) => (
                    <div key={panel.id} className="px-4 py-2.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <Link href="/panels" className="text-xs text-jollof-text hover:text-jollof-orange transition-colors">{panel.label}</Link>
                        <StatusBadge status={panel.severity} className="text-[9px]" />
                      </div>
                      <p className="text-[10px] text-jollof-label">{panel.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Impacted canon */}
            <div className="jollof-card">
              <div className="p-4 border-b border-jollof-border flex items-center gap-2">
                <Shield size={14} className="text-jollof-orange" />
                <h3 className="text-sm font-semibold text-jollof-text">Impacted Canon Entries</h3>
              </div>
              <div className="divide-y divide-jollof-border">
                {revision.impactedCanon.map((canon) => (
                  <div key={canon.id} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Info size={12} className="text-blue-400" />
                      <Link href="/canon" className="text-sm font-medium text-jollof-text hover:text-jollof-orange transition-colors">
                        {canon.title}
                      </Link>
                      <StatusBadge status={canon.severity} className="ml-auto text-[9px]" />
                    </div>
                    <p className="text-xs text-jollof-subtext pl-5">{canon.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Dependency chain visualization */}
            <div className="jollof-card p-4">
              <h3 className="text-sm font-semibold text-jollof-text mb-3">Dependency Chain</h3>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {[
                  { label: "Collapse Engine (Canon)", color: "text-jollof-orange" },
                  { label: "→", color: "text-jollof-label" },
                  { label: "Scene 03 (Draft)", color: "text-amber-400" },
                  { label: "→", color: "text-jollof-label" },
                  { label: "Page 19–20", color: "text-purple-400" },
                  { label: "→", color: "text-jollof-label" },
                  { label: "Panel 4", color: "text-blue-400" },
                ].map((node, i) => (
                  <span key={i} className={`font-medium ${node.color}`}>{node.label}</span>
                ))}
              </div>
              <div className="mt-3">
                {[
                  { label: "Scene 05 (Flagged)", color: "text-red-400" },
                ].map((node) => (
                  <div key={node.label} className="flex items-center gap-2 text-xs text-jollof-label">
                    <ChevronRight size={12} />
                    <span className={`font-medium ${node.color}`}>{node.label}</span>
                    <span className="text-jollof-label">— dialogue uses old radius parameters</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="primary"
                icon={CheckCircle}
                onClick={() => setConfirmOpen(true)}
                disabled={confirmed}
              >
                {confirmed ? "Revision Confirmed ✓" : "Confirm Revision"}
              </Button>
              <Button variant="secondary" icon={Flag} onClick={handleSendToReview}>
                Send to Review Queue
              </Button>
              <Link href="/series">
                <Button variant="ghost" icon={RotateCcw}>Cancel</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Revision Modal */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm Revision" size="sm">
        <div className="space-y-4">
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">
              Confirming this revision will mark downstream scenes, pages, and panels as stale. Agents will need to re-validate affected content before re-approval.
            </p>
          </div>
          <p className="text-xs text-jollof-subtext">This action is logged and cannot be undone without another explicit revision flow.</p>
          <div className="flex gap-2">
            <Button variant="primary" className="flex-1" onClick={handleConfirm}>Confirm Revision</Button>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
