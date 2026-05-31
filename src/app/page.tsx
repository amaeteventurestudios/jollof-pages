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
import {
  Plus, Upload, ArrowRight, BookOpen, Shield, Flag,
  Zap, Clock, TrendingUp
} from "lucide-react";

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

  const statusColors: Record<string, string> = {
    active: "border-l-2 border-l-jollof-orange",
    draft: "border-l-2 border-l-amber-600",
    review: "border-l-2 border-l-purple-500",
  };

  return (
    <AppShell>
      <div className="p-6 max-w-6xl">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-jollof-orange font-bold text-sm uppercase tracking-widest">Jollof Pages</span>
          </div>
          <h1 className="text-3xl font-black text-jollof-text mb-1">Home / Project Launcher</h1>
          <p className="text-sm text-jollof-subtext">Start or resume work across serialized graphic novel projects.</p>
        </div>

        {/* Welcome banner */}
        <div className="jollof-card p-5 mb-6 flex items-start justify-between gap-4 bg-jollof-radial">
          <div>
            <p className="text-xs text-jollof-label mb-1">
              This is where you left off. Pick up a new series or launch where you left off.
            </p>
            <h2 className="text-lg font-bold text-jollof-text">Welcome back!</h2>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>
              Create New Series
            </Button>
            <Button variant="outline" icon={Upload} onClick={() => setImportOpen(true)}>
              Import Story OS
            </Button>
          </div>
        </div>

        {/* Recent series */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-jollof-text">Recent Series</h3>
            <Link href="/series" className="text-xs text-jollof-orange hover:underline flex items-center gap-1">
              View all series <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MOCK_RECENT_SERIES.map((series) => (
              <Link key={series.id} href={series.id === "series-equanauts" ? "/series" : "#"}>
                <div className={`jollof-card p-4 hover:border-jollof-orange/30 transition-all cursor-pointer group ${statusColors[series.status] ?? ""}`}>
                  {/* Fake cover art area */}
                  <div className="w-full h-28 rounded-md bg-gradient-to-br from-amber-950 to-jollof-surface border border-jollof-border mb-3 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <BookOpen size={28} className="text-jollof-orange/30" />
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
          <h3 className="text-sm font-semibold text-jollof-text mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Go to Canon", href: "/canon", icon: Shield },
              { label: "Open Story Bible", href: "/story", icon: BookOpen },
              { label: "View Review Queue", href: "/review", icon: Flag },
              { label: "Production Export", href: "/export", icon: Zap },
            ].map((action) => (
              <Link key={action.label} href={action.href}>
                <div className="jollof-panel p-3 flex items-center gap-2.5 hover:border-jollof-orange/30 hover:bg-jollof-muted/30 transition-all cursor-pointer group">
                  <action.icon size={16} className="text-jollof-orange shrink-0" />
                  <span className="text-xs text-jollof-subtext group-hover:text-jollof-text transition-colors">{action.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: Zap,
              title: "Quick Access",
              desc: "Launch new series, import packages, or jump straight into your recent work.",
            },
            {
              icon: TrendingUp,
              title: "Recent Work at a Glance",
              desc: "See your latest projects, progress, open flags, and where you left off.",
            },
            {
              icon: ArrowRight,
              title: "Start Working Fast",
              desc: "One click opens your project and takes you exactly where you left off.",
            },
          ].map((card) => (
            <div key={card.title} className="jollof-panel p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-jollof-orange/10 border border-jollof-orange/20 flex items-center justify-center">
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
            <input
              value={newSeriesName}
              onChange={(e) => setNewSeriesName(e.target.value)}
              placeholder="e.g. Equanauts, The Drift Cycles..."
              className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-2 text-sm text-jollof-text placeholder:text-jollof-label focus:outline-none focus:border-jollof-orange/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Genre / Type</label>
            <select className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-2 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40">
              <option>Sci-Fi</option>
              <option>Fantasy</option>
              <option>Afrofuturism</option>
              <option>Thriller</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Target Books</label>
            <input
              type="number"
              defaultValue={3}
              min={1}
              className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-2 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="primary" className="flex-1" onClick={handleCreate}>Create Series</Button>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Import Story OS Modal */}
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Import Story OS">
        <div className="space-y-4">
          <p className="text-xs text-jollof-subtext">
            Import an existing Story OS JSON package. The system will validate structure and load series, books, scenes, canon, and tracker data.
          </p>
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Story OS Package Path</label>
            <input
              value={importPath}
              onChange={(e) => setImportPath(e.target.value)}
              placeholder="./story-os/ or drag and drop..."
              className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-2 text-sm text-jollof-text placeholder:text-jollof-label focus:outline-none focus:border-jollof-orange/40"
            />
          </div>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
            <p className="text-xs text-amber-400">
              Story OS write integration is pending. This import will load data into the prototype UI only. No real writes will occur yet.
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="primary" className="flex-1" onClick={handleImport}>Import Package</Button>
            <Button variant="secondary" onClick={() => setImportOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
