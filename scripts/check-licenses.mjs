// Fails when a production dependency is not permissively licensed (no GPL, AGPL, LGPL, SSPL...).
// Usage: npm run licenses
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const ALLOWED = /^(MIT|ISC|BSD-2-Clause|BSD-3-Clause|0BSD|Apache-2\.0|BlueOak-1\.0\.0|CC0-1\.0|CC-BY-4\.0|Unlicense|Python-2\.0|MIT-0|Zlib|WTFPL)$/;

// Reviewed exceptions. sharp's libvips binaries are LGPL-3.0, loaded as a separate shared library
// by Next.js's image optimiser; LGPL allows that use and it is not GPL or AGPL. "BSD" is an
// old-style BSD licence field. extend@1 (used by geopattern) has no licence field; its README says MIT.
const REVIEWED = /^(@img\/sharp-libvips-|@img\/sharp-wasm32$|duck$|extend$)/;

const tree = JSON.parse(execFileSync("npm", ["ls", "--omit=dev", "--all", "--json", "--long"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
const seen = new Map();
(function walk(deps) {
  for (const [name, d] of Object.entries(deps ?? {})) {
    if (!d.path || seen.has(d.path)) continue;
    let license = d.license;
    try {
      license ??= JSON.parse(readFileSync(path.join(d.path, "package.json"), "utf8")).license;
    } catch {}
    seen.set(d.path, { name, version: d.version, license: typeof license === "object" ? license?.type : license });
    walk(d.dependencies);
  }
})(tree.dependencies);

const ok = (l) => !!l && l.replace(/[()]/g, "").split(/\s+OR\s+/).some((part) => part.split(/\s+AND\s+/).every((x) => ALLOWED.test(x.trim())));
const bad = [...seen.values()].filter((p) => !ok(p.license) && !REVIEWED.test(p.name));
for (const p of bad) console.log(`${p.name}@${p.version}: ${p.license ?? "no licence field"}`);
console.log(`${seen.size} production packages checked, ${bad.length} need a look.`);
process.exit(bad.length ? 1 : 0);
