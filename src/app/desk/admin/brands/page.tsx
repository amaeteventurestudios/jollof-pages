"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Palette, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { call, Loading, num, PageHead, Panel, Pill, Problem, TONES } from "@/components/admin/kit";
import { money } from "@/lib/admin";
import { pb } from "@/lib/pb";

interface BrandRow {
  id: string;
  name: string;
  domain: string;
  tagline?: string;
  logoUrl: string;
  color?: string;
  support_email?: string;
  price_cents?: number;
  active?: boolean;
  writers: number;
  paid: number;
  earnedCents: number;
}
interface Data {
  root: string;
  serverIp: string;
  home: { writers: number; paid: number; earnedCents: number };
  brands: BrandRow[];
}

/** Brands (white label): the same studio under another name, on another domain, at another price. */
export default function BrandsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  useEffect(() => {
    call<Data>("/api/admin/brands")
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);
  if (error && !data) return <Problem text={error} />;
  if (!data) return <Loading what="Loading brands" />;

  const remove = async (b: BrandRow) => {
    if (!window.confirm(`Delete ${b.name}? This can't be undone.`)) return;
    try {
      setData(await call<Data>("/api/admin/brands", { action: "delete", id: b.id }));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="grid gap-5">
      <PageHead title="Brands" sub="Run the same Desk under another name: its own domain, logo, colour and price. Writers on a brand never see the Jollof Pages name.">
        <Button onClick={() => setEditing("new")}>
          <Plus /> Add a brand
        </Button>
      </PageHead>
      {error && <Problem text={error} />}
      {editing === "new" && <BrandForm onSaved={(d) => (setData(d), setEditing(null))} onCancel={() => setEditing(null)} />}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div className="border border-border bg-card p-4">
          <p className="flex items-center gap-2 font-semibold text-ink">
            <span className="size-4 bg-[#ad3a17]" aria-hidden /> Jollof Pages
            <Pill cls={TONES.dark}>Your own</Pill>
          </p>
          <p className="mt-1 text-sm text-soft">{data.root}</p>
          <Stats s={data.home} />
        </div>
        {data.brands.map((b) =>
          editing === b.id ? (
            <div key={b.id} className="md:col-span-2 xl:col-span-3">
              <BrandForm brand={b} onSaved={(d) => (setData(d), setEditing(null))} onCancel={() => setEditing(null)} />
            </div>
          ) : (
            <div key={b.id} className="border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                {b.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.logoUrl} alt="" className="size-10 object-contain" />
                ) : (
                  <span className="grid size-10 place-items-center text-white" style={{ background: b.color || "#555" }}>
                    <Palette className="size-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                    {b.name} {b.active ? <Pill cls={TONES.good}>On</Pill> : <Pill cls={TONES.quiet}>Off</Pill>}
                  </p>
                  <a href={`https://${b.domain}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    {b.domain} <ExternalLink className="size-3.5" />
                  </a>
                  {b.tagline && <p className="text-[13px] text-soft">{b.tagline}</p>}
                </div>
                <button type="button" title="Edit" onClick={() => setEditing(b.id)} className="p-1.5 text-ink-2 hover:text-primary">
                  <Pencil className="size-4" />
                </button>
                {!b.writers && (
                  <button type="button" title="Delete" onClick={() => remove(b)} className="p-1.5 text-ink-2 hover:text-destructive">
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
              <Stats s={b} price={b.price_cents} />
            </div>
          ),
        )}
      </div>

      <Panel title="Putting a brand live" sub="Do this once per brand, in the DNS settings of the brand's domain (Cloudflare or wherever it's registered)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-border text-[12.5px] text-soft">
              <tr>
                {["Type", "Name", "Value", "Proxy", "TTL", "What it's for"].map((h) => (
                  <th key={h} className="px-2 py-1.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono text-[13px]">
              <tr className="border-b border-border">
                <td className="px-2 py-2">A</td>
                <td className="px-2 py-2">@</td>
                <td className="px-2 py-2">{data.serverIp || "your server's IP"}</td>
                <td className="px-2 py-2">DNS only</td>
                <td className="px-2 py-2">Auto</td>
                <td className="px-2 py-2 font-sans text-ink-2">The brand&apos;s Desk and sign-in</td>
              </tr>
              <tr>
                <td className="px-2 py-2">A</td>
                <td className="px-2 py-2">*</td>
                <td className="px-2 py-2">{data.serverIp || "your server's IP"}</td>
                <td className="px-2 py-2">DNS only</td>
                <td className="px-2 py-2">Auto</td>
                <td className="px-2 py-2 font-sans text-ink-2">Every writer&apos;s website, like ada.brand.com</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[13px] text-soft">
          Then switch the brand on here. The secure certificate is made automatically the first time someone opens the address. Payments still go to your Stripe account; emails still come from your
          Jollof Pages address.
        </p>
      </Panel>
    </div>
  );
}

function Stats({ s, price }: { s: { writers: number; paid: number; earnedCents: number }; price?: number }) {
  return (
    <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-sm">
      <div>
        <dt className="text-[12px] text-soft">Writers</dt>
        <dd className="font-semibold text-ink tabular-nums">{num(s.writers)}</dd>
      </div>
      <div>
        <dt className="text-[12px] text-soft">Paid</dt>
        <dd className="font-semibold text-ink tabular-nums">{num(s.paid)}</dd>
      </div>
      <div>
        <dt className="text-[12px] text-soft">Earned{price ? ` at ${money(price)}` : ""}</dt>
        <dd className="font-semibold text-ink tabular-nums">{money(s.earnedCents)}</dd>
      </div>
    </dl>
  );
}

function BrandForm({ brand, onSaved, onCancel }: { brand?: BrandRow; onSaved: (d: Data) => void; onCancel: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [color, setColor] = useState(brand?.color || "#1d4f91");
  return (
    <form
      className="grid gap-4 border border-primary/50 bg-card p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr("");
        const body = new FormData(e.currentTarget);
        body.set("id", brand?.id ?? "");
        body.set("color", color);
        body.set("active", (e.currentTarget.elements.namedItem("active") as HTMLInputElement).checked ? "true" : "false");
        try {
          const res = await fetch("/api/admin/brands", { method: "POST", headers: { Authorization: `Bearer ${pb().authStore.token}` }, body });
          const j = (await res.json()) as Data & { error?: string };
          if (!res.ok) throw new Error(j.error || "Could not save the brand.");
          onSaved(j);
        } catch (e2) {
          setErr((e2 as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="font-semibold text-ink">{brand ? `Edit ${brand.name}` : "Add a brand"}</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Name writers see</span>
          <Input name="name" required maxLength={80} defaultValue={brand?.name} placeholder="Ada's Writing Studio" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Domain</span>
          <Input name="domain" required defaultValue={brand?.domain} placeholder="writewithada.com" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Tagline (optional)</span>
          <Input name="tagline" maxLength={160} defaultValue={brand?.tagline} placeholder="Write and publish your book" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Brand colour</span>
          <span className="flex gap-2">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-12 border border-input bg-card" aria-label="Pick a colour" />
            <Input value={color} onChange={(e) => setColor(e.target.value)} maxLength={7} />
          </span>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Desk price in dollars</span>
          <Input name="price" type="number" min={0} step="0.01" defaultValue={brand?.price_cents ? (brand.price_cents / 100).toFixed(2) : ""} placeholder="129 (the Jollof Pages price)" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Support email (optional)</span>
          <Input name="support_email" type="email" defaultValue={brand?.support_email} placeholder="help@writewithada.com" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Logo (PNG, SVG or WebP, under 2 MB)</span>
          <input name="logo" type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" className="text-sm" />
        </label>
        <label className="flex items-center gap-2 self-end text-sm">
          <input name="active" type="checkbox" defaultChecked={brand ? Boolean(brand.active) : false} className="size-4" />
          <span>On: the domain opens this brand&apos;s Desk</span>
        </label>
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Save brand
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
