import type { Metadata } from "next";
import Link from "next/link";
import {
  Shield,
  BookOpen,
  Layers,
  GitBranch,
  Check,
  ArrowRight,
  Play,
  Twitter,
  Youtube,
  FileText,
  Download,
  AlertTriangle,
  Star,
  Zap,
  Target,
  RotateCcw,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Jollof Pages | Continuity Workflow for Graphic Novel Creation",
  description:
    "Jollof Pages helps graphic novel creators keep canon, revisions, scenes, pages, and panels connected so serialized stories stay coherent from outline to art handoff.",
  openGraph: {
    title: "Jollof Pages | Continuity Workflow for Graphic Novel Creation",
    description:
      "Jollof Pages helps graphic novel creators keep canon, revisions, scenes, pages, and panels connected so serialized stories stay coherent from outline to art handoff.",
    images: [
      {
        url: "/images/jollof-pages/jollof-pages-og-preview.png",
        width: 1200,
        height: 630,
        alt: "Jollof Pages — Continuity Workflow for Graphic Novel Creation",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jollof Pages | Continuity Workflow for Graphic Novel Creation",
    description:
      "Keep canon, scenes, pages, and panels connected. Continuity infrastructure for serialized graphic novels.",
    images: ["/images/jollof-pages/jollof-pages-og-preview.png"],
  },
};

// ─── Navbar ──────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-jollof-border/60 bg-[#0a0800]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-jollof-orange flex items-center justify-center shadow-md shadow-orange-500/30">
            <span className="text-black font-black text-sm">JP</span>
          </div>
          <span className="text-base font-bold text-jollof-text hidden sm:block">Jollof Pages</span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-7">
          {["Product", "Workflow", "Continuity", "Agents"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-sm text-jollof-subtext hover:text-jollof-text transition-colors"
            >
              {item}
            </a>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            href="/login"
            className="text-sm text-jollof-subtext hover:text-jollof-text transition-colors hidden sm:block"
          >
            Admin Login
          </Link>
          <a
            href="#early-access"
            className="inline-flex items-center gap-1.5 bg-jollof-orange text-black font-bold text-sm px-4 py-2 rounded-lg hover:bg-orange-400 active:scale-[0.97] transition-all shadow-md shadow-orange-500/20"
          >
            Get Early Access
            <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-16 pb-24 sm:pt-20 sm:pb-32">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-jollof-orange/6 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-amber-900/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-12 xl:gap-16 items-center">
          {/* Left copy */}
          <div>
            <div className="inline-flex items-center gap-2 border border-jollof-orange/30 bg-jollof-orange/8 text-jollof-orange text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              <Zap size={11} />
              Continuity infrastructure for graphic novel creators
            </div>

            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black text-jollof-text leading-[1.08] tracking-tight mb-5">
              Keep canon,<br />
              scenes, pages,<br />
              and panels<br />
              <span className="text-jollof-orange">connected.</span>
            </h1>

            <p className="text-base sm:text-lg text-jollof-subtext leading-relaxed mb-8 max-w-lg">
              Jollof Pages helps graphic novel creators maintain continuity, manage revisions, and move from story outline to page and panel execution without losing the thread.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <a
                href="#early-access"
                id="early-access"
                className="inline-flex items-center justify-center gap-2 bg-jollof-orange text-black font-bold text-sm px-6 py-3.5 rounded-xl hover:bg-orange-400 active:scale-[0.97] transition-all shadow-lg shadow-orange-500/25 min-h-[52px]"
              >
                Start Building
                <ArrowRight size={15} />
              </a>
              <a
                href="#workflow"
                className="inline-flex items-center justify-center gap-2 border border-jollof-border bg-jollof-surface/50 text-jollof-text font-medium text-sm px-6 py-3.5 rounded-xl hover:border-jollof-orange/40 hover:bg-jollof-surface transition-all min-h-[52px]"
              >
                <Play size={14} className="text-jollof-orange" />
                See Workflow
              </a>
            </div>

            {/* Trust row */}
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {["A", "K", "T", "M"].map((l, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full border-2 border-[#0a0800] bg-gradient-to-br from-amber-700 to-jollof-surface flex items-center justify-center text-[9px] font-bold text-jollof-text"
                  >
                    {l}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={11} className="text-jollof-orange fill-jollof-orange" />
                ))}
              </div>
              <span className="text-xs text-jollof-subtext">Trusted by creators worldwide</span>
            </div>
          </div>

          {/* Right — product dashboard */}
          <div className="relative">
            {/* Hero dashboard visual */}
            <div className="relative rounded-2xl border border-jollof-border bg-[#0f0d08] overflow-hidden shadow-2xl shadow-black/60">
              {/* Top bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-jollof-border/50 bg-[#0f0d08]">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                  </div>
                  <span className="text-xs text-jollof-label ml-1">Project · Dawn of Kemet</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-jollof-label border border-jollof-border px-2 py-0.5 rounded">Share</span>
                  <span className="text-xs bg-jollof-orange text-black font-bold px-2 py-0.5 rounded">New</span>
                </div>
              </div>

              {/* Dashboard content */}
              <div className="p-4 grid grid-cols-3 gap-3 text-[10px]">
                {/* Canon Board */}
                <div className="col-span-3 bg-[#161209] border border-jollof-border/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-jollof-text text-[10px] uppercase tracking-wide">Canon Board</span>
                    <span className="text-jollof-orange text-[9px]">View all</span>
                  </div>
                  <div className="flex gap-3 overflow-hidden">
                    {[
                      { label: "Characters", count: 12 },
                      { label: "Locations", count: 7 },
                      { label: "Items", count: 15 },
                      { label: "Rules", count: 3 },
                    ].map(({ label, count }) => (
                      <div key={label} className="flex-1 min-w-0">
                        <div className="text-jollof-label mb-1">{label}</div>
                        <div className="flex items-center gap-1">
                          <div className="flex -space-x-1">
                            {[...Array(Math.min(3, count))].map((_, i) => (
                              <div key={i} className="w-5 h-5 rounded bg-gradient-to-br from-amber-800/60 to-jollof-surface border border-jollof-border/50" />
                            ))}
                          </div>
                          <span className="text-jollof-subtext font-medium">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scene Tracker */}
                <div className="bg-[#161209] border border-jollof-border/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-jollof-text text-[9px] uppercase tracking-wide">Scene Tracker</span>
                    <span className="text-jollof-orange text-[8px]">View all</span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { scene: "The Call", status: "done" },
                      { scene: "Crossing Lines", status: "progress" },
                      { scene: "Market Tension", status: "todo" },
                      { scene: "Night of Ash", status: "todo" },
                    ].map(({ scene, status }) => (
                      <div key={scene} className="flex items-center gap-1.5">
                        <span className={`w-1 h-1 rounded-full shrink-0 ${status === "done" ? "bg-green-400" : status === "progress" ? "bg-jollof-orange" : "bg-jollof-border"}`} />
                        <span className="text-jollof-subtext truncate text-[9px]">{scene}</span>
                        {status === "done" && <span className="ml-auto text-[8px] text-green-400 shrink-0">Done</span>}
                        {status === "progress" && <span className="ml-auto text-[8px] text-jollof-orange shrink-0">In Progress</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Page Planner */}
                <div className="bg-[#161209] border border-jollof-border/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-jollof-text text-[9px] uppercase tracking-wide">Page Planner</span>
                    <span className="text-jollof-orange text-[8px]">View all</span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { pg: "Page 12", panels: "24 panels", status: "approved" },
                      { pg: "Page 13", panels: "20 panels", status: "progress" },
                      { pg: "Page 14", panels: "22 panels", status: "todo" },
                      { pg: "Page 15", panels: "18 panels", status: "todo" },
                    ].map(({ pg, panels, status }) => (
                      <div key={pg} className="flex items-center gap-1 text-[9px]">
                        <div className="w-5 h-5 rounded bg-amber-900/40 border border-jollof-border/40 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-jollof-text truncate">{pg}</div>
                          <div className="text-jollof-label">{panels}</div>
                        </div>
                        <span className={`text-[8px] px-1 rounded shrink-0 ${status === "approved" ? "text-green-400" : status === "progress" ? "text-jollof-orange" : "text-jollof-label"}`}>
                          {status === "approved" ? "Approved" : status === "progress" ? "In Progress" : "To Do"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Continuity Flags */}
                <div className="bg-[#161209] border border-jollof-border/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-jollof-text text-[9px] uppercase tracking-wide">Continuity Flags</span>
                    <span className="text-jollof-orange text-[8px]">View all</span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { label: "Clothing change", severity: "medium" },
                      { label: "Injury state mismatch", severity: "high" },
                      { label: "Prop missing", severity: "medium" },
                    ].map(({ label, severity }) => (
                      <div key={label} className="flex items-center gap-1.5 text-[8px]">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${severity === "high" ? "bg-red-400" : "bg-yellow-400"}`} />
                        <span className="text-jollof-subtext truncate">{label}</span>
                      </div>
                    ))}
                    <button className="w-full text-[8px] text-jollof-orange border border-jollof-orange/20 rounded px-1.5 py-1 mt-1 hover:bg-jollof-orange/10 transition-colors">
                      Open Continuity Hub
                    </button>
                  </div>
                </div>

                {/* Revision Status */}
                <div className="col-span-2 bg-[#161209] border border-jollof-border/50 rounded-lg p-3 flex items-center gap-4">
                  <div className="relative w-16 h-16 shrink-0">
                    <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#2a1f08" strokeWidth="3" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#f97316" strokeWidth="3" strokeDasharray="60 28" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[13px] font-black text-jollof-orange">68%</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] font-semibold text-jollof-text mb-1.5">Revision Status</p>
                    {[
                      { label: "Approved", pct: 68, color: "bg-jollof-orange" },
                      { label: "In Progress", pct: 20, color: "bg-amber-600" },
                      { label: "To Do", pct: 12, color: "bg-jollof-border" },
                    ].map(({ label, pct, color }) => (
                      <div key={label} className="flex items-center gap-1.5 mb-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
                        <span className="text-jollof-subtext text-[8px] flex-1">{label}</span>
                        <span className="text-jollof-text text-[8px] font-medium">{pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating glow */}
            <div className="absolute -inset-4 bg-jollof-orange/4 rounded-3xl blur-2xl -z-10" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Problem / Solution ───────────────────────────────────────────────────────

function ProblemSection() {
  const problems = [
    { icon: FileText, title: "Notes Everywhere", desc: "Scattered docs and disconnected files." },
    { icon: GitBranch, title: "Scripts Out of Sync", desc: "Story changes don't reach every file." },
    { icon: BookOpen, title: "References Hard to Find", desc: "Assets buried in folders and apps." },
    { icon: Layers, title: "Page Plans Fall Apart", desc: "Page shifts, context gets lost." },
  ];

  const solution = [
    { icon: Shield, label: "Canon", desc: "Single source of truth" },
    { icon: FileText, label: "Scenes", desc: "Narrative in context" },
    { icon: BookOpen, label: "Pages", desc: "Planned with purpose" },
    { icon: Layers, label: "Panels", desc: "Executed precisely" },
    { icon: RotateCcw, label: "Revisions", desc: "Tracked and versioned" },
  ];

  return (
    <section id="product" className="py-20 sm:py-28 border-t border-jollof-border/40">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-12 xl:gap-16 items-center">
          {/* Left — problem */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-jollof-text mb-3">
              Most comic workflows break continuity.
            </h2>
            <p className="text-sm text-jollof-subtext mb-8 leading-relaxed">
              Creators juggle too many disconnected tools. Story changes don&apos;t propagate. References get lost. Production stalls.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {problems.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-[#161209] border border-jollof-border rounded-xl p-4">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3">
                    <Icon size={15} className="text-red-400" />
                  </div>
                  <p className="text-xs font-semibold text-jollof-text mb-1">{title}</p>
                  <p className="text-[11px] text-jollof-label leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — solution */}
          <div>
            <div className="bg-[#0f0d08] border border-jollof-orange/20 rounded-2xl p-6 sm:p-8 shadow-lg shadow-orange-500/5">
              <div className="text-xs font-bold text-jollof-orange uppercase tracking-widest mb-1">Jollof Pages keeps it connected</div>
              <p className="text-sm text-jollof-subtext mb-6">One system. Every thread. Always connected.</p>

              <div className="flex flex-wrap items-center gap-2 mb-6">
                {solution.map(({ icon: Icon, label, desc }, i) => (
                  <div key={label} className="flex items-center gap-1.5">
                    {i > 0 && <div className="w-6 h-px bg-jollof-orange/40 mx-1" />}
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-xl bg-jollof-orange/10 border border-jollof-orange/25 flex items-center justify-center">
                        <Icon size={16} className="text-jollof-orange" />
                      </div>
                      <span className="text-[10px] font-semibold text-jollof-text">{label}</span>
                      <span className="text-[9px] text-jollof-label text-center leading-tight max-w-[56px]">{desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-jollof-border/40 pt-4">
                <p className="text-xs text-jollof-orange font-medium text-center italic">
                  One system. Every thread. Always connected.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

function FeaturesSection() {
  const features = [
    {
      icon: Target,
      title: "Continuity First",
      desc: "Every element is tracked across scenes, pages, and panels so nothing slips through the cracks.",
    },
    {
      icon: Shield,
      title: "Canon Aware",
      desc: "Characters, locations, items, and rules inform every step of your workflow.",
    },
    {
      icon: Layers,
      title: "Page-to-Panel Workflow",
      desc: "Plan pages, break into panels, and keep execution aligned with your story.",
    },
    {
      icon: RotateCcw,
      title: "Revision Tracking",
      desc: "Version everything, compare changes, and always know what's current.",
    },
  ];

  return (
    <section className="py-20 sm:py-28 border-t border-jollof-border/40">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-jollof-text mb-3">
            Built for long stories and serious worldbuilding.
          </h2>
          <p className="text-sm text-jollof-subtext max-w-xl mx-auto leading-relaxed">
            Every feature is designed for serialized work — not one-shots, not scripts. Long form stories that stay consistent across hundreds of pages.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-[#0f0d08] border border-jollof-border hover:border-jollof-orange/30 rounded-xl p-6 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-jollof-orange/10 border border-jollof-orange/20 flex items-center justify-center mb-4 group-hover:bg-jollof-orange/15 transition-colors">
                <Icon size={18} className="text-jollof-orange" />
              </div>
              <h3 className="text-sm font-bold text-jollof-text mb-2">{title}</h3>
              <p className="text-xs text-jollof-subtext leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Workflow Strip ───────────────────────────────────────────────────────────

function WorkflowSection() {
  const steps = [
    {
      num: 1,
      label: "Series Setup",
      desc: "Series details, team & roles, preferences.",
      img: "/images/jollof-pages/workflow-series-placeholder.webp",
      imgAlt: "Series setup placeholder — cover art will replace this",
      detail: (
        <div className="space-y-1 text-[9px] text-jollof-subtext">
          <div className="flex justify-between"><span>Characters</span><span className="text-jollof-text font-medium">12</span></div>
          <div className="flex justify-between"><span>Locations</span><span className="text-jollof-text font-medium">7</span></div>
          <div className="flex justify-between"><span>Items</span><span className="text-jollof-text font-medium">15</span></div>
        </div>
      ),
    },
    {
      num: 2,
      label: "Canon",
      desc: "Build your world and its rules.",
      img: "/images/jollof-pages/workflow-canon-placeholder.webp",
      imgAlt: "Canon placeholder — character/world art will replace this",
      detail: (
        <div className="space-y-1 text-[9px] text-jollof-subtext">
          <p>Canon entries locked and versioned.</p>
        </div>
      ),
    },
    {
      num: 3,
      label: "Scenes",
      desc: "Outline and structure each scene.",
      img: "/images/jollof-pages/workflow-scenes-placeholder.webp",
      imgAlt: "Scenes placeholder — scene art will replace this",
      detail: (
        <div className="space-y-0.5 text-[9px] text-jollof-subtext">
          {["The Call", "Crossing Lines", "Market Tension"].map((s) => (
            <div key={s}>{s}</div>
          ))}
        </div>
      ),
    },
    {
      num: 4,
      label: "Pages",
      desc: "Plan pages with beats, goals, and notes.",
      img: "/images/jollof-pages/workflow-pages-placeholder.webp",
      imgAlt: "Pages placeholder — page thumbnails will replace this",
      detail: (
        <div className="flex gap-1">
          {[12, 13, 14].map((n) => (
            <div key={n} className="w-6 h-8 rounded bg-amber-900/40 border border-jollof-border/50 flex items-end justify-center pb-0.5">
              <span className="text-[7px] text-jollof-label">{n}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      num: 5,
      label: "Panels",
      desc: "Break pages into panels and shots.",
      img: "/images/jollof-pages/workflow-panels-placeholder.webp",
      imgAlt: "Panels placeholder — panel art will replace this",
      detail: (
        <div className="grid grid-cols-2 gap-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-5 rounded-sm bg-amber-900/30 border border-jollof-border/40" />
          ))}
        </div>
      ),
    },
    {
      num: 6,
      label: "Review",
      desc: "Validate continuity and flag issues.",
      img: null,
      imgAlt: null,
      detail: (
        <div className="text-center">
          <div className="text-lg font-black text-green-400">92%</div>
          <div className="text-[9px] text-green-400">Continuity Check</div>
          <div className="text-[9px] text-jollof-label mt-0.5">Looks good!</div>
        </div>
      ),
    },
    {
      num: 7,
      label: "Export",
      desc: "Deliver clean files for your team.",
      img: null,
      imgAlt: null,
      detail: (
        <div className="space-y-1 text-[9px] text-jollof-subtext">
          {["PDF", "Storyboard", "PNGs", "Script"].map((f) => (
            <div key={f} className="flex items-center gap-1.5">
              <Download size={9} className="text-jollof-orange shrink-0" />
              {f}
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <section id="workflow" className="py-20 sm:py-28 border-t border-jollof-border/40">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-jollof-text mb-3">
            From story outline to art handoff.
          </h2>
          <p className="text-sm text-jollof-subtext max-w-xl">
            A structured pipeline from world-building to export. Every step feeds the next. Nothing gets lost.
          </p>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none">
          {steps.map(({ num, label, desc, img, imgAlt, detail }) => (
            <div key={num} className="flex-shrink-0 w-36 sm:w-44">
              {/* Step number */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-jollof-orange flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-black text-black">{num}</span>
                </div>
                {num < steps.length && (
                  <div className="flex-1 h-px bg-gradient-to-r from-jollof-orange/40 to-transparent" />
                )}
              </div>

              {/* Card */}
              <div className="bg-[#0f0d08] border border-jollof-border rounded-xl p-3">
                <p className="text-xs font-bold text-jollof-text mb-0.5">{label}</p>
                <p className="text-[10px] text-jollof-label mb-3 leading-snug">{desc}</p>

                {/* Image placeholder */}
                {img ? (
                  <div className="w-full h-16 rounded-lg overflow-hidden mb-3 bg-[#1a1208] border border-jollof-border/50 relative">
                    <img
                      src={img}
                      alt={imgAlt ?? ""}
                      className="w-full h-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[8px] text-jollof-label text-center px-1">art placeholder</span>
                    </div>
                  </div>
                ) : null}

                {/* Detail content */}
                <div>{detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Agents ───────────────────────────────────────────────────────────────────

function AgentsSection() {
  const agents = [
    {
      name: "Scene Writer",
      desc: "Turns story outlines and notes into rich, structured routine drafts.",
      status: "active",
      img: "/images/jollof-pages/agent-scene-writer-placeholder.webp",
      imgAlt: "Scene Writer agent portrait placeholder",
    },
    {
      name: "Canon Extractor",
      desc: "Extracts facts from scripts and updates your canon.",
      status: "active",
      img: "/images/jollof-pages/agent-canon-extractor-placeholder.webp",
      imgAlt: "Canon Extractor agent portrait placeholder",
    },
    {
      name: "Continuity Validator",
      desc: "Scans scenes, pages, and panels for breaks and inconsistencies.",
      status: "active",
      img: "/images/jollof-pages/agent-continuity-validator-placeholder.webp",
      imgAlt: "Continuity Validator agent portrait placeholder",
    },
    {
      name: "Panel Generator",
      desc: "Generates panel compositions and scripts for your direction.",
      status: "active",
      img: "/images/jollof-pages/agent-panel-generator-placeholder.webp",
      imgAlt: "Panel Generator agent portrait placeholder",
    },
  ];

  const queue = [
    { type: "Scene Draft", item: "Scene 3 – Market Tension", by: "Scene Writer", status: "needs_review" },
    { type: "Canon Update", item: "Ama – New Outfit", by: "Canon Extractor", status: "needs_review" },
    { type: "Continuity Flag", item: "Injury State Mismatch\nPg 14 – Panel 3", by: "Continuity Validator", status: "needs_review" },
    { type: "Panel Set", item: "Page 12 – Panel 1-6", by: "Panel Generator", status: "approved" },
  ];

  return (
    <section id="agents" className="py-20 sm:py-28 border-t border-jollof-border/40">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-12 xl:gap-16 items-start">
          {/* Left — agents */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-jollof-text mb-2">
              Your agent crew. Your rules.
            </h2>
            <p className="text-sm text-jollof-subtext mb-8 leading-relaxed">
              Powerful AI agents do the heavy lifting — you stay in control.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {agents.map(({ name, desc, status, img, imgAlt }) => (
                <div key={name} className="bg-[#0f0d08] border border-jollof-border hover:border-jollof-orange/30 rounded-xl p-4 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-jollof-text">{name}</span>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-[9px] text-green-400 capitalize">{status}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-jollof-label leading-relaxed mb-3">{desc}</p>
                  {/* Agent portrait placeholder */}
                  <div className="w-full h-20 rounded-lg bg-[#1a1208] border border-jollof-border/50 overflow-hidden relative">
                    <img
                      src={img}
                      alt={imgAlt}
                      className="w-full h-full object-cover opacity-50"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[8px] text-jollof-label">portrait placeholder</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — approval queue */}
          <div>
            {/* Handwritten note */}
            <div className="mb-5 flex items-center justify-end">
              <div className="text-right">
                <p className="text-jollof-orange font-bold italic text-sm" style={{ fontFamily: "Georgia, serif" }}>
                  &#x2B10; Agents draft.
                </p>
                <p className="text-jollof-orange font-bold italic text-sm" style={{ fontFamily: "Georgia, serif" }}>
                  Humans approve.
                </p>
              </div>
            </div>

            <div className="bg-[#0f0d08] border border-jollof-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-jollof-border flex items-center justify-between">
                <span className="text-sm font-bold text-jollof-text">Approval Queue</span>
                <div className="flex gap-1">
                  {["All (4)", "Needs Review (3)", "Approved (1)"].map((t, i) => (
                    <span
                      key={t}
                      className={`text-[10px] px-2 py-1 rounded-md cursor-pointer transition-colors ${i === 0 ? "bg-jollof-panel text-jollof-text" : "text-jollof-label hover:text-jollof-subtext"}`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-jollof-border/50">
                {queue.map(({ type, item, by, status }) => (
                  <div key={item} className="px-5 py-4 flex items-center gap-3">
                    {/* Thumbnail placeholder */}
                    <div className="w-9 h-9 rounded-lg bg-[#1a1208] border border-jollof-border/50 shrink-0 flex items-center justify-center">
                      {status === "approved" ? (
                        <Check size={13} className="text-green-400" />
                      ) : (
                        <AlertTriangle size={13} className="text-jollof-orange" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-jollof-label">{type}</p>
                      <p className="text-xs font-medium text-jollof-text truncate">{item.split("\n")[0]}</p>
                      <p className="text-[9px] text-jollof-label">By {by}</p>
                    </div>
                    {status === "approved" ? (
                      <span className="text-[10px] text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full shrink-0">
                        Approved
                      </span>
                    ) : (
                      <div className="flex gap-1 shrink-0">
                        <button className="text-[10px] bg-jollof-orange text-black font-bold px-2.5 py-1 rounded-lg hover:bg-orange-400 transition-colors">
                          Review
                        </button>
                        <button className="text-[10px] border border-jollof-border text-jollof-subtext px-2.5 py-1 rounded-lg hover:border-red-400/40 hover:text-red-400 transition-colors">
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Continuity Hub ───────────────────────────────────────────────────────────

function ContinuitySection() {
  const menuItems = [
    { label: "Continuity Hub", active: true },
    { label: "Characters" },
    { label: "Clothing" },
    { label: "Injuries" },
    { label: "Props" },
    { label: "Timeline" },
    { label: "Flags" },
  ];

  const flags = [
    { label: "Clothing change", page: "Pg 13 – Panel 4", severity: "medium" },
    { label: "Injury state mismatch", page: "Pg 14 – Panel 2", severity: "high" },
    { label: "Prop missing", page: "Pg 12 – Panel 6", severity: "medium" },
  ];

  return (
    <section id="continuity" className="py-20 sm:py-28 border-t border-jollof-border/40">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-jollof-text mb-3">
            Catch continuity breaks before they spread.
          </h2>
          <p className="text-sm text-jollof-subtext max-w-xl leading-relaxed">
            Track every detail that matters across your story. Character states, prop placements, clothing, injuries — all connected to exact page and panel references.
          </p>
        </div>

        <div className="bg-[#0f0d08] border border-jollof-border rounded-2xl overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            {/* Sidebar */}
            <div className="lg:w-44 border-b lg:border-b-0 lg:border-r border-jollof-border/50 p-4">
              <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible scrollbar-none">
                {menuItems.map(({ label, active }) => (
                  <button
                    key={label}
                    className={`text-xs px-3 py-2 rounded-lg whitespace-nowrap text-left transition-colors ${active ? "bg-jollof-orange/15 text-jollof-orange border border-jollof-orange/25 font-medium" : "text-jollof-subtext hover:text-jollof-text hover:bg-jollof-panel"}`}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Main */}
            <div className="flex-1 p-5 overflow-hidden">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Character card — Zuri */}
                <div className="bg-[#161209] border border-jollof-border rounded-xl p-4">
                  <div className="flex items-start gap-3 mb-4">
                    {/* Portrait placeholder */}
                    <div className="w-14 h-16 rounded-lg bg-[#1a1208] border border-jollof-border/50 overflow-hidden relative shrink-0">
                      <img
                        src="/images/jollof-pages/continuity-zuri-placeholder.webp"
                        alt="Zuri character portrait placeholder"
                        className="w-full h-full object-cover opacity-50"
                      />
                      <div className="absolute inset-0 flex items-end justify-center pb-0.5">
                        <span className="text-[7px] text-jollof-label">portrait</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-jollof-text">Zuri</p>
                      <div className="space-y-0.5 text-[9px] text-jollof-subtext mt-1">
                        <div className="flex gap-2"><span className="text-jollof-label">Age</span><span>24</span></div>
                        <div className="flex gap-2"><span className="text-jollof-label">Height</span><span>5&apos;7&quot;</span></div>
                        <div className="flex gap-2"><span className="text-jollof-label">Build</span><span>Athletic</span></div>
                        <div className="flex gap-2"><span className="text-jollof-label">Hair</span><span>Long locs</span></div>
                        <div className="flex gap-2"><span className="text-jollof-label">Eyes</span><span>Brown</span></div>
                      </div>
                      <button className="mt-2 text-[9px] text-jollof-orange border border-jollof-orange/20 px-2 py-0.5 rounded hover:bg-jollof-orange/10 transition-colors">
                        View Profile →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Clothing state */}
                <div className="bg-[#161209] border border-jollof-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-semibold text-jollof-text">Clothing State</p>
                    <span className="text-[9px] text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-1.5 py-0.5 rounded-full">⚠ Mismatch</span>
                  </div>
                  <div className="flex gap-1.5 mb-2">
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} className="flex-1 aspect-square rounded-md bg-[#1a1208] border border-jollof-border/50 overflow-hidden relative">
                        <img
                          src={`/images/jollof-pages/continuity-clothing-${n}-placeholder.webp`}
                          alt={`Clothing state ${n} placeholder`}
                          className="w-full h-full object-cover opacity-50"
                        />
                        <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-0.5">
                          <span className="text-[6px] text-jollof-label">Sc {n}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-[9px] text-jollof-label">
                    <span>Scene 1</span>
                    <div className="flex-1 h-px bg-jollof-border/50" />
                    <span>Scene 3</span>
                    <div className="flex-1 h-px bg-jollof-border/50" />
                    <span>Pg 12</span>
                    <div className="flex-1 h-px bg-jollof-border/50" />
                    <span>Pg 13</span>
                  </div>
                </div>

                {/* Continuity flags */}
                <div className="bg-[#161209] border border-jollof-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-semibold text-jollof-text">Recent Continuity Flags</p>
                    <button className="text-[9px] text-jollof-orange hover:underline">View all →</button>
                  </div>
                  <div className="space-y-2">
                    {flags.map(({ label, page, severity }) => (
                      <div key={label} className="flex items-start gap-2 bg-[#120e05] border border-jollof-border/50 rounded-lg p-2">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${severity === "high" ? "bg-red-400" : "bg-yellow-400"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-medium text-jollof-text truncate">{label}</p>
                          <p className="text-[8px] text-jollof-label">{page}</p>
                        </div>
                        <span className={`text-[8px] shrink-0 font-medium ${severity === "high" ? "text-red-400" : "text-yellow-400"}`}>
                          {severity.charAt(0).toUpperCase() + severity.slice(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CTASection() {
  return (
    <section className="relative py-24 sm:py-32 border-t border-jollof-border/40 overflow-hidden">
      {/* Cityscape background placeholder */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
        style={{ backgroundImage: "url('/images/jollof-pages/cta-cityscape-placeholder.webp')" }}
        aria-hidden="true"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0800] via-[#0a0800]/60 to-[#0a0800]" aria-hidden="true" />
      {/* Orange glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-jollof-orange/8 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-5 sm:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl xl:text-5xl font-black text-jollof-text leading-tight mb-4">
          Build your story on{" "}
          <span className="text-jollof-orange">connected infrastructure.</span>
        </h2>
        <p className="text-base sm:text-lg text-jollof-subtext leading-relaxed mb-8 max-w-xl mx-auto">
          Stop patching tools together. Start building stories that stay consistent from first idea to final panel.
        </p>
        <a
          href="#early-access"
          className="inline-flex items-center gap-2 bg-jollof-orange text-black font-bold text-base px-8 py-4 rounded-xl hover:bg-orange-400 active:scale-[0.97] transition-all shadow-xl shadow-orange-500/30 min-h-[56px]"
        >
          Join Early Access
          <ArrowRight size={18} />
        </a>
        <div className="mt-6 flex items-center justify-center gap-3">
          <div className="flex -space-x-2">
            {["A", "K", "T", "M", "O"].map((l, i) => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-[#0a0800] bg-gradient-to-br from-amber-700 to-jollof-surface flex items-center justify-center text-[8px] font-bold text-jollof-text">
                {l}
              </div>
            ))}
          </div>
          <span className="text-xs text-jollof-subtext">Join 1,243+ creators on the waitlist</span>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const links = {
    Product: ["Features", "Pricing", "Roadmap", "Resources"],
    Community: ["Discord", "Blog", "Changelog", "Help Center"],
    Company: ["About", "Careers", "Privacy", "Terms"],
  };

  return (
    <footer className="border-t border-jollof-border/40 py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-3 w-fit">
              <div className="w-8 h-8 rounded-lg bg-jollof-orange flex items-center justify-center">
                <span className="text-black font-black text-sm">JP</span>
              </div>
              <span className="text-base font-bold text-jollof-text">Jollof Pages</span>
            </Link>
            <p className="text-xs text-jollof-subtext leading-relaxed max-w-xs">
              Continuity and workflow infrastructure for graphic novel creation.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([col, items]) => (
            <div key={col}>
              <p className="text-xs font-semibold text-jollof-text mb-3">{col}</p>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item}>
                    <a href="#" className="text-xs text-jollof-subtext hover:text-jollof-text transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-jollof-border/40">
          <p className="text-[11px] text-jollof-label">© 2024 Jollof Pages. All rights reserved.</p>

          {/* Social icons */}
          <div className="flex items-center gap-3">
            {[
              { Icon: Twitter, label: "Twitter" },
              { Icon: Youtube, label: "YouTube" },
            ].map(({ Icon, label }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="w-8 h-8 rounded-lg border border-jollof-border flex items-center justify-center text-jollof-label hover:text-jollof-text hover:border-jollof-orange/40 transition-all"
              >
                <Icon size={14} />
              </a>
            ))}
            {/* Discord placeholder */}
            <a
              href="#"
              aria-label="Discord"
              className="w-8 h-8 rounded-lg border border-jollof-border flex items-center justify-center text-jollof-label hover:text-jollof-text hover:border-jollof-orange/40 transition-all"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.055a19.905 19.905 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </a>
            {/* Instagram placeholder */}
            <a
              href="#"
              aria-label="Instagram"
              className="w-8 h-8 rounded-lg border border-jollof-border flex items-center justify-center text-jollof-label hover:text-jollof-text hover:border-jollof-orange/40 transition-all"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0800]">
      <Navbar />
      <HeroSection />
      <ProblemSection />
      <FeaturesSection />
      <WorkflowSection />
      <AgentsSection />
      <ContinuitySection />
      <CTASection />
      <Footer />
    </div>
  );
}
