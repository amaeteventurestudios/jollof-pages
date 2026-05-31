"use client";
import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/lib/toast";
import { MOCK_CHARACTERS } from "@/lib/mock/jollof-data";
import {
  Edit, Plus, ChevronRight, User, Shield, Eye,
  AlertTriangle, CheckCircle, BookOpen
} from "lucide-react";

export default function CharacterProfilePage() {
  const { toast } = useToast();
  const character = MOCK_CHARACTERS[0];
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

  const handleAddNote = () => {
    toast("Continuity note added (prototype only).", "success");
    setAddNoteOpen(false);
    setNoteText("");
  };

  return (
    <AppShell>
      <div className="p-6 max-w-6xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-jollof-label mb-4">
          <Link href="/canon" className="hover:text-jollof-orange transition-colors">Canon Vault</Link>
          <ChevronRight size={12} />
          <span className="text-jollof-subtext">Characters</span>
          <ChevronRight size={12} />
          <span className="text-jollof-subtext">Zane Jaja</span>
        </div>

        <div className="text-jollof-orange font-bold text-xs uppercase tracking-widest mb-0.5">Character Profile</div>
        <h1 className="text-2xl font-black text-jollof-text mb-1">Character Profile</h1>
        <p className="text-sm text-jollof-subtext mb-5">Track one character&apos;s canon, visual state, relationships, continuity notes, and appearances.</p>

        {/* Character card */}
        <div className="jollof-card p-5 mb-5 flex items-start gap-5">
          {/* Portrait */}
          <div className="w-24 h-28 rounded-lg bg-gradient-to-b from-amber-900/50 to-jollof-surface border border-jollof-border shrink-0 flex items-center justify-center">
            <User size={28} className="text-jollof-orange/30" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h2 className="text-2xl font-black text-jollof-text">{character.name}</h2>
              <StatusBadge status="confirmed" label="Confirmed Canon" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1.5 text-xs">
              {[
                { label: "Role", value: character.role },
                { label: "Affiliation", value: character.affiliation },
                { label: "Age", value: character.age },
                { label: "Species", value: character.species },
                { label: "Height", value: character.height },
                { label: "Alignment", value: character.alignment },
                { label: "Status", value: character.status },
              ].map((row) => (
                <div key={row.label}>
                  <span className="text-jollof-label">{row.label}: </span>
                  <span className="text-jollof-subtext">{row.value}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-jollof-subtext mt-3 max-w-2xl leading-relaxed">{character.description}</p>
          </div>
          <div className="shrink-0 flex gap-2">
            <Button variant="secondary" icon={Edit} size="sm" onClick={() => toast("Edit Profile (prototype only).", "info")}>Edit Profile</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Canon facts + Visual state + Continuity notes */}
          <div className="lg:col-span-2 space-y-4">
            {/* Canon facts */}
            <div className="jollof-card">
              <div className="p-4 border-b border-jollof-border flex items-center gap-2">
                <Shield size={14} className="text-green-400" />
                <h3 className="text-sm font-semibold text-jollof-text">Canon Facts</h3>
                <span className="text-xs text-jollof-label ml-auto">{character.canonFacts.length} confirmed</span>
              </div>
              <div className="p-4 space-y-2">
                {character.canonFacts.map((fact, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs">
                    <CheckCircle size={12} className="text-green-400 shrink-0 mt-0.5" />
                    <span className="text-jollof-subtext">{fact}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual state */}
            <div className="jollof-card">
              <div className="p-4 border-b border-jollof-border flex items-center gap-2">
                <Eye size={14} className="text-jollof-orange" />
                <h3 className="text-sm font-semibold text-jollof-text">Visual State</h3>
                <StatusBadge status="confirmed" className="ml-auto" />
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(character.visualState).map(([key, val]) => (
                    <div key={key} className="jollof-surface border border-jollof-border rounded-md p-3">
                      <div className="text-[10px] text-jollof-label uppercase tracking-wider mb-1">{key}</div>
                      <p className="text-xs text-jollof-subtext leading-snug">{val as string}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Continuity notes */}
            <div className="jollof-card">
              <div className="p-4 border-b border-jollof-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-400" />
                  <h3 className="text-sm font-semibold text-jollof-text">Continuity Notes</h3>
                </div>
                <Button variant="ghost" icon={Plus} size="sm" onClick={() => setAddNoteOpen(true)}>Add Note</Button>
              </div>
              <div className="p-4 space-y-2">
                {character.continuityNotes.map((note, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1 shrink-0" />
                    <span className="text-jollof-subtext">{note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Relationships + Appearances */}
          <div className="space-y-4">
            {/* Relationships */}
            <div className="jollof-card">
              <div className="p-4 border-b border-jollof-border">
                <h3 className="text-sm font-semibold text-jollof-text">Relationships</h3>
              </div>
              <div className="divide-y divide-jollof-border">
                {character.relationships.map((rel) => (
                  <div key={rel.character} className="px-4 py-2.5">
                    <div className="flex items-center justify-between">
                      <Link href={rel.character === "Kira Selene" ? "/characters/kira-selene" : "#"} className="text-xs font-medium text-jollof-text hover:text-jollof-orange transition-colors">
                        {rel.character}
                      </Link>
                      <span className={`text-[10px] ${rel.status === "Trusted" ? "text-green-400" : rel.status === "Hostile" ? "text-red-400" : "text-amber-400"}`}>
                        {rel.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-jollof-label mt-0.5">{rel.type}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Appearances timeline */}
            <div className="jollof-card">
              <div className="p-4 border-b border-jollof-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-jollof-text">Appearances</h3>
                <button onClick={() => toast("View full timeline (prototype)", "info")} className="text-xs text-jollof-orange hover:underline">View Full Timeline</button>
              </div>
              <div className="divide-y divide-jollof-border">
                {character.appearances.map((app) => (
                  <div key={app.sceneId} className="px-4 py-2.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <Link href={app.sceneId === "scene-03" ? "/scenes/scene-03" : "#"} className="text-xs font-medium text-jollof-text hover:text-jollof-orange transition-colors">
                        {app.sceneId.replace("scene-0", "Scene ")}
                      </Link>
                      <span className="text-[10px] text-jollof-label">Pages {app.pageRange}</span>
                    </div>
                    {app.note && <p className="text-[11px] text-jollof-label">{app.note}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Info cards */}
            <div className="space-y-3">
              {[
                { icon: Shield, title: "Character Consistency", desc: "Lock in key canon facts, relationships, and traits so every page stays true." },
                { icon: Eye, title: "Visual Continuity", desc: "Track outfits, injuries, props, and visual notes to keep the character on-model." },
                { icon: BookOpen, title: "Appearance Tracking", desc: "See every scene and book the character appears in — past, present, and future." },
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

      {/* Add Note Modal */}
      <Modal open={addNoteOpen} onClose={() => setAddNoteOpen(false)} title="Add Continuity Note">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Note</label>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
              placeholder="e.g. Zane's gauntlet switches from right to left arm in Scene 04 — needs correction."
              className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-2 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-jollof-subtext mb-1.5">Scene Reference</label>
            <input placeholder="e.g. Scene 04" className="w-full bg-jollof-surface border border-jollof-border rounded-lg px-3 py-2 text-sm text-jollof-text focus:outline-none focus:border-jollof-orange/40" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="primary" className="flex-1" onClick={handleAddNote}>Add Note</Button>
            <Button variant="secondary" onClick={() => setAddNoteOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
