"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ago, call, CsvButton, Loading, num, PageHead, Panel, Pill, Problem, short, Table, Td, Tile, TONES } from "@/components/admin/kit";
import { STUDIO_ADMIN_URL, type StudioSummary } from "@/lib/studio-admin";

type Show = "overview" | "people" | "designs";

/**
 * Admin > Jollof Studio: the design tool's people and numbers, read from Studio itself, so the
 * owner runs both apps from this one panel. Counts and titles only, never what's in a design.
 */
export default function StudioAdminPage() {
  const [show] = useState<Show>(() => {
    const s = new URLSearchParams(window.location.search).get("show");
    return s === "people" || s === "designs" ? s : "overview";
  });
  const [data, setData] = useState<StudioSummary | null>(null);
  const [active30, setActive30] = useState(0);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    call<{ studio: StudioSummary }>("/api/admin/studio")
      .then((j) => {
        setData(j.studio);
        const since = Date.now() - 30 * 864e5;
        setActive30(j.studio.people.filter((p) => new Date(p.lastActive.replace(" ", "T")).getTime() > since).length);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const head = (
    <PageHead title="Jollof Studio" sub="The design tool at studio.jollofpages.com. Its accounts are separate from Jollof Pages; switch anyone's access on Writers > Access.">
      <a href={STUDIO_ADMIN_URL} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 border border-border bg-card px-3 text-sm font-medium text-ink hover:border-primary">
        Studio&apos;s own admin <ExternalLink className="size-3.5" />
      </a>
    </PageHead>
  );
  if (!data)
    return (
      <div className="grid gap-5">
        {head}
        {error ? <Problem text={error} /> : <Loading what="Asking Jollof Studio" />}
      </div>
    );

  const t = data.totals;
  const needle = q.trim().toLowerCase();
  const people = data.people.filter((p) => !needle || `${p.email} ${p.name}`.toLowerCase().includes(needle));

  const peopleTable = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-md flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-soft" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email or name" aria-label="Search Studio accounts" className="pl-9" />
        </div>
        <CsvButton name="jollof-studio-people" rows={() => people.map((p) => ({ ...p }))} />
        <Link href="/studio/admin/writers/access" className="text-sm font-medium text-primary hover:underline">
          Switch access
        </Link>
      </div>
      <Table
        head={[
          "Person",
          "Sign-in",
          "Joined",
          "Last active",
          { label: "Designs", right: true },
          { label: "Uploads", right: true },
          { label: "AI asks", right: true },
          { label: "AI pictures", right: true },
        ]}
        empty={!people.length && "No one matches."}
      >
        {people.map((p) => (
          <tr key={p.email} className="border-b border-border last:border-0">
            <Td>
              <p className="font-medium text-ink">{p.name || p.email.split("@")[0]}</p>
              <p className="text-[12.5px] text-soft">{p.email}</p>
            </Td>
            <Td>{p.google ? <Pill cls={TONES.info}>Google</Pill> : p.verified ? <Pill cls={TONES.good}>Email checked</Pill> : <Pill cls={TONES.warn}>Not checked</Pill>}</Td>
            <Td className="text-[13px] whitespace-nowrap text-soft">{ago(p.created)}</Td>
            <Td className="text-[13px] whitespace-nowrap text-soft">{ago(p.lastActive)}</Td>
            <Td right>{num(p.designs)}</Td>
            <Td right>{num(p.uploads)}</Td>
            <Td right>{num(p.aiRequests)}</Td>
            <Td right>{num(p.aiPictures)}</Td>
          </tr>
        ))}
      </Table>
    </>
  );

  const designsTable = (
    <Table head={["Design", "By", { label: "Pages", right: true }, "Edited"]} min={560} empty={!data.recentDesigns.length && "No designs yet."}>
      {data.recentDesigns.map((d, i) => (
        <tr key={i} className="border-b border-border last:border-0">
          <Td className="font-medium text-ink">{d.title}</Td>
          <Td className="text-[13px] text-soft">{d.owner}</Td>
          <Td right>{num(d.pages)}</Td>
          <Td className="text-[13px] whitespace-nowrap text-soft">{ago(d.updated)}</Td>
        </tr>
      ))}
    </Table>
  );

  return (
    <div className="grid gap-5">
      {head}
      {show === "overview" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Tile label="People" value={num(t.people)} sub={`${num(active30)} active in the last 30 days`} href="/studio/admin/studio?show=people" />
            <Tile label="Designs" value={num(t.designs)} sub={`${num(t.versions)} saved versions`} href="/studio/admin/studio?show=designs" />
            <Tile label="Uploads" value={num(t.uploads)} sub={`${num(t.brandKits)} brand kits`} />
            <Tile label="AI asks" value={num(t.aiRequests)} sub={`${num(t.aiPictures)} pictures made, ${short(t.aiTokens)} tokens`} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Tile label="Share links" value={num(t.shareLinks)} sub={`${num(t.shareVisits)} visits`} />
            <Tile label="Live rooms" value={num(t.liveRooms)} sub="Presenter remotes and Q&A" />
            <Tile label="AI agent keys" value={num(t.agentKeys)} sub="Connected AI assistants" />
          </div>
          <Panel title="Latest designs" sub="Titles only, never what's inside.">
            {designsTable}
          </Panel>
        </>
      )}
      {show === "people" && peopleTable}
      {show === "designs" && designsTable}
    </div>
  );
}
