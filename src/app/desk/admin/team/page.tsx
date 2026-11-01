"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { call, date, Loading, PageHead, Panel, Pill, Problem, Table, Td, TONES } from "@/components/admin/kit";
import { canSee, ROLES, STAFF_ROLES, roleLabel, sectionsFor, type Section, type StaffRole } from "@/lib/admin-roles";

interface Member {
  id: string;
  email: string;
  role: StaffRole;
  note?: string;
  added_by?: string;
  created: string;
  hasAccount: boolean;
}
interface TeamData {
  owners: string[];
  staff: Member[];
}

const SECTION_LABEL: Record<Section, string> = {
  overview: "Overview",
  insights: "Insights",
  writers: "Writers",
  testers: "Testers",
  websites: "Websites",
  books: "Books",
  studio: "Jollof Studio",
  money: "Money",
  support: "Support",
  team: "Team",
  brands: "Brands",
  switches: "Switches",
  audit: "Audit log",
};

/** The people who help run Jollof Pages, and what each role lets them do. */
export default function TeamPage() {
  const [data, setData] = useState<TeamData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("support");
  const [note, setNote] = useState("");

  useEffect(() => {
    call<TeamData>("/api/admin/team")
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);
  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    try {
      setData(await call<TeamData>("/api/admin/team", body));
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5">
      <PageHead title="Team and roles" sub="Add the people who help you. They sign in with their own Jollof Pages account and see only what their role allows." />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid content-start gap-4">
          <Panel title="Add someone">
            <form
              className="grid gap-3 sm:grid-cols-[2fr_1fr_2fr_auto] sm:items-end"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await act({ action: "add", email, role, note })) {
                  setEmail("");
                  setNote("");
                }
              }}
            >
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Their email</span>
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Role</span>
                <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)} className="h-10 border border-input bg-card px-2 text-sm">
                  {STAFF_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {roleLabel(r)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Note (optional)</span>
                <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Weekend support" />
              </label>
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <UserPlus />} Add
              </Button>
            </form>
            <p className="mt-3 text-[13px] text-soft">If they don&apos;t have an account yet, they sign up at jollofpages.com with this email. Then Admin appears in their account menu.</p>
          </Panel>
          {error && <Problem text={error} />}
          {!data ? (
            !error && <Loading what="Loading the team" />
          ) : (
            <Table head={["Person", "Role", "Account", "Added", ""]} min={640}>
              {data.owners.map((o) => (
                <tr key={o} className="border-b border-border">
                  <Td className="font-medium text-ink">{o}</Td>
                  <Td>
                    <Pill cls={TONES.dark}>Owner</Pill>
                  </Td>
                  <Td className="text-ink-2">Set on the server</Td>
                  <Td />
                  <Td />
                </tr>
              ))}
              {data.staff.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <Td>
                    <p className="font-medium text-ink">{m.email}</p>
                    {m.note && <p className="text-[12.5px] text-soft">{m.note}</p>}
                  </Td>
                  <Td>
                    <select
                      value={m.role}
                      disabled={busy}
                      onChange={(e) => act({ action: "role", id: m.id, role: e.target.value })}
                      aria-label={`Role for ${m.email}`}
                      className="h-8 border border-input bg-card px-2 text-sm"
                    >
                      {STAFF_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {roleLabel(r)}
                        </option>
                      ))}
                    </select>
                  </Td>
                  <Td>{m.hasAccount ? <Pill cls={TONES.good}>Signed up</Pill> : <Pill cls={TONES.warn}>No account yet</Pill>}</Td>
                  <Td className="whitespace-nowrap text-ink-2">
                    {date(m.created)}
                    {m.added_by && <span className="block text-[12px] text-soft">by {m.added_by}</span>}
                  </Td>
                  <Td>
                    <button
                      type="button"
                      title={`Remove ${m.email}`}
                      disabled={busy}
                      onClick={() => window.confirm(`Take ${m.email} off the team?`) && act({ action: "remove", id: m.id })}
                      className="p-1.5 text-ink-2 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </div>

        <Panel title="What each role can do">
          <ul className="grid gap-4">
            {ROLES.map((r) => (
              <li key={r.id}>
                <p className="font-medium text-ink">{r.label}</p>
                <p className="text-sm text-ink-2">{r.about}</p>
                <p className="mt-1 flex flex-wrap gap-1">
                  {sectionsFor(r.id).map((s) => (
                    <Pill key={s} cls={canSee(r.id, s) ? TONES.quiet : ""}>
                      {SECTION_LABEL[s]}
                    </Pill>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
