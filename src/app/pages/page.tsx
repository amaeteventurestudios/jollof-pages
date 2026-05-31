"use client";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useToast } from "@/lib/toast";
import { MOCK_PAGES, MOCK_SCENE_PAGE_ASSIGNMENTS, MOCK_SCENES } from "@/lib/mock/jollof-data";
import {
  Save, Zap, ChevronUp, ChevronDown, AlertTriangle,
  LayoutGrid, RefreshCw, FileText
} from "lucide-react";

export default function PagePlannerPage() {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState(MOCK_SCENE_PAGE_ASSIGNMENTS);
  const [selectedSceneId, setSelectedSceneId] = useState("scene-03");
  const [targetPanels, setTargetPanels] = useState(42);
  const [pageRangeStart, setPageRangeStart] = useState(19);
  const [pageRangeEnd, setPageRangeEnd] = useState(28);

  const handleApply = () => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.sceneId === selectedSceneId
          ? { ...a, pageStart: pageRangeStart, pageEnd: pageRangeEnd, targetPanels }
          : a
      )
    );
    toast("Page plan changes applied (prototype only).", "success");
  };

  const handleSave = () => toast("Page plan saved (prototype only).", "success");
  const handleAutoBalance = () => toast("Auto-balance pacing applied — pages redistributed.", "success");

  const totalPages = 128;
  const assignedPages = assignments.reduce((acc, a) => acc + (a.pageEnd - a.pageStart + 1), 0);
  const estimatedPanels = (pageRangeEnd - pageRangeStart + 1) * Math.round(targetPanels / (pageRangeEnd - pageRangeStart + 1 || 1));

  return (
    <AppShell>
      <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 xl:px-10 w-full">

        <div className="text-center sm:text-left mb-5">
          <div className="text-jollof-orange font-bold text-xs uppercase tracking-widest mb-0.5">Page Planner</div>
          <h1 className="text-xl sm:text-2xl font-black text-jollof-text mb-0.5">Page Planner</h1>
          <p className="text-sm text-jollof-subtext">Assign scenes to page ranges and shape the issue visual rhythm.</p>
        </div>

        {/* Book selector + actions */}
        <div className="jollof-card p-4 mb-5">
          <div className="flex flex-col xl:flex-row xl:items-center gap-3 items-center text-center xl:text-left">
            <div className="flex-1 min-w-0">
              <label className="block text-xs text-jollof-label mb-1">Book</label>
              <select className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-2.5 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40">
                <option>Book 1: The Collapse Conjecture</option>
                <option>Book 2: Drift Zone Uprising</option>
              </select>
            </div>
            <div className="flex items-center justify-center gap-3 text-xs text-jollof-subtext flex-wrap">
              <span><LayoutGrid size={11} className="inline mr-1 text-jollof-orange" />Total: <strong className="text-jollof-text">{totalPages}</strong></span>
              <span>Assigned: <strong className="text-jollof-text">{assignedPages}</strong></span>
              <span>Left: <strong className="text-amber-400">{totalPages - assignedPages}</strong></span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto justify-center">
              <Button variant="secondary" icon={RefreshCw} size="sm" onClick={handleAutoBalance} className="flex-1 sm:flex-none justify-center">
                <span className="hidden sm:inline">Auto-Balance</span>
                <span className="sm:hidden">Balance</span>
              </Button>
              <Button variant="primary" icon={Save} size="sm" onClick={handleSave} className="flex-1 sm:flex-none justify-center">Save</Button>
            </div>
          </div>
        </div>

        {/* Page map */}
        <div className="jollof-card p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-jollof-text">Page Map</h3>
            <span className="text-xs text-jollof-label">Total: {totalPages} pages</span>
          </div>
          <div className="grid grid-cols-10 sm:grid-cols-16 gap-1">
            {MOCK_PAGES.map((page) => (
              <div
                key={page.id}
                title={`Page ${page.number} · ${page.status}`}
                className={`aspect-square rounded text-[8px] font-medium flex items-center justify-center cursor-pointer transition-all hover:scale-110 ${
                  page.status === "approved" ? "bg-green-500/80 text-white" :
                  page.status === "draft" ? "bg-amber-500/80 text-white" : "bg-jollof-border text-jollof-label"
                }`}
              >
                {page.number}
              </div>
            ))}
            {[...Array(totalPages - MOCK_PAGES.length)].map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square rounded bg-jollof-border/30 text-[8px] text-jollof-border flex items-center justify-center">
                {MOCK_PAGES.length + i + 1}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-[10px] text-jollof-label">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500/80 inline-block" />Approved</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500/80 inline-block" />Draft</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-jollof-border inline-block" />Unassigned</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Scene assignment table */}
          <div className="lg:col-span-1">
            <div className="jollof-card">
              <div className="p-4 border-b border-jollof-border">
                <h3 className="text-sm font-semibold text-jollof-text">Scene Assignment</h3>
              </div>
              <div className="divide-y divide-jollof-border overflow-y-auto max-h-80 lg:max-h-none">
                {assignments.map((a) => (
                  <div
                    key={a.sceneId}
                    onClick={() => setSelectedSceneId(a.sceneId)}
                    className={`px-4 py-3 cursor-pointer hover:bg-jollof-panel/40 transition-colors min-h-[60px] ${selectedSceneId === a.sceneId ? "bg-jollof-orange/5 border-l-2 border-l-jollof-orange" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      <FileText size={12} className="text-jollof-label shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-xs font-medium text-jollof-text truncate">{a.sceneTitle}</span>
                          <StatusBadge status={a.status} className="text-[9px] shrink-0" />
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-jollof-label flex-wrap">
                          <span>pp. {a.pageStart}–{a.pageEnd}</span>
                          <span>{a.targetPanels} panels</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: math controls + pacing health */}
          <div className="lg:col-span-2 space-y-4">
            {/* Page math controls */}
            <div className="jollof-card">
              <div className="p-4 border-b border-jollof-border">
                <h3 className="text-sm font-semibold text-jollof-text">Page Math & Controls</h3>
                <p className="text-xs text-jollof-label mt-0.5">
                  {MOCK_SCENES.find((s) => s.id === selectedSceneId)?.title ?? "Select a scene"}
                </p>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs text-jollof-label mb-1.5">Scene</label>
                  <select
                    value={selectedSceneId}
                    onChange={(e) => setSelectedSceneId(e.target.value)}
                    className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-2.5 text-xs text-jollof-text focus:outline-none focus:border-jollof-orange/40"
                  >
                    {assignments.map((a) => (
                      <option key={a.sceneId} value={a.sceneId}>{a.sceneTitle}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-jollof-label mb-1.5">Start</label>
                    <div className="flex items-center gap-1">
                      <input type="number" value={pageRangeStart} onChange={(e) => setPageRangeStart(Number(e.target.value))} className="flex-1 w-0 bg-jollof-surface border border-jollof-border rounded px-2 py-2 text-xs text-jollof-text focus:outline-none focus:border-jollof-orange/40 text-center min-h-[44px]" />
                      <div className="flex flex-col">
                        <button onClick={() => setPageRangeStart((v) => v + 1)} className="text-jollof-label hover:text-jollof-orange p-1"><ChevronUp size={12} /></button>
                        <button onClick={() => setPageRangeStart((v) => Math.max(1, v - 1))} className="text-jollof-label hover:text-jollof-orange p-1"><ChevronDown size={12} /></button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-jollof-label mb-1.5">End</label>
                    <div className="flex items-center gap-1">
                      <input type="number" value={pageRangeEnd} onChange={(e) => setPageRangeEnd(Number(e.target.value))} className="flex-1 w-0 bg-jollof-surface border border-jollof-border rounded px-2 py-2 text-xs text-jollof-text focus:outline-none focus:border-jollof-orange/40 text-center min-h-[44px]" />
                      <div className="flex flex-col">
                        <button onClick={() => setPageRangeEnd((v) => v + 1)} className="text-jollof-label hover:text-jollof-orange p-1"><ChevronUp size={12} /></button>
                        <button onClick={() => setPageRangeEnd((v) => Math.max(pageRangeStart + 1, v - 1))} className="text-jollof-label hover:text-jollof-orange p-1"><ChevronDown size={12} /></button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-jollof-label mb-1.5">Target Panels</label>
                    <input type="number" value={targetPanels} onChange={(e) => setTargetPanels(Number(e.target.value))} className="w-full bg-jollof-surface border border-jollof-border rounded px-2 py-2 text-xs text-jollof-text focus:outline-none focus:border-jollof-orange/40 text-center min-h-[44px]" />
                  </div>
                </div>

                <div className="bg-jollof-surface border border-jollof-border rounded-lg p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-jollof-label">Pages in range</span>
                    <span className="text-jollof-text font-medium">{pageRangeEnd - pageRangeStart + 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-jollof-label">Estimated panels</span>
                    <span className="text-jollof-orange font-bold">{estimatedPanels}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-jollof-label">Avg per page</span>
                    <span className="text-jollof-text">{((pageRangeEnd - pageRangeStart + 1) > 0 ? (estimatedPanels / (pageRangeEnd - pageRangeStart + 1)).toFixed(1) : "—")}</span>
                  </div>
                </div>

                <Button variant="secondary" size="sm" className="w-full justify-center" onClick={handleApply}>Apply Changes to Plan</Button>
              </div>
            </div>

            {/* Pacing health */}
            <div className="jollof-card p-4">
              <h3 className="text-sm font-semibold text-jollof-text mb-3">Page & Pacing Health</h3>
              <div className="space-y-2.5">
                {[
                  { label: "Act 1 density", value: 85, status: "good" },
                  { label: "Act 2 density", value: 62, status: "warning" },
                  { label: "Act 3 density", value: 28, status: "low" },
                  { label: "Overall balance", value: 58, status: "warning" },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-jollof-subtext">{row.label}</span>
                      <span className={`text-[10px] ${row.status === "good" ? "text-green-400" : row.status === "warning" ? "text-amber-400" : "text-jollof-label"}`}>{row.status}</span>
                    </div>
                    <ProgressBar value={row.value} height="h-1.5" />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-start gap-1.5 text-xs text-amber-400">
                <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                <span>Act 3 is underplanned. Consider expanding scene count before locking page count.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-5">
          {[
            { icon: Zap, title: "Balance Pacing Across Pages", desc: "Visualize page density and rebalance scenes to keep readers engaged." },
            { icon: FileText, title: "Precise Page Math", desc: "Set page ranges, control panel density, and prevent overflow before it happens." },
            { icon: AlertTriangle, title: "Turn Story into Page Structure", desc: "Convert approved scenes directly to pages and build your issue with clarity." },
          ].map((c) => (
            <div key={c.title} className="jollof-panel p-4">
              <div className="flex items-center gap-2 mb-2">
                <c.icon size={14} className="text-jollof-orange" />
                <span className="text-xs font-semibold text-jollof-text">{c.title}</span>
              </div>
              <p className="text-[11px] text-jollof-subtext">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
