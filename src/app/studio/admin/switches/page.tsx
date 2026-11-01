"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { call, Loading, PageHead, Problem, Toggle, useAdmin } from "@/components/admin/kit";
import { can } from "@/lib/admin-roles";
import { FLAGS, type FlagKey, type Flags } from "@/lib/flags";

type State = { flags: Flags; ready: Record<FlagKey, boolean> };

/** Settings > Switches: site-wide features the owner turns on when they are ready for them. */
export default function SwitchesPage() {
  const { home, reload } = useAdmin();
  const manage = can(home.me.role, "flags.manage");
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<FlagKey | "">("");

  useEffect(() => {
    call<State>("/api/admin/switches")
      .then(setState)
      .catch((e: Error) => setError(e.message));
  }, []);

  const flip = async (key: FlagKey, on: boolean) => {
    setBusy(key);
    setError("");
    try {
      setState(await call<State>("/api/admin/switches", { key, on }));
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  if (!state) return error ? <Problem text={error} /> : <Loading what="Loading switches" />;

  return (
    <div className="grid gap-5">
      <PageHead title="Switches" sub="Features for the whole site that you turn on when you're ready. While one is off, the site says it's coming soon. Every change goes in the audit log." />
      {error && <Problem text={error} />}
      {!manage && <p className="text-sm text-soft">Your role can see these switches but not change them.</p>}
      <ul className="grid gap-3">
        {(Object.keys(FLAGS) as FlagKey[]).map((key) => {
          const f = FLAGS[key];
          const on = state.flags[key];
          return (
            <li key={key} className="grid gap-3 border border-border bg-card p-4 sm:grid-cols-[1fr_auto] sm:items-start">
              <div className="grid gap-1.5">
                <p className="font-semibold text-ink">{f.label}</p>
                <p className="text-sm text-ink-2">{f.about}</p>
                {!on && (
                  <p className="flex items-start gap-2 bg-muted/60 p-2.5 text-[13px] text-ink">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{f.before} Until then the site shows &ldquo;coming soon&rdquo;.</span>
                  </p>
                )}
                {on && !state.ready[key] && <p className="text-[13px] text-destructive">Switched on, but the Name.com login isn&apos;t set on the server, so it still shows as coming soon.</p>}
              </div>
              <span className="inline-flex items-center gap-2">
                <Toggle on={on} busy={busy === key} disabled={!manage} label={f.label} onChange={(v) => flip(key, v)} />
                <span className="text-[13px] text-ink-2">{on ? "On" : "Off"}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
