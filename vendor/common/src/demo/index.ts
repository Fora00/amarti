/**
 * Local demo tooling — Node only, development only.
 *
 *   pnpm build:site --<site> [--base /repo/] [--demo] [--local]
 *   pnpm demo --<site> [--port 4321] [--no-build] [--reset]
 *
 * A site opts in with `<site>/demo.config.mjs` (see `DemoManifest`). Nothing
 * here is bundled into a site: import it from scripts, never from a page.
 */
export { buildSite, localFolder, normalizeBase } from "./build.ts";
export type { BuildOptions } from "./build.ts";
export { loadManifest } from "./manifest.ts";
export type { BuildSpec, DemoManifest } from "./manifest.ts";
export { demoKit, serveDemo } from "./server.ts";
export type { DemoBackend, DemoKit, ServeOptions } from "./server.ts";
export { readBody, redirect, sendJson, serveStatic } from "./http.ts";
export { createStore } from "./store.ts";
export type { JsonStore } from "./store.ts";
