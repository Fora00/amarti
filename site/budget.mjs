/**
 * First-visit weight for a page, against the < 100 KB budget in
 * vendor/plan/CONVENTIONS.md. Counts what a browser actually fetches: the document,
 * its stylesheets, preloaded fonts, and ONE variant per <img> (the smallest
 * srcset candidate — a phone at 1x, the common case).
 *
 * Run: node budget.mjs [route]
 */
import { readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";

const route = process.argv[2] ?? "/";
const page = `dist${route.endsWith("/") ? `${route}index.html` : route}`;
const html = readFileSync(page, "utf8");

const TEXT = /\.(css|js|svg|html)$/;
const bytes = (p) => {
  const f = `dist${p}`;
  if (!existsSync(f)) return null;
  const raw = readFileSync(f);
  return TEXT.test(p) ? gzipSync(raw).length : raw.length;
};

const rows = [["document (gzipped)", gzipSync(Buffer.from(html)).length]];

for (const m of html.matchAll(/<link[^>]+href="(\/[^"]+)"[^>]*>/g)) {
  const tag = m[0], href = m[1];
  if (/rel="(stylesheet|preload)"/.test(tag)) rows.push([href, bytes(href) ?? 0]);
}

// One variant per image: srcset candidates are alternatives, not additions.
for (const m of html.matchAll(/<img[^>]+>/g)) {
  const tag = m[0];
  const srcset = /srcset="([^"]+)"/.exec(tag);
  const pick = srcset
    ? srcset[1].split(",").map((c) => c.trim().split(" ")[0])
        .map((c) => [bytes(c) ?? 0, c]).sort((a, b) => a[0] - b[0])[0]
    : (() => { const s = /src="(\/[^"]+)"/.exec(tag); return s ? [bytes(s[1]) ?? 0, s[1]] : null; })();
  if (pick) rows.push([pick[1], pick[0]]);
}

let total = 0;
for (const [name, size] of rows) {
  total += size;
  console.log(`${String(name).slice(-56).padEnd(58)}${(size / 1024).toFixed(1).padStart(7)} KB`);
}
const kb = total / 1024;
console.log("-".repeat(66));
console.log(`${`TOTAL ${route}`.padEnd(58)}${kb.toFixed(1).padStart(7)} KB   / 100 KB`);
console.log(kb > 100 ? "OVER BUDGET" : `within budget (${(100 - kb).toFixed(1)} KB spare)`);
process.exit(kb > 100 ? 1 : 0);
