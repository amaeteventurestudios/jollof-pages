"use client";

import { useState } from "react";
import { AlertTriangle, Check, Copy, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CoverGeometry } from "@/lib/kdp";
import { DPI, artPrompts, artSpec, type Check as PreflightCheck } from "@/lib/cover-kit";
import { cn } from "@/lib/utils";

const RED = "#ff2d55";
const BLUE = "#008bd8";

/**
 * A layout guide at print size for an image tool or an editor such as Canva: bleed (or a
 * hardcover's wrap), trim, safe area, spine and barcode, labelled with their measurements. "front"
 * is the front panel alone.
 */
function drawTemplate(g: CoverGeometry, part: "wrap" | "front"): HTMLCanvasElement {
  const spec = artSpec(g);
  const E = g.edge;
  const hard = g.binding === "hardcover";
  const wIn = part === "wrap" ? g.width : spec.front.width;
  const hIn = g.height;
  const ox = part === "wrap" ? 0 : -g.frontX; // shift so the front panel starts at the spine fold
  const c = document.createElement("canvas");
  c.width = Math.ceil(wIn * DPI);
  c.height = Math.ceil(hIn * DPI);
  const x = c.getContext("2d")!;
  const P = (inches: number) => inches * DPI;
  const X = (inches: number) => P(inches + ox);
  const font = (size: number, weight = 600) => `${weight} ${P(size)}px Inter, Arial, sans-serif`;

  x.fillStyle = "#ffffff";
  x.fillRect(0, 0, c.width, c.height);
  // panels
  const panel = (from: number, width: number, fill: string, label: string, sub: string) => {
    x.fillStyle = fill;
    x.fillRect(X(from), 0, P(width), c.height);
    x.fillStyle = "#1c1a17";
    x.textAlign = "center";
    x.font = font(0.36, 800);
    x.fillText(label, X(from + width / 2), P(hIn / 2) - P(0.1));
    x.font = font(0.16, 500);
    x.fillText(sub, X(from + width / 2), P(hIn / 2) + P(0.25));
  };
  const panelSub = `${spec.front.px.width} x ${spec.front.px.height} px with ${hard ? "wrap" : "bleed"}`;
  if (part === "wrap") panel(0, g.spineX, "#f2efe9", "BACK", panelSub);
  panel(g.frontX, g.width - g.frontX, "#eef3f7", "FRONT", panelSub);
  if (part === "wrap") {
    x.fillStyle = "#fbe9d0";
    x.fillRect(X(g.spineX), 0, P(g.spine), c.height);
    x.save();
    x.translate(X(g.spineX + g.spine / 2), P(hIn / 2));
    x.rotate(Math.PI / 2);
    x.fillStyle = "#1c1a17";
    x.textAlign = "center";
    x.font = font(Math.min(0.16, g.spine * 0.45), 700);
    x.fillText(`SPINE ${g.spine.toFixed(3)} in${hard ? " with boards" : ""}${g.spineTextAllowed ? "" : " (no text under 79 pages)"}`, 0, P(Math.min(0.06, g.spine * 0.15)));
    x.restore();
  }
  // bleed band, cut off when trimmed; on a hardcover, the wrap that folds inside the boards
  x.fillStyle = "rgba(255,45,85,0.18)";
  x.fillRect(0, 0, c.width, P(E));
  x.fillRect(0, c.height - P(E), c.width, P(E));
  x.fillRect(c.width - P(E), 0, P(E), c.height);
  if (part === "wrap") x.fillRect(0, 0, P(E), c.height);
  // trim (board edge) and folds
  x.strokeStyle = RED;
  x.lineWidth = P(0.012);
  x.setLineDash([P(0.06), P(0.04)]);
  x.strokeRect(part === "wrap" ? P(E) : 0, P(E), part === "wrap" ? c.width - 2 * P(E) : c.width - P(E), c.height - 2 * P(E));
  x.setLineDash([]);
  if (part === "wrap")
    for (const at of [g.spineX, g.frontX]) {
      x.beginPath();
      x.moveTo(X(at), 0);
      x.lineTo(X(at), c.height);
      x.stroke();
    }
  // safe areas
  x.strokeStyle = BLUE;
  x.lineWidth = P(0.01);
  x.setLineDash([P(0.03), P(0.03)]);
  const safe = (r: CoverGeometry["safeFront"]) => x.strokeRect(X(r.x), P(r.y), P(r.width), P(r.height));
  safe(g.safeFront);
  if (part === "wrap") safe(g.safeBack);
  x.setLineDash([]);
  if (part === "wrap") {
    x.fillStyle = "#ffffff";
    x.fillRect(X(g.barcode.x), P(g.barcode.y), P(g.barcode.width), P(g.barcode.height));
    x.strokeStyle = RED;
    x.strokeRect(X(g.barcode.x), P(g.barcode.y), P(g.barcode.width), P(g.barcode.height));
    x.fillStyle = RED;
    x.textAlign = "center";
    x.font = font(0.13);
    x.fillText("BARCODE (KDP)", X(g.barcode.x + g.barcode.width / 2), P(g.barcode.y + g.barcode.height / 2 + 0.04));
  }
  // legend
  x.textAlign = "left";
  x.font = font(0.12, 600);
  x.fillStyle = RED;
  const lx = X(g.safeFront.x + 0.05);
  x.fillText(hard ? `Red band: ${E.toFixed(3)} in wrap, folds inside the boards.` : "Red band: bleed, cut off. Dashed red: trim and folds.", lx, P(g.safeFront.y + 0.25));
  if (hard) x.fillText("Dashed red: board edges and spine hinges.", lx, P(g.safeFront.y + 0.45));
  x.fillStyle = BLUE;
  x.fillText("Dashed blue: keep words and faces inside.", lx, P(g.safeFront.y + (hard ? 0.65 : 0.45)));
  return c;
}

