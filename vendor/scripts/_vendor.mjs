/**
 * The vendored copy of the factory inside a project repo (`<project>/vendor/`).
 *
 * Shared by `pnpm sync` (factory side, writes it) and `vendor/scripts/vendor-check.mjs`
 * (project side, verifies it). Plain Node, no dependencies: it must run in a fresh clone
 * of a project before `pnpm install`.
 *
 * `vendor/.factory-sync.json` records the sha256 of every file the factory wrote. Any
 * difference is drift: someone edited the copy instead of the factory. Sync refuses to
 * overwrite drift unless forced, so a local fix is never lost silently.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

export const MANIFEST = ".factory-sync.json";

/** Never copied, never counted: build output, installs, OS litter. */
const SKIP = new Set(["node_modules", "dist", ".astro", ".DS_Store"]);

/** Every file under `dir`, as forward-slash paths relative to `base`. */
export function walk(dir, base = dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, base));
    else if (entry.isFile()) out.push(relative(base, full).split(sep).join("/"));
  }
  return out.sort();
}

export const hashFile = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

export function readManifest(vendorDir) {
  const file = join(vendorDir, MANIFEST);
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
}

/**
 * Compares `vendor/` with what the last sync wrote.
 * Returns { modified, added, deleted } — each a list of paths; all empty = clean.
 */
export function drift(vendorDir) {
  const manifest = readManifest(vendorDir);
  if (!manifest) return null;
  const recorded = manifest.files;
  const present = walk(vendorDir).filter((p) => p !== MANIFEST);
  const modified = [], added = [], deleted = [];
  for (const p of present) {
    if (!(p in recorded)) added.push(p);
    else if (statSync(join(vendorDir, p)).isFile() && hashFile(join(vendorDir, p)) !== recorded[p]) modified.push(p);
  }
  for (const p of Object.keys(recorded)) if (!present.includes(p)) deleted.push(p);
  return { modified, added, deleted };
}

export const isClean = (d) => d.modified.length + d.added.length + d.deleted.length === 0;

export function describeDrift(d) {
  const lines = [];
  for (const [label, list] of [["modified", d.modified], ["added", d.added], ["deleted", d.deleted]]) {
    for (const p of list) lines.push(`  ${label.padEnd(8)} vendor/${p}`);
  }
  return lines.join("\n");
}
