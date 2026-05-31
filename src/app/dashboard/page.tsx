"use client";
import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useToast } from "@/lib/toast";
import { MOCK_RECENT_SERIES } from "@/lib/mock/jollof-data";
import { Plus, Upload, ArrowRight, BookOpen, Shield, Flag, Zap, Clock, TrendingUp } from "lucide-react";

export default function HomePage() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState("");
  const [importPath, setImportPath] = useState("");

  const handleCreate = () => {
    if (!newSeriesName.trim()) return;
    toast(`Series "${newSeriesName}" created. Story OS integration pending.`, "success");
    setCreateOpen(false);
    setNewSeriesName("");
  };

  const handleImport = () => {
    toast("Story OS import queued. Integration pending.", "info");
    setImportOpen(false);
    setImportPath("");
  };

  const statusBorderColors: Record<string, string> = {
    active: "border-l-2 border-l-jollof-orange",
    draft: "border-l-2 border-l-amber-600",
    review: "border-l-2 border-l-purple-500",
  };

  return (
    <AppShell>
      <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 xl:px-10 w-full">

        {/* Page header */}
        <div className="mb-6 text-center">
          <div className="text-jollof-orange font-bold text-xs uppercase tracking-widest mb-1">Jollof Pages</div>
          <h1 className="text-2xl sm:text-3xl font-black text-jollof-text mb-1">Home / Project Launcher</h1>
          <p className="text-sm text-jollof-subtext">Start or resume work across serialized graphic novel projects.</p>
        </div>

        {/* Welcome banner */}
        <div className="jollof-card p-4 sm:p-5 mb-6 text-center">
          <p className="text-xs text-jollof-label mb-1">Pick up where you left off or launch a new series.</p>
          <h2 className="text-base sm:text-lg font-bold text-jollof-text mb-4">Welcome back!</h2>
          <div className="flex flex-col sm:flex-row justify-center gap-2">
            <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)} className="w-full sm:w-auto justify-center">
              Create New Series
            </Button>
            <Button variant="outline" icon={Upload} onClick={() => setImportOpen(true)} className="w-full sm:w-auto justify-center">
              Import Story OS
            </Button>
          </div>
        </div>

        {/* Recent series */}
        <div className="mb-8">
          <div className="flex flex-col xl:flex-row items-center justify-center xl:justify-between gap-2 mb-3 text-center xl:text-left">
            <h3 className="text-sm font-semibold text-jollof-text">Recent Series</h3>
            <Link href="/series" className="text-xs text-jollof-orange hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {MOCK_RECENT_SERIES.map((series) => (
              <Link key={series.id} href={series.id === "series-equanauts" ? "/series" : "#"} className="w-full">
                <div className={`jollof-card p-4 hover:border-jollof-orange/30 transition-all cursor-pointer group ${statusBorderColors[series.status] ?? ""}`}>
                  <div className="w-full h-24 sm:h-28 rounded-md bg-gradient-to-br from-amber-950 to-jollof-surface border border-jollof-border mb-3 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <BookOpen size={24} className="text-jollof-orange/30" />
                    <div className="absolute bottom-2 left-3">
                      <StatusBadge status={series.status} />
                    </div>
                    {series.flags > 0 && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-500/20 border border-red-500/30 rounded px-1.5 py-0.5">
                        <Flag size={10} className="text-red-400" />
                        <span className="text-[10px] text-red-400">{series.flags}</span>
                      </div>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-jollof-text group-hover:text-jollof-orange transition-colors">{series.title}</h4>
                  <p className="text-xs text-jollof-subtext mb-2">{series.subtitle}</p>
                  <ProgressBar value={series.progress} showLabel height="h-1" />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-jollof-label flex items-center gap-1">
                      <Clock size={9} /> {series.lastOpened}
                    </span>
                    <span className="text-[10px] text-jollof-orange font-medium">Open →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-jollof-text mb-3 text-center">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
            {[
              { label: "Go to Canon", href: "/canon", icon: Shield },
              { label: "Open Story Bible", href: "/story", icon: BookOpen },
              { label: "Review Queue", href: "/review", icon: Flag },
              { label: "Production Export", href: "/export", icon: Zap },
            ].map((action) => (
              <Link key={action.label} href={action.href} className="w-full">
                <div className="jollof-panel p-3 sm:p-3.5 flex items-center gap-2.5 hover:border-jollof-orange/30 hover:bg-jollof-muted/30 transition-all cursor-pointer group min-h-[52px]">
                  <action.icon size={16} className="text-jollof-orange shrink-0" />
                  <span className="text-xs text-jollof-subtext group-hover:text-jollof-text transition-colors leading-snug">{action.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            { icon: Zap, title: "Quick Access", desc: "Launch new series, import packages, or jump straight into your recent work." },
            { icon: TrendingUp, title: "Recent Work at a Glance", desc: "See your latest projects, progress, open flags, and where you left off." },
            { icon: ArrowRight, title: "Start Working Fast", desc: "One click opens your project and takes you exactly where you left off." },
          ].map((card) => (
            <div key={card.title} className="jollof-panel p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-jollof-orange/10 border border-jollof-orange/20 flex items-center justify-center shrink-0">
                  <card.icon size={14} className="text-jollof-orange" />
                </div>
                <span className="text-xs font-semibold text-jollof-text">{card.title}</span>
              </div>
              <p className="text-xs text-jollof-subtext leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Create Series Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Series">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Series Title</label>
            <input value={newSeriesName} onChange={(e) => setNewSeriesName(e.target.value)} placeholder="e.g. Equanauts, The Drift Cycles..." className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-3 text-sm text-jollof-text placeholder:text-jollof-label focus:outline-none focus:border-jollof-orange/40" />
          </div>
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Genre / Type</label>
            <select className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-3 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40">
              <option>Sci-Fi</option><option>Fantasy</option><option>Afrofuturism</option><option>Thriller</option><option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Target Books</label>
            <input type="number" defaultValue={3} min={1} className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-3 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40" />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={handleCreate}>Create Series</Button>
            <Button variant="secondary" className="flex-1 justify-center sm:flex-none" onClick={() => setCreateOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Import Story OS Modal */}
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Import Story OS">
        <div className="space-y-4">
          <p className="text-xs text-jollof-subtext">Import an existing Story OS JSON package. The system will validate structure and load series, books, scenes, canon, and tracker data.</p>
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Story OS Package Path</label>
            <input value={importPath} onChange={(e) => setImportPath(e.target.value)} placeholder="./story-os/ or drag and drop..." className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-3 text-sm text-jollof-text placeholder:text-jollof-label focus:outline-none focus:border-jollof-orange/40" />
          </div>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
            <p className="text-xs text-amber-400">Story OS write integration is pending. This import will load data into the prototype UI only.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={handleImport}>Import Package</Button>
            <Button variant="secondary" className="flex-1 justify-center sm:flex-none" onClick={() => setImportOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
