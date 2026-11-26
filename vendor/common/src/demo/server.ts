import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { redirect, readBody, sendJson, serveStatic } from "./http.ts";
import { createStore } from "./store.ts";

/**
 * What a site's mock backend plugs in. `handle` returns true when it dealt
 * with the request; anything it does not claim falls through to static files.
 */
export interface DemoBackend {
  handle(req: IncomingMessage, res: ServerResponse, url: URL): boolean | Promise<boolean>;
}

/** Handed to `createBackend(kit)` so a backend needs no imports from this package. */
export interface DemoKit {
  readBody: typeof readBody;
  sendJson: typeof sendJson;
  redirect: typeof redirect;
  createStore: typeof createStore;
  /** Where this site's state file lives (git-ignored, under deploy/.state/). */
  stateFile: string;
  /** Start from a fresh seed. */
  reset: boolean;
}

export const demoKit = (stateFile: string, reset: boolean): DemoKit => ({
  readBody, sendJson, redirect, createStore, stateFile, reset,
});

export interface ServeOptions {
  /** The merged build, e.g. deploy/annina. */
  root: string;
  port: number;
  backend?: DemoBackend;
  title: string;
  /** Printed at start-up so the user knows where to click. */
  links: { label: string; path: string }[];
}

/**
 * Serves a merged build plus an optional mock backend on ONE origin, so there is
 * no CORS and the public site and a private app can share a backend.
 *
 * NOT a security boundary: no auth, and it binds to 127.0.0.1 only.
 */
export function serveDemo(opts: ServeOptions): Promise<Server> {
  if (!existsSync(join(opts.root, "index.html"))) {
    throw new Error(`No build in ${opts.root}. Run \`pnpm build:site <site> --local\` first.`);
  }
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (opts.backend && (await opts.backend.handle(req, res, url))) return;
      if (!serveStatic(opts.root, url.pathname, req.method ?? "GET", res)) res.writeHead(405).end();
    } catch (error) {
      console.error(error);
      if (!res.headersSent) sendJson(res, 500, { error: "errore del server di prova" });
    }
  });
  return new Promise((resolveServer, reject) => {
    server.once("error", reject);
    server.listen(opts.port, "127.0.0.1", () => {
      console.log(`\n${opts.title} — demo locale (dati di prova)`);
      for (const l of opts.links) console.log(`  ${l.label.padEnd(10)} http://localhost:${opts.port}${l.path}`);
      console.log("");
      resolveServer(server);
    });
  });
}
