import { NextResponse } from "next/server";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { serverPb } from "@/lib/pb-server";
import { bearer } from "@/lib/server/load-book";
import { epubcheckJar, run } from "@/lib/server/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface EpubcheckMessage {
  severity: string;
  message: string;
  locations?: { path?: string; line?: number }[];
}

/** POST the .epub bytes; returns EPUBCheck's findings. Signed-in users only. */
export async function POST(req: Request) {
  const token = bearer(req);
  if (!token) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  try {
    await serverPb(token).collection("users").authRefresh();
  } catch {
    return NextResponse.json({ error: "Your session has expired." }, { status: 401 });
  }
  const jar = epubcheckJar();
  if (!jar) return NextResponse.json({ available: false, error: "EPUBCheck is not installed on this server. Run scripts/setup-tools.sh." }, { status: 501 });
  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.length > 100 * 1024 * 1024) return NextResponse.json({ error: "File too large" }, { status: 413 });
  const dir = await mkdtemp(path.join(tmpdir(), "jp-epub-"));
  try {
    const file = path.join(dir, "book.epub");
    const out = path.join(dir, "report.json");
    await writeFile(file, bytes);
    await run("java", ["-jar", jar, file, "--json", out], { timeout: 110_000, maxBuffer: 20 * 1024 * 1024 }).catch(() => undefined);
    const report = JSON.parse(await readFile(out, "utf8")) as { messages: EpubcheckMessage[]; checker?: { nError?: number; nWarning?: number; nFatal?: number } };
    const messages = report.messages.map((m) => ({ severity: m.severity, message: m.message, where: m.locations?.[0]?.path ? `${m.locations[0].path}${m.locations[0].line ? `:${m.locations[0].line}` : ""}` : "" }));
    const errors = messages.filter((m) => m.severity === "ERROR" || m.severity === "FATAL").length;
    const warnings = messages.filter((m) => m.severity === "WARNING").length;
    return NextResponse.json({ available: true, ok: errors === 0, errors, warnings, messages: messages.slice(0, 200) });
  } catch (e) {
    return NextResponse.json({ error: `EPUBCheck failed to run: ${(e as Error).message}` }, { status: 500 });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
