"use client";
import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useToast } from "@/lib/toast";
import { MOCK_SERIES, MOCK_BOOKS, MOCK_ACTIVITY_FEED } from "@/lib/mock/jollof-data";
import {
  BookOpen, Shield, ClipboardList, Flag, TrendingUp,
  Zap, Activity, ChevronRight, AlertTriangle, CheckCircle, Clock, ExternalLink
} from "lucide-react";

export default function SeriesPage() {
  const { toast } = useToast();
  const [lastHealthCheck, setLastHealthCheck] = useState("Never");

  const handleHealthCheck = () => {
    setLastHealthCheck(new Date().toLocaleTimeString());
    toast("Health check complete — 2 warnings, 0 critical issues found.", "success");
  };

  const activityIcons: Record<string, React.ReactNode> = {
    draft: <BookOpen size={12} className="text-amber-400" />,
    approved: <CheckCircle size={12} className="text-green-400" />,
    canon: <Shield size={12} className="text-jollof-orange" />,
    check: <Activity size={12} className="text-blue-400" />,
    pages: <ClipboardList size={12} className="text-purple-400" />,
  };

  return (
    <AppShell>
      <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 xl:px-10 w-full">

        {/* Page header */}
        <div className="mb-5 text-center">
          <div className="text-jollof-orange font-bold text-xs uppercase tracking-widest mb-1">Series · Equanauts</div>
          <h1 className="text-2xl sm:text-3xl font-black text-jollof-text mb-1">Series Command Center</h1>
          <p className="text-sm text-jollof-subtext">See the health of the entire graphic novel series at a glance.</p>
        </div>

        {/* Series header card */}
        <div className="jollof-card p-4 sm:p-5 mb-5 text-center">
          <div className="flex flex-col xl:flex-row xl:items-center gap-4 items-center">
            <div className="w-14 h-18 sm:w-16 sm:h-20 rounded-md bg-gradient-to-b from-amber-900/60 to-jollof-surface border border-jollof-border shrink-0 flex items-center justify-center self-center">
              <BookOpen size={20} className="text-jollof-orange/50" />
            </div>
            <div className="flex-1 min-w-0 text-center xl:text-left">
              <div className="flex flex-wrap items-center justify-center xl:justify-start gap-2 mb-1">
                <h2 className="text-lg sm:text-xl font-bold text-jollof-text">{MOCK_SERIES.title}</h2>
                <StatusBadge status={MOCK_SERIES.status} label="Active Series" />
              </div>
              <p className="text-sm text-jollof-subtext mb-1">{MOCK_SERIES.tagline}</p>
              <p className="text-xs text-jollof-label">Series Bible · Book {MOCK_SERIES.booksCount} Active · Creator: {MOCK_SERIES.creator}</p>
            </div>
            <div className="flex flex-col sm:flex-row xl:flex-col gap-2 shrink-0 w-full sm:w-auto">
              <Button variant="outline" icon={BookOpen} size="sm" className="w-full sm:w-auto justify-center">View Series Bible</Button>
              <Button variant="secondary" icon={Activity} size="sm" className="w-full sm:w-auto justify-center" onClick={handleHealthCheck}>Run Health Check</Button>
            </div>
          </div>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
          <MetricCard label="Books" value={MOCK_SERIES.booksCount} sub="3 active" icon={BookOpen} />
          <MetricCard label="Canon Health" value={`${MOCK_SERIES.canonHealth}%`} sub="2 warnings" icon={Shield} color="text-green-400" />
          <MetricCard label="Review Queue" value={MOCK_SERIES.reviewQueue} sub="Items pending" icon={ClipboardList} color="text-amber-400" />
          <MetricCard label="Open Flags" value={MOCK_SERIES.openFlags} sub="Across all books" icon={Flag} color="text-red-400" />
        </div>

        {/* Progress */}
        <div className="jollof-card p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-jollof-subtext uppercase tracking-wide">Series Progress</span>
            <span className="text-lg font-bold text-jollof-orange">{MOCK_SERIES.progress}%</span>
          </div>
          <ProgressBar value={MOCK_SERIES.progress} height="h-2" />
          <div className="flex flex-wrap items-center gap-4 mt-2">
            <span className="text-xs text-jollof-label">Active Scenes: 8</span>
            <span className="text-xs text-jollof-label">Archive Scenes: 0</span>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
          {/* Books overview */}
          <div className="lg:col-span-2">
            <div className="jollof-card">
              <div className="flex items-center justify-between p-4 border-b border-jollof-border">
                <h3 className="text-sm font-semibold text-jollof-text">Books Overview</h3>
                <span className="text-xs text-jollof-label">{MOCK_BOOKS.length} total</span>
              </div>
              <div className="divide-y divide-jollof-border">
                {MOCK_BOOKS.map((book) => (
                  <div key={book.id} className="p-4 hover:bg-jollof-panel/40 transition-colors group">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-11 sm:w-10 sm:h-12 rounded bg-gradient-to-b from-amber-950 to-jollof-surface border border-jollof-border shrink-0 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-jollof-orange">B{book.issueNumber}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <Link href={`/books/${book.id}`} className="text-sm font-medium text-jollof-text hover:text-jollof-orange transition-colors">
                            {book.title}
                          </Link>
                          <StatusBadge status={book.status} />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <span className="text-xs text-jollof-label">{book.pagesPlanned} pages</span>
                          <span className="text-xs text-jollof-label">{book.scenesApproved}/{book.scenesTotal} scenes</span>
                        </div>
                        <ProgressBar value={book.storyProgress} height="h-1" />
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-xs font-medium ${book.productionStatusColor === "green" ? "text-green-400" : book.productionStatusColor === "amber" ? "text-amber-400" : "text-jollof-label"}`}>
                          {book.productionStatus}
                        </div>
                        <Link href={`/books/${book.id}`} className="hidden sm:inline-flex items-center gap-1 text-[10px] text-jollof-orange mt-1 hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                          Open <ChevronRight size={10} />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-jollof-border">
                <Button variant="ghost" size="sm" icon={ExternalLink} className="w-full justify-center text-jollof-label">
                  Go to Review Queue
                </Button>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            {/* Activity */}
            <div className="jollof-card">
              <div className="flex items-center justify-between p-4 border-b border-jollof-border">
                <h3 className="text-sm font-semibold text-jollof-text">Recent Activity</h3>
                <span className="text-xs text-jollof-orange cursor-pointer hover:underline">View all</span>
              </div>
              <div className="divide-y divide-jollof-border">
                {MOCK_ACTIVITY_FEED.map((item) => (
                  <div key={item.id} className="px-4 py-3 flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-jollof-surface border border-jollof-border flex items-center justify-center shrink-0 mt-0.5">
                      {activityIcons[item.type] ?? <Zap size={10} className="text-jollof-label" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-jollof-text truncate">{item.action}</p>
                      <p className="text-[10px] text-jollof-label flex items-center gap-1 mt-0.5">
                        <Clock size={8} /> {item.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Health panel */}
            <div className="jollof-card">
              <div className="p-4 border-b border-jollof-border">
                <h3 className="text-sm font-semibold text-jollof-text">Health / Status</h3>
              </div>
              <div className="p-4 space-y-3">
                {[
                  { label: "Characters", value: 40, status: "healthy" },
                  { label: "Locations", value: 85, status: "healthy" },
                  { label: "Threads", value: 60, status: "warning" },
                  { label: "Continuity", value: 82, status: "warning" },
                  { label: "Canon Data", value: 92, status: "healthy" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-2">
                    <span className="text-xs text-jollof-subtext w-20 sm:w-24 shrink-0">{row.label}</span>
                    <ProgressBar value={row.value} className="flex-1" height="h-1" />
                    <span className={`text-[10px] w-10 sm:w-12 text-right shrink-0 ${row.status === "healthy" ? "text-green-400" : "text-amber-400"}`}>
                      {row.status === "healthy" ? "OK" : "Review"}
                    </span>
                  </div>
                ))}
                <div className="pt-2 border-t border-jollof-border">
                  <div className="flex items-center gap-2 text-xs text-jollof-label">
                    <AlertTriangle size={12} className="text-amber-400" />
                    <span>Last check: {lastHealthCheck}</span>
                  </div>
                </div>
                <Button variant="secondary" size="sm" icon={Activity} className="w-full justify-center" onClick={handleHealthCheck}>
                  Run Health Check
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-5">
          {[
            { icon: TrendingUp, title: "Total Series Visibility", desc: "Track every book, chapter, and asset in one command center." },
            { icon: Activity, title: "Production Health at a Glance", desc: "Monitor integrity, open flags, and progress so nothing slips through." },
            { icon: BookOpen, title: "Editorial Oversight", desc: "Stay ahead of reviews, continuity issues, and blockers across the entire series." },
          ].map((c) => (
            <div key={c.title} className="jollof-panel p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-jollof-orange/10 border border-jollof-orange/20 flex items-center justify-center shrink-0">
                  <c.icon size={14} className="text-jollof-orange" />
                </div>
                <span className="text-xs font-semibold text-jollof-text">{c.title}</span>
              </div>
              <p className="text-xs text-jollof-subtext leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
