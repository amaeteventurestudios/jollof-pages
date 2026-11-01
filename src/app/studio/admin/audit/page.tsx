"use client";

import { useEffect, useState } from "react";
import { call, Loading, PageHead, Pill, Problem, Table, Td, TONES } from "@/components/admin/kit";
import type { AuditRow } from "@/app/api/admin/audit/route";
import { cn } from "@/lib/utils";

const ACTION: Record<string, string> = {
  "writer.comp": "Gave free access",
  "writer.uncomp": "Took back free access",
  "writer.credits": "Gave AI credits",
  "writer.password": "Set a temporary password",
  "writer.suspend": "Suspended an account",
  "writer.unsuspend": "Lifted a suspension",
  "writer.app_on": "Switched an app on",
  "writer.app_off": "Switched an app off",
  "writer.delete": "Deleted an account",
  "site.offline": "Took a website offline",
  "site.online": "Put a website back online",
  "testers.create": "Made a tester link",
  "testers.revoke": "Switched off a tester link",
  "testers.restore": "Switched a tester link back on",
  "team.add": "Added to the team",
  "team.role": "Changed a role",
  "team.remove": "Removed from the team",
  "brand.save": "Saved a brand",
  "brand.delete": "Deleted a brand",
};
const tone = (a: string) => (/delete|suspend|offline|remove/.test(a) ? TONES.bad : a.startsWith("team") || a.startsWith("brand") ? TONES.dark : TONES.quiet);
const when = (iso: string) => new Date(iso.replace(" ", "T")).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

/** Every change made in the admin, who made it and when. Only the owner sees it. */
export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ rows: AuditRow[]; pages: number; total: number } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    call<{ rows: AuditRow[]; pages: number; total: number }>(`/api/admin/audit?page=${page}`)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [page]);
  if (error) return <Problem text={error} />;
  if (!data) return <Loading what="Loading the log" />;
  return (
    <div className="grid gap-5">
      <PageHead title="Audit log" sub={`Every change made in the admin, newest first. ${data.total.toLocaleString()} in all.`} />
      <Table head={["When", "Who", "Did", "To", "Details"]} min={820} empty={!data.rows.length && "Nothing has been changed in the admin yet."}>
        {data.rows.map((r) => (
          <tr key={r.id} className="border-b border-border last:border-0">
            <Td className="whitespace-nowrap text-ink-2">{when(r.created)}</Td>
            <Td>
              {r.actor} <span className="text-[12px] text-soft">{r.role}</span>
            </Td>
            <Td>
              <Pill cls={tone(r.action)}>{ACTION[r.action] ?? r.action}</Pill>
            </Td>
            <Td>{r.target_label}</Td>
            <Td className="text-ink-2">{r.detail}</Td>
          </tr>
        ))}
      </Table>
      {data.pages > 1 && (
        <div className="flex items-center gap-2 text-sm">
          {Array.from({ length: Math.min(data.pages, 20) }, (_, i) => i + 1).map((p) => (
            <button key={p} type="button" onClick={() => setPage(p)} className={cn("size-8 border", p === page ? "border-ink bg-ink text-card" : "border-border bg-card")}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
