// Tiny HTTP helpers for the local demo server. Node only: this subpath
// (`@factory/common/demo`) is development tooling and must never be imported
// from a page, layout or component of a site.
import type { IncomingMessage, ServerResponse } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".mjs": "text/javascript", ".json": "application/json", ".webmanifest": "application/manifest+json", ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".ics": "text/calendar; charset=utf-8",
};

/**
 * Reads a request body up to `limit` bytes. Past the limit it keeps draining
 * (storing nothing) and rejects at the end, so the client still receives an
 * ordinary response instead of a reset connection — which is what a real
 * edge function does too.
 */
export function readBody(req: IncomingMessage, limit: number): Promise<string> {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size <= limit) chunks.push(chunk);
    });
    req.on("end", () =>
      size > limit ? reject(new Error("body too large")) : resolveBody(Buffer.concat(chunks).toString("utf8")),
    );
    req.on("error", reject);
  });
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

/** 303, like the edge functions: a form POST becomes a GET of the next page. */
export function redirect(res: ServerResponse, location: string): void {
  res.writeHead(303, { Location: location });
  res.end();
}

/**
 * Serves a file from `root`. The resolved path is re-checked against `root`
 * so `..` and encoded variants cannot escape it. Returns false if the method
 * is not GET/HEAD (the caller decides what that means).
 */
export function serveStatic(root: string, urlPath: string, method: string, res: ServerResponse): boolean {
  if (method !== "GET" && method !== "HEAD") return false;
  const base = resolve(root);
  let file = resolve(base, "." + normalize(decodeURIComponent(urlPath)));
  if (file !== base && !file.startsWith(base + sep)) {
    res.writeHead(403).end();
    return true;
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("404");
    return true;
  }
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
  res.end(method === "HEAD" ? undefined : readFileSync(file));
  return true;
}
