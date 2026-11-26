import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { webManifest, serviceWorkerSource } from "../src/pwa/index.ts";

const icons = [
  { src: "/app/i-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/app/i-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  { src: "/app/m-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
];
const base = { name: "N", shortName: "n", description: "d", startUrl: "/app/", themeColor: "#000", backgroundColor: "#fff", icons };

test("manifest: installable defaults, scope and id follow the start url", () => {
  const m = webManifest(base);
  assert.equal(m.start_url, "/app/");
  assert.equal(m.scope, "/app/");
  assert.equal(m.id, "/app/");
  assert.equal(m.display, "standalone");
  assert.equal(m.lang, "it");
  assert.equal(m.icons.length, 3);
});

test("manifest refuses what would make the app silently uninstallable", () => {
  assert.throws(() => webManifest({ ...base, scope: "/other/" }), /outside scope/);
  assert.throws(() => webManifest({ ...base, icons: icons.filter((i) => i.sizes !== "192x192") }), /192x192/);
  assert.throws(() => webManifest({ ...base, icons: icons.filter((i) => i.sizes !== "512x512" || i.purpose === "maskable") }), /512x512/);
  assert.throws(() => webManifest({ ...base, icons: icons.filter((i) => i.purpose !== "maskable") }), /maskable/);
});

/** Runs the generated worker against a fake browser and reports what it did for each request. */
function harness({ network = () => ({ status: 200, type: "basic", clone() { return this; }, body: "net" }), online = true } = {}) {
  const stored = new Map();
  const handlers = {};
  const fetched = [];
  const responses = [];
  const self = {
    location: { origin: "https://x.test" },
    addEventListener: (t, h) => (handlers[t] = h),
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };
  const caches = {
    open: async () => ({
      put: async (r, res) => stored.set(typeof r === "string" ? r : r.url, res),
      add: async (u) => stored.set(new URL(u, "https://x.test").href, { status: 200, type: "basic", body: "pre", clone() { return this; } }),
    }),
    match: async (r, opts) => {
      const url = typeof r === "string" ? new URL(r, "https://x.test").href : r.url;
      if (stored.has(url)) return stored.get(url);
      if (opts?.ignoreSearch) { const bare = url.split("?")[0]; for (const [k, v] of stored) if (k.split("?")[0] === bare) return v; }
      return undefined;
    },
    keys: async () => ["app-v0", "other-v1"],
    delete: async (k) => stored.set(`deleted:${k}`, true),
  };
  const ctx = vm.createContext({
    self, caches, URL, Response: { error: () => ({ error: true }) },
    fetch: async (r) => { fetched.push(r.url); if (!online) throw new Error("offline"); return network(r); },
    Promise, JSON,
  });
  return { ctx, stored, handlers, fetched, responses, self };
}

const SW = (extra = {}) => serviceWorkerSource({ cachePrefix: "app", version: "v1", scope: "/app/", precache: ["/app/"], bypass: ["/__mock/", "/rest/v1/"], ...extra });

async function fire(h, url, { method = "GET", mode = "cors" } = {}) {
  let answered; let pending = [];
  const event = { request: { url: url.startsWith("http") ? url : `https://x.test${url}`, method, mode }, respondWith: (p) => (answered = p), waitUntil: (p) => pending.push(p) };
  h.handlers.fetch(event);
  const res = answered ? await answered : undefined;
  await Promise.all(pending);
  return { answered: answered !== undefined, res };
}

test("worker source is valid JavaScript", () => {
  new vm.Script(SW());
});

test("worker: never touches writes, other origins, the data API, or anything outside its scope", async () => {
  const h = harness();
  vm.runInContext(SW(), h.ctx);
  for (const [url, opts] of [
    ["/app/__mock/rpc/getDog", {}], // data (bypass)
    ["/app/rest/v1/dogs", {}],
    ["/app/x", { method: "POST" }],
    ["https://api.other.test/app/rest/data", {}], // another origin with a path inside our scope
    ["https://api.other.test/app/", { mode: "navigate" }],
    ["/public-site/", { mode: "navigate" }], // outside scope
    ["/app/__mock/rpc/listInbox", { mode: "navigate" }],
  ]) {
    const { answered } = await fire(h, url, opts);
    assert.equal(answered, false, `${url} ${JSON.stringify(opts)} must be left to the browser`);
  }
  assert.equal(h.fetched.length, 0);
  assert.equal([...h.stored.keys()].filter((k) => k.includes("__mock") || k.includes("rest/v1")).length, 0, "nothing private stored");
});

test("worker: a page is fetched from the network first and its last copy is served offline (query ignored)", async () => {
  const h = harness();
  vm.runInContext(SW(), h.ctx);
  const online = await fire(h, "/app/cani/scheda/?id=1", { mode: "navigate" });
  assert.equal(online.res.body, "net");
  assert.ok(h.stored.has("https://x.test/app/cani/scheda/?id=1"));
  const off = harness({ online: false });
  vm.runInContext(SW(), off.ctx);
  off.stored.set("https://x.test/app/cani/scheda/", { body: "old" });
  assert.equal((await fire(off, "/app/cani/scheda/?id=2", { mode: "navigate" })).res.body, "old");
  assert.equal((await fire(off, "/app/mai-vista/", { mode: "navigate" })).res.error, true, "unknown page + empty cache = a plain network error");
});

test("worker: offline falls back to the precached start page for a page never visited", async () => {
  const h = harness({ online: false });
  vm.runInContext(SW(), h.ctx);
  await h.handlers.install({ waitUntil: (p) => p });
  await new Promise((r) => setTimeout(r, 5));
  assert.equal((await fire(h, "/app/orari/", { mode: "navigate" })).res.body, "pre");
});

test("worker: only successful same-origin responses are stored", async () => {
  const h = harness({ network: () => ({ status: 500, type: "basic", clone() { return this; }, body: "boom" }) });
  vm.runInContext(SW(), h.ctx);
  await fire(h, "/app/orari/", { mode: "navigate" });
  assert.equal(h.stored.size, 0, "a 500 page must not become the offline page");
});

test("worker: hashed assets are cache-first (second request never reaches the network)", async () => {
  const h = harness();
  vm.runInContext(SW(), h.ctx);
  await fire(h, "/app/_astro/a.123.js");
  await fire(h, "/app/_astro/a.123.js");
  assert.equal(h.fetched.filter((u) => u.includes("a.123")).length, 1);
});

test("worker: activate deletes only its own old caches", async () => {
  const h = harness();
  vm.runInContext(SW(), h.ctx);
  let done; await h.handlers.activate({ waitUntil: (p) => (done = p) });
  await done;
  assert.ok(h.stored.has("deleted:app-v0"));
  assert.ok(!h.stored.has("deleted:other-v1"));
});