function downloadCanvas(c: HTMLCanvasElement, name: string) {
  c.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, "image/png");
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        });
      }}
    >
      {done ? <Check /> : <Copy />} {done ? "Copied" : label}
    </Button>
  );
}

const ICON = { ok: Check, warn: AlertTriangle, fail: X };
const TONE = { ok: "text-ok", warn: "text-caution", fail: "text-destructive" };

/** Everything needed to make cover art in ChatGPT or Nano Banana that KDP accepts, and a check before export. */
export function CoverKit({
  g,
  slug,
  book,
  lettering,
  checks,
}: {
  g: CoverGeometry;
  slug: string;
  book: { title: string; subtitle?: string; author: string };
  lettering: boolean;
  checks: PreflightCheck[];
}) {
  const spec = artSpec(g);
  const prompts = artPrompts(spec, book, lettering);
  const failing = checks.filter((c) => c.state === "fail").length;
  const rows: [string, string, string][] = [
    ["Front artwork", `${spec.front.px.width} x ${spec.front.px.height} px`, `${spec.front.width.toFixed(3)} x ${spec.front.height.toFixed(3)} in, ask for ${spec.front.ratio}`],
    ["Back artwork", `${spec.back.px.width} x ${spec.back.px.height} px`, `same size as the front`],
    ["Spine", `${spec.spine.px} px wide`, `${g.spine.toFixed(4)} in${g.binding === "hardcover" ? " including the boards" : ""}, made by the Desk`],
    ["Whole wrap", `${spec.wrap.px.width} x ${spec.wrap.px.height} px`, `${g.width.toFixed(3)} x ${g.height.toFixed(3)} in, if you design it in one piece`],
  ];
  return (
    <div className="mt-8 grid gap-8 xl:grid-cols-2">
      <section aria-labelledby="kit-title" className="grid content-start gap-4">
        <div>
          <h2 id="kit-title" className="text-lg font-semibold">
            Make the art in ChatGPT or Nano Banana
          </h2>
          <p className="mt-1 text-sm text-soft">
            Make the front and back as two pictures. The Desk adds the spine, the back text, the bleed and the barcode space, and sizes all of it from your page count. At 300 dpi, the size KDP asks
            for:
          </p>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([k, v, note]) => (
              <tr key={k} className="border-b border-border align-top">
                <th scope="row" className="py-2 pr-3 text-left font-medium">
                  {k}
                </th>
                <td className="py-2 pr-3 font-semibold whitespace-nowrap tabular-nums">{v}</td>
                <td className="py-2 text-soft">{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[13px] text-soft">
          Image tools make {spec.front.ratio} pictures, so the Desk trims about {spec.front.cropPercent}% to fit. ChatGPT pictures (1024 x 1536 px) are too small to print sharp at this size; use
          Nano Banana&apos;s 4K setting, or upscale before you upload. The check on the right reads the real size of what you upload.
        </p>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={prompts.front} label="Copy front prompt" />
          <CopyButton text={prompts.back} label="Copy back prompt" />
          <Button type="button" size="sm" variant="outline" onClick={() => downloadCanvas(drawTemplate(g, "wrap"), `${slug}-kdp-${g.binding === "hardcover" ? "hardcover-" : ""}wrap-template.png`)}>
            <Download /> Wrap template
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => downloadCanvas(drawTemplate(g, "front"), `${slug}-kdp-${g.binding === "hardcover" ? "hardcover-" : ""}front-template.png`)}>
            <Download /> Front template
          </Button>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">Read the front prompt</summary>
          <p className="mt-2 bg-paper-2 p-3 text-ink-2">{prompts.front}</p>
        </details>
      </section>

      <section aria-labelledby="check-title" className="grid content-start gap-3">
        <div>
          <h2 id="check-title" className="text-lg font-semibold">
            KDP check
          </h2>
          <p className="mt-1 text-sm text-soft" role="status">
            {failing ? `${failing} ${failing === 1 ? "thing" : "things"} to fix before you upload to KDP.` : "Nothing here would stop KDP accepting this cover."}
          </p>
        </div>
        <ul className="grid gap-2">
          {checks.map((c) => {
            const Icon = ICON[c.state];
            return (
              <li key={c.label} className="flex gap-3 bg-card p-3 text-sm">
                <Icon className={cn("mt-0.5 size-4 shrink-0", TONE[c.state])} aria-label={c.state === "ok" ? "Passes" : c.state === "warn" ? "Check" : "Fix"} />
                <span>
                  <span className="font-medium">{c.label}.</span> <span className="text-ink-2">{c.detail}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
