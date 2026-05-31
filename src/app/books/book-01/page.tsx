"use client";
import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/lib/toast";
import { MOCK_BOOKS, MOCK_SCENES, MOCK_CONTINUITY_FLAGS } from "@/lib/mock/jollof-data";
import {
  BookOpen, AlertTriangle, CheckCircle, Download, Edit,
  ChevronRight, Flag, Shield, FileText, TrendingUp
} from "lucide-react";

export default function BookDashboardPage() {
  const { toast } = useToast();
  const book = MOCK_BOOKS[0];
  const [editOpen, setEditOpen] = useState(false);
  const handleExport = () => toast("Export report queued.", "info");

  const pageRangePct = Math.round((book.pagesApproved / book.pagesPlanned) * 100);

  return (
    <AppShell>
      <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 xl:px-10 w-full">

        {/* Breadcrumb */}
        <div className="flex items-center justify-center gap-2 text-xs text-jollof-label mb-4">
          <Link href="/series" className="hover:text-jollof-orange transition-colors">Equanauts</Link>
          <ChevronRight size={12} />
          <span className="text-jollof-subtext">Book 1</span>
        </div>

        <div className="text-center mb-5">
          <div className="text-jollof-orange font-bold text-xs uppercase tracking-widest mb-0.5">Book / Issue Dashboard</div>
          <h1 className="text-2xl sm:text-3xl font-black text-jollof-text mb-1">Book 1: The Collapse Conjecture</h1>
          <p className="text-sm text-jollof-subtext">Track one issue from scenes to pages to continuity.</p>
        </div>

        {/* Book header */}
        <div className="jollof-card p-4 sm:p-5 mb-5 text-center">
          <div className="flex flex-col items-center xl:flex-row xl:items-start gap-4">
            <div className="w-14 h-18 rounded-md bg-gradient-to-b from-amber-900/60 to-jollof-surface border border-jollof-border shrink-0 flex items-center justify-center self-center">
              <BookOpen size={20} className="text-jollof-orange/40" />
            </div>
            <div className="flex-1 min-w-0 text-center xl:text-left">
              <div className="flex flex-wrap items-center justify-center xl:justify-start gap-2 mb-1">
                <StatusBadge status={book.status} label="In Production" />
                <StatusBadge status="active" label="Series: Equanauts" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-jollof-text mb-1">{book.title}</h2>
              <p className="text-sm text-jollof-subtext leading-relaxed">{book.summary}</p>
            </div>
            <div className="flex flex-col sm:flex-row xl:flex-col gap-2 shrink-0 w-full sm:w-auto">
              <Button variant="outline" icon={Download} size="sm" className="w-full sm:w-auto justify-center" onClick={handleExport}>Export</Button>
              <Button variant="secondary" icon={Edit} size="sm" className="w-full sm:w-auto justify-center" onClick={() => setEditOpen(true)}>Edit</Button>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          {[
            { label: "Story Progress", value: `${book.storyProgress}%`, color: "text-jollof-orange", sub: "47% approved" },
            { label: "Pages Planned", value: book.pagesPlanned, color: "text-jollof-text", sub: "10% coverage" },
            { label: "Continuity", value: `${book.continuityHealth}%`, color: "text-green-400", sub: "1 critical flag" },
            { label: "Review Items", value: book.reviewStatus, color: "text-amber-400", sub: "Open" },
            { label: "Production", value: book.productionStatus, color: "text-green-400", sub: `Due: ${book.dueDate}` },
          ].map((m) => (
            <div key={m.label} className="jollof-card p-3">
              <div className="text-[10px] text-jollof-label uppercase tracking-wider mb-1">{m.label}</div>
              <div className={`text-lg sm:text-xl font-bold ${m.color}`}>{m.value}</div>
              <div className="text-[10px] text-jollof-label">{m.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Scenes list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="jollof-card">
              <div className="flex items-center justify-between p-4 border-b border-jollof-border">
                <h3 className="text-sm font-semibold text-jollof-text">Scenes</h3>
                <span className="text-xs text-jollof-label">{book.scenesApproved}/{book.scenesTotal} approved</span>
              </div>
              <div className="divide-y divide-jollof-border">
                {MOCK_SCENES.map((scene) => (
                  <div key={scene.id} className="px-4 py-3 flex items-start gap-3 hover:bg-jollof-panel/40 transition-colors">
                    <div className="w-7 h-7 rounded bg-jollof-surface border border-jollof-border shrink-0 flex items-center justify-center mt-0.5">
                      <FileText size={11} className="text-jollof-label" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <Link href={scene.id === "scene-03" ? "/scenes/scene-03" : "#"} className="text-sm font-medium text-jollof-text hover:text-jollof-orange transition-colors">
                          {scene.title}
                        </Link>
                        <StatusBadge status={scene.status} />
                        {scene.continuityFlags > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] text-red-400">
                            <Flag size={9} />{scene.continuityFlags}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-jollof-label">
                        <span>pp. {scene.pageRange}</span>
                        {scene.wordCount > 0 && <span>{scene.wordCount.toLocaleString()}w</span>}
                      </div>
                    </div>
                    <div className="shrink-0 mt-0.5">
                      {scene.status === "approved" && <CheckCircle size={14} className="text-green-400" />}
                      {scene.status === "flagged" && <AlertTriangle size={14} className="text-red-400" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Page coverage */}
            <div className="jollof-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-jollof-text">Page Range Coverage</h3>
                <Link href="/pages" className="text-xs text-jollof-orange hover:underline">Page Planner</Link>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-jollof-label">{book.pagesApproved} approved of {book.pagesPlanned}</span>
                <span className="ml-auto text-xs font-semibold text-jollof-orange">{pageRangePct}%</span>
              </div>
              <ProgressBar value={pageRangePct} height="h-2.5" color="bg-jollof-orange" />
              <div className="grid grid-cols-8 sm:grid-cols-16 gap-1 mt-3">
                {[...Array(16)].map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-sm ${i < 9 ? "bg-green-500" : i < 12 ? "bg-amber-500/60" : "bg-jollof-border"}`} />
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-[10px] text-jollof-label">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500 inline-block" />Approved</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500/60 inline-block" />Draft</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-jollof-border inline-block" />Unassigned</span>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Continuity alerts */}
            <div className="jollof-card">
              <div className="p-4 border-b border-jollof-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-jollof-text">Continuity Alerts</h3>
                <Link href="/review" className="text-xs text-jollof-orange hover:underline">View all</Link>
              </div>
              <div className="divide-y divide-jollof-border">
                {MOCK_CONTINUITY_FLAGS.slice(0, 4).map((flag) => (
                  <div key={flag.id} className="px-4 py-3 flex items-start gap-2">
                    <AlertTriangle size={13} className={`mt-0.5 shrink-0 ${flag.severity === "critical" ? "text-red-400" : "text-amber-400"}`} />
                    <p className="text-xs text-jollof-subtext leading-snug">{flag.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Readiness tasks */}
            <div className="jollof-card p-4">
              <h3 className="text-sm font-semibold text-jollof-text mb-3">Upcoming & Readiness</h3>
              <div className="space-y-2.5">
                {[
                  { label: "Approve Scene 03 draft", icon: AlertTriangle, color: "text-amber-400" },
                  { label: "Run continuity — Scenes 04–05", icon: Shield, color: "text-blue-400" },
                  { label: "Confirm 8 canon suggestions", icon: Shield, color: "text-jollof-orange" },
                  { label: "Panel review: Pages 19–22", icon: FileText, color: "text-amber-400" },
                  { label: "Scene 01 · Approved", icon: CheckCircle, color: "text-green-400", done: true },
                ].map((task, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <task.icon size={12} className={`shrink-0 ${task.color}`} />
                    <span className={`text-xs ${task.done ? "text-jollof-label line-through" : "text-jollof-subtext"} leading-snug`}>{task.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="space-y-3">
              {[
                { icon: TrendingUp, title: "Track the Whole Issue", desc: "See story progress, page coverage, and production at a glance." },
                { icon: Shield, title: "Stay Continuity-Aware", desc: "Surface critical blockers before they become costly." },
              ].map((c) => (
                <div key={c.title} className="jollof-panel p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <c.icon size={13} className="text-jollof-orange" />
                    <span className="text-xs font-semibold text-jollof-text">{c.title}</span>
                  </div>
                  <p className="text-[11px] text-jollof-subtext leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Book Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Book Details">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Book Title</label>
            <input defaultValue={book.title} className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-3 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40" />
          </div>
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Summary</label>
            <textarea defaultValue={book.summary} rows={4} className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-2 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40 resize-none" />
          </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Pages Planned</label>
              <input type="number" defaultValue={book.pagesPlanned} className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-3 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40" />
            </div>
            <div>
              <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Due Date</label>
              <input defaultValue={book.dueDate} className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-3 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={() => { toast("Book details updated.", "success"); setEditOpen(false); }}>Save Changes</Button>
            <Button variant="secondary" className="justify-center" onClick={() => setEditOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
