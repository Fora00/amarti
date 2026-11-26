import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import type { DemoManifest } from "./manifest.ts";

export interface BuildOptions {
  /** "/" on a custom domain or locally; "/<repo>/" on a GitHub project page. */
  base: string;
  /** noindex preview: sets the manifest's `demoEnv`. */
  demo: boolean;
  /** Local demo: sets `localEnv`; only valid at base "/". */
  local: boolean;
}

/** Where a build lands under `deploy/`. Shared with `pnpm demo --no-build`, which serves the local one. */
export const localFolder = (name: string, local: boolean) => (local ? `${name}-local` : name);

/** "/", "repo" or "/repo" → "/" or "/repo/". Astro's `base` is picky about slashes. */
export function normalizeBase(input: string): string {
  const trimmed = input.replace(/^\/+|\/+$/g, "");
  return trimmed === "" ? "/" : `/${trimmed}/`;
}

/**
 * Builds every package of a site and merges them into `deploy/<name>/`:
 * the "/" package at the root, the others under their mount. Nested mounts are
 * copied after the root so they cannot be overwritten by it.
 */
export function buildSite(root: string, manifest: DemoManifest, opts: BuildOptions): string {
  const base = normalizeBase(opts.base);
  if (opts.local && base !== "/") throw new Error("--local needs base /: the demo server serves the build at the root.");

  // A local build is a demo too: noindex and `Disallow: /`, so even if its folder were
  // pushed by mistake (its forms point at the mock backend) it could not be indexed.
  const extra = { ...(opts.demo || opts.local ? manifest.demoEnv : {}), ...(opts.local ? manifest.localEnv : {}) };
  const mountUnder = (mount: string) => `${base}${mount.replace(/^\//, "")}`;

  for (const b of manifest.builds) {
    const env = { ...process.env, ...extra, [b.baseEnv]: mountUnder(b.mount) };
    console.log(`\n▸ building ${b.package} (base ${env[b.baseEnv]})`);
    execFileSync("pnpm", ["--filter", b.package, "build"], { cwd: root, env, stdio: "inherit" });
  }

  // Its own folder: `deploy/<name>/` is what gets pushed; `deploy/<name>-local/` never is.
  const out = join(root, "deploy", localFolder(manifest.name, opts.local));
  // Emptied, not deleted: `deploy/<name>/` may be the git repo that GitHub Pages serves,
  // and wiping its `.git` would silently disconnect it from the remote.
  mkdirSync(out, { recursive: true });
  for (const entry of readdirSync(out)) if (entry !== ".git") rmSync(join(out, entry), { recursive: true, force: true });
  const ordered = [...manifest.builds].sort((a, b) => a.mount.length - b.mount.length);
  for (const b of ordered) {
    const dest = join(out, b.mount.replace(/^\//, ""));
    cpSync(join(root, b.dir ?? b.package, "dist"), dest, { recursive: true });
    if (!existsSync(join(dest, "index.html"))) throw new Error(`${b.package} produced no index.html`);
  }
  // GitHub Pages runs Jekyll, which drops folders starting with "_" — Astro's
  // `_astro/` assets included. This empty file switches that off.
  writeFileSync(join(out, ".nojekyll"), "");
  return out;
}
