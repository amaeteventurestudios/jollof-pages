"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { call, Loading, num, PageHead, Pill, Problem, Table, Td, Tile, TONES, useAdmin } from "@/components/admin/kit";
import { can } from "@/lib/admin-roles";
import type { AccessPerson } from "@/lib/studio-admin";
import { cn } from "@/lib/utils";

type App = keyof AccessPerson["apps"];
const APPS: { id: App; label: string; about: string }[] = [
  { id: "studio", label: "Jollof Studio", about: "The design tool at studio.jollofpages.com. On for everyone unless you switch it off." },
  { id: "aiWriter", label: "AI writer", about: "The AI co-writing app. Off until you switch it on for someone." },
];

/** An on/off switch: square, like the rest of the admin. */
function Toggle({ on, busy, disabled, label, onChange }: { on: boolean; busy: boolean; disabled: boolean; label: string; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled || busy}
      onClick={() => onChange(!on)}
      className={cn("relative inline-flex h-6 w-11 shrink-0 items-center border transition-colors disabled:opacity-50", on ? "border-primary bg-primary" : "border-border bg-paper-3")}
    >
      <span className={cn("absolute size-4 bg-card shadow-sm transition-transform", on ? "translate-x-[22px]" : "translate-x-[3px]")} />
    </button>
  );
}

/**
 * Writers > Access: which apps each person may use, one switch per app. Jollof Pages and Jollof
 * Studio keep separate accounts, so the list joins them by email: everyone from both is here.
 */
export default function AccessPage() {
  const { home } = useAdmin();
  const manage = can(home.me.role, "writer.apps");
  const [list, setList] = useState<AccessPerson[] | null>(null);
  const [studioError, setStudioError] = useState("");
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  useEffect(() => {
    call<{ people: AccessPerson[]; studioError: string }>("/api/admin/access")
      .then((j) => {
        setList(j.people);
        setStudioError(j.studioError);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const flip = async (w: AccessPerson, app: App, on: boolean) => {
    setBusy(`${w.email}-${app}`);
    setError("");
    try {
      await call("/api/admin/access", { email: w.email, app, on });
      setList((all) => (all ?? []).map((x) => (x.email === w.email ? { ...x, apps: { ...x.apps, [app]: on } } : x)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  if (!list) return error ? <Problem text={error} /> : <Loading what="Loading writers" />;
  const needle = q.trim().toLowerCase();
  const shown = list.filter((w) => !needle || `${w.email} ${w.name}`.toLowerCase().includes(needle));

  return (
    <div className="grid gap-5">
      <PageHead
        title="Access"
        sub="Everyone with a Jollof Pages or Jollof Studio account, matched by email. Switch Jollof Studio and the AI writer on or off for each one. Every change goes in the audit log."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {APPS.map((a) => (
          <Tile key={a.id} label={a.label} value={`${num(list.filter((w) => w.apps[a.id] && !w.suspended).length)} of ${num(list.length)}`} sub={a.about} />
        ))}
      </div>
      {studioError && <Problem text={`Showing Jollof Pages accounts only. ${studioError}`} />}
      {error && <Problem text={error} />}
      {!manage && <p className="text-sm text-soft">Your role can see these switches but not change them.</p>}
      <div className="relative max-w-md">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-soft" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email or name" aria-label="Search writers" className="pl-9" />
      </div>
      <Table head={["Person", "Has an account in", "Jollof Studio", "AI writer", "Note"]} min={760} empty={!shown.length && "No one matches."}>
        {shown.map((w) => (
          <tr key={w.email} className="border-b border-border last:border-0">
            <Td>
              <p className="font-medium text-ink">{w.name || w.email.split("@")[0]}</p>
              <p className="text-[12.5px] text-soft">{w.email}</p>
            </Td>
            <Td>
              <span className="flex flex-wrap gap-1">
                {w.writerId && <Pill cls={TONES.brand}>Jollof Pages</Pill>}
                {w.inStudio && <Pill cls={TONES.info}>Jollof Studio</Pill>}
                {!w.writerId && !w.inStudio && <Pill cls={TONES.quiet}>Neither yet</Pill>}
              </span>
            </Td>
            {APPS.map((a) => (
              <Td key={a.id}>
                <span className="flex items-center gap-2">
                  <Toggle on={w.apps[a.id]} busy={busy === `${w.email}-${a.id}`} disabled={!manage || w.suspended} label={`${a.label} for ${w.email}`} onChange={(on) => flip(w, a.id, on)} />
                  <span className="text-[13px] text-ink-2">{w.apps[a.id] ? "On" : "Off"}</span>
                </span>
              </Td>
            ))}
            <Td className="text-[13px] text-soft">{w.suspended ? "Suspended: no apps until you lift it" : ""}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
