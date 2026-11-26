import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** One package of a site that is built and mounted somewhere in the demo. */
export interface BuildSpec {
  /** pnpm package name, for `pnpm --filter`. */
  package: string;
  /**
   * Folder of the package, relative to the repo root. Defaults to `package`
   * (the flat layout); a grouped project says e.g. "annina/site".
   */
  dir?: string;
  /** URL path it is served under: "/" for the public site, "/app/" for a private app. */
  mount: string;
  /** Env var the package's astro.config reads its `base` from. */
  baseEnv: string;
}

/**
 * `<site>/demo.config.mjs` — what a site needs to be tried locally. A site
 * without one simply cannot be run with `pnpm demo`.
 */
export interface DemoManifest {
  name: string;
  builds: BuildSpec[];
  /** Extra env for `--demo` builds (the noindex GitHub preview). */
  demoEnv?: Record<string, string>;
  /** Extra env for `--local` builds (forms and data point at the mock backend). */
  localEnv?: Record<string, string>;
  /** Path, relative to `<site>/`, of a module exporting `createBackend(kit)`. */
  backend?: string;
}

export async function loadManifest(root: string, site: string): Promise<DemoManifest> {
  if (!/^[a-z][a-z0-9-]*$/.test(site)) throw new Error(`"${site}" is not a site folder name.`);
  const file = join(root, site, "demo.config.mjs");
  if (!existsSync(file)) throw new Error(`${site}/demo.config.mjs not found — this site has no local demo.`);
  const mod = (await import(pathToFileURL(file).href)) as { default: DemoManifest };
  return mod.default;
}
