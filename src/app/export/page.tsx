"use client";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/lib/toast";
import { MOCK_EXPORT_PACKAGE } from "@/lib/mock/jollof-data";
import {
  Download, CheckCircle, AlertTriangle,
  ChevronRight, Eye, Folder, File as FileIcon
} from "lucide-react";

const STEPS = ["Select Content", "Review", "Validate", "Export"];

export default function ExportPage() {
  const { toast } = useToast();
  const pkg = MOCK_EXPORT_PACKAGE;
  const [step, setStep] = useState(0);
  const [successOpen, setSuccessOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState("book-01");
  const [checklist, setChecklist] = useState({
    approvedScenes: true,
    approvedPages: true,
    approvedPanels: true,
    canonFiles: true,
    characterStates: true,
    continuityReport: true,
    revisionLog: true,
    artReferences: true,
  });

  const hasCritical = pkg.validationSummary.critical > 0;

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  };
  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  const handleExport = () => {
    if (hasCritical) {
      toast("Export blocked: critical validation issues must be resolved first.", "error");
      return;
    }
    setSuccessOpen(true);
    toast("Package exported successfully!", "success");
  };

  const treeStatusColor = (status: string) => {
    if (status === "approved") return "text-green-400";
    if (status === "warning") return "text-amber-400";
    if (status === "draft") return "text-amber-400";
    return "text-jollof-label";
  };

  return (
    <AppShell>
      <div className="p-6 max-w-6xl">
        <div className="text-jollof-orange font-bold text-xs uppercase tracking-widest mb-0.5">Production Export</div>
        <h1 className="text-2xl font-black text-jollof-text mb-0.5">Production Export</h1>
        <p className="text-sm text-jollof-subtext mb-5">Package approved book materials for art production handoff.</p>

        {/* Step indicator */}
        <div className="jollof-card p-4 mb-6">
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium ${i === step ? "bg-jollof-orange text-black" : i < step ? "text-green-400" : "text-jollof-label"}`}>
                  {i < step ? <CheckCircle size={13} /> : <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[9px]">{i + 1}</span>}
                  {s}
                </div>
                {i < STEPS.length - 1 && <ChevronRight size={14} className="text-jollof-border mx-1" />}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Step 0: Select Content */}
            {step === 0 && (
              <div className="jollof-card">
                <div className="p-4 border-b border-jollof-border">
                  <h3 className="text-sm font-semibold text-jollof-text">Select Content</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Select Book</label>
                    <select
                      value={selectedBook}
                      onChange={(e) => setSelectedBook(e.target.value)}
                      className="bg-jollof-surface border border-jollof-border rounded-lg px-3 py-2 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40"
                    >
                      <option value="book-01">Book 1: The Collapse Conjecture</option>
                      <option value="book-02">Book 2: Drift Zone Uprising</option>
                    </select>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-jollof-subtext mb-2">Export Checklist</h4>
                    <div className="space-y-2">
                      {(Object.keys(checklist) as (keyof typeof checklist)[]).map((key) => {
                        const labels: Record<keyof typeof checklist, string> = {
                          approvedScenes: `Approved Scenes (${pkg.manifest.approvedScenes}/${pkg.manifest.totalScenes})`,
                          approvedPages: `Approved Pages (${pkg.manifest.approvedPages}/${pkg.manifest.totalPages})`,
                          approvedPanels: `Approved Panels (${pkg.manifest.approvedPanels})`,
                          canonFiles: `Canon Files (${pkg.manifest.canonFiles.length} files)`,
                          characterStates: `Character States (${pkg.manifest.characterStates.length} chars)`,
                          continuityReport: "Continuity Report",
                          revisionLog: "Revision Log",
                          artReferences: `Art References (${pkg.manifest.artReferences.length} files)`,
                        };
                        return (
                          <label key={key} className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checklist[key]}
                              onChange={(e) => setChecklist((prev) => ({ ...prev, [key]: e.target.checked }))}
                              className="w-4 h-4 accent-jollof-orange"
                            />
                            <span className="text-sm text-jollof-subtext">{labels[key]}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Review */}
            {step === 1 && (
              <div className="jollof-card">
                <div className="p-4 border-b border-jollof-border">
                  <h3 className="text-sm font-semibold text-jollof-text">Review Package Contents</h3>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-xs text-jollof-subtext">Review what will be included in the export package.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Approved Scenes", value: `${pkg.manifest.approvedScenes}/${pkg.manifest.totalScenes}`, ok: true },
                      { label: "Approved Pages", value: `${pkg.manifest.approvedPages}/${pkg.manifest.totalPages}`, ok: pkg.manifest.approvedPages === pkg.manifest.totalPages },
                      { label: "Canon Files", value: pkg.manifest.canonFiles.length, ok: true },
                      { label: "Character States", value: pkg.manifest.characterStates.length, ok: true },
                    ].map((row) => (
                      <div key={row.label} className="jollof-panel p-3">
                        <p className="text-[10px] text-jollof-label mb-1">{row.label}</p>
                        <div className="flex items-center gap-1.5">
                          {row.ok ? <CheckCircle size={12} className="text-green-400" /> : <AlertTriangle size={12} className="text-amber-400" />}
                          <span className="text-sm font-semibold text-jollof-text">{row.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Validate */}
            {step === 2 && (
              <div className="jollof-card">
                <div className="p-4 border-b border-jollof-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-jollof-text">Validation Summary</h3>
                  <span className="text-xs text-jollof-label">Last run: {new Date(pkg.validationSummary.lastRun).toLocaleString()}</span>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="jollof-panel p-3 text-center">
                      <div className="text-2xl font-bold text-red-400">{pkg.validationSummary.critical}</div>
                      <div className="text-[10px] text-jollof-label">Critical</div>
                    </div>
                    <div className="jollof-panel p-3 text-center">
                      <div className="text-2xl font-bold text-amber-400">{pkg.validationSummary.warnings}</div>
                      <div className="text-[10px] text-jollof-label">Warnings</div>
                    </div>
                    <div className="jollof-panel p-3 text-center">
                      <div className="text-2xl font-bold text-green-400">{pkg.validationSummary.passed}</div>
                      <div className="text-[10px] text-jollof-label">Passed</div>
                    </div>
                  </div>

                  {hasCritical && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
                      <AlertTriangle size={15} className="text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-red-400">Export Blocked</p>
                        <p className="text-xs text-red-400/70">Resolve {pkg.validationSummary.critical} critical issue(s) before exporting.</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {[
                      { check: "Scene continuity validation", status: "warning", note: "2 scenes have continuity flags" },
                      { check: "Canon consistency check", status: "passed", note: "All confirmed canon entries consistent" },
                      { check: "Page range coverage", status: "warning", note: "Scenes 04–14 unassigned" },
                      { check: "Panel review status", status: "critical", note: "12 panels awaiting approval" },
                      { check: "Character state validation", status: "passed", note: "All visual states confirmed" },
                      { check: "Revision log integrity", status: "passed", note: "No stale revisions pending" },
                    ].map((row) => (
                      <div key={row.check} className="flex items-center gap-2 text-xs">
                        {row.status === "passed" ? <CheckCircle size={12} className="text-green-400 shrink-0" /> :
                          row.status === "warning" ? <AlertTriangle size={12} className="text-amber-400 shrink-0" /> :
                            <AlertTriangle size={12} className="text-red-400 shrink-0" />}
                        <span className="flex-1 text-jollof-text">{row.check}</span>
                        <span className="text-jollof-label">{row.note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Export */}
            {step === 3 && (
              <div className="jollof-card">
                <div className="p-4 border-b border-jollof-border">
                  <h3 className="text-sm font-semibold text-jollof-text">Export Package</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-jollof-subtext mb-2">Export Format</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {["Story OS JSON", "PDF Report", "Art Package ZIP"].map((fmt) => (
                        <label key={fmt} className="flex items-center gap-2 jollof-panel p-2 cursor-pointer hover:border-jollof-orange/30 transition-colors">
                          <input type="checkbox" defaultChecked className="accent-jollof-orange w-3.5 h-3.5" />
                          <span className="text-xs text-jollof-subtext">{fmt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-jollof-subtext mb-2">Export Destination</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {["Local Download", "Google Drive", "Dropbox", "Story OS Path"].map((dest) => (
                        <label key={dest} className="flex items-center gap-2 jollof-panel p-2 cursor-pointer hover:border-jollof-orange/30 transition-colors">
                          <input type="radio" name="dest" className="accent-jollof-orange w-3.5 h-3.5" />
                          <span className="text-xs text-jollof-subtext">{dest}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    icon={Download}
                    className="w-full justify-center"
                    onClick={handleExport}
                    disabled={hasCritical}
                  >
                    {hasCritical ? "Export Blocked — Fix Critical Issues" : "Export Package"}
                  </Button>
                  {hasCritical && (
                    <p className="text-xs text-red-400 text-center">Resolve critical validation issues before exporting.</p>
                  )}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button variant="secondary" onClick={handleBack} disabled={step === 0}>Back</Button>
              {step < STEPS.length - 1 && (
                <Button variant="primary" icon={ChevronRight} onClick={handleNext}>Next: {STEPS[step + 1]}</Button>
              )}
            </div>
          </div>

          {/* Package preview tree */}
          <div>
            <div className="jollof-card">
              <div className="p-4 border-b border-jollof-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-jollof-text">Package Preview</h3>
                <Eye size={14} className="text-jollof-label" />
              </div>
              <div className="p-3">
                <div className="space-y-0.5">
                  {pkg.packageTree.map((node, i) => (
                    <div key={i} className={`flex items-center gap-1.5 text-[11px] ${treeStatusColor(node.status ?? "")} ${node.type === "dir" ? "font-medium" : ""}`}>
                      {node.type === "dir" ? (
                        <Folder size={11} className="text-jollof-orange shrink-0" />
                      ) : (
                        <FileIcon size={11} className="shrink-0" />
                      )}
                      <span className="truncate">{node.path.split("/").pop()}</span>
                      {"warning" in node && node.warning && <AlertTriangle size={9} className="text-amber-400 shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Validation summary card */}
            <div className="jollof-card mt-4 p-4">
              <h3 className="text-xs font-semibold text-jollof-subtext mb-3 uppercase tracking-wider">Validation Status</h3>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-red-400">Critical</span>
                  <span className="font-bold text-red-400">{pkg.validationSummary.critical}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-amber-400">Warnings</span>
                  <span className="font-bold text-amber-400">{pkg.validationSummary.warnings}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-green-400">Passed</span>
                  <span className="font-bold text-green-400">{pkg.validationSummary.passed}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <Modal open={successOpen} onClose={() => setSuccessOpen(false)} title="Export Complete" size="sm">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-400/10 border border-green-400/20 flex items-center justify-center mx-auto">
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-jollof-text">Package Exported!</h3>
            <p className="text-sm text-jollof-subtext mt-1">Book 1: The Collapse Conjecture has been packaged and exported successfully.</p>
          </div>
          <div className="jollof-panel p-3 text-left space-y-1">
            <p className="text-xs text-jollof-label">Package includes:</p>
            <p className="text-xs text-jollof-subtext">· 2 approved scenes · 87 pages · 34 panels</p>
            <p className="text-xs text-jollof-subtext">· Canon files · Character states · Continuity report</p>
          </div>
          <Button variant="primary" icon={Download} className="w-full justify-center" onClick={() => setSuccessOpen(false)}>
            Done
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
