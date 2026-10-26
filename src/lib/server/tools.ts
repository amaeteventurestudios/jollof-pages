import "server-only";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

export const run = promisify(execFile);

const ROOT = process.cwd();

export function typstBin(): string {
  if (process.env.TYPST_BIN) return process.env.TYPST_BIN;
  const local = path.join(ROOT, "tools", "typst");
  return existsSync(local) ? local : "typst";
}

export function fontPath(): string {
  return process.env.TYPST_FONT_PATH || path.join(ROOT, "fonts");
}

export function epubcheckJar(): string | null {
  const p = process.env.EPUBCHECK_JAR || path.join(ROOT, "tools", "epubcheck", "epubcheck.jar");
  return existsSync(p) ? p : null;
}
