// Run: pnpm --filter @factory/common test  (Node's own runner; imports the .ts
// sources through type stripping, Node >= 22.18)
import test from "node:test";
import assert from "node:assert/strict";
import { defineSiteConfig } from "../src/site/config.ts";
import { defineI18n } from "../src/i18n/index.ts";
import { AI_USER_AGENTS, robotsTxt, llmsTxt } from "../src/ai/index.ts";

const config = (over = {}) =>
  defineSiteConfig({
    name: "Test", siteUrl: "https://test.example", description: "Una descrizione di prova.",
    locales: { default: "it", supported: ["it", "en"] }, organization: { name: "Test" }, ...over,
  });

/* -- robots.txt ------------------------------------------------------------------- */

const groups = (text) => Object.fromEntries(text.trim().split("\n\n").filter((b) => b.startsWith("User-agent")).map((b) => {
  const [first, ...rules] = b.split("\n"); return [first.replace("User-agent: ", ""), rules];
}));

test("robots: every AI crawler gets an explicit group, ordinary search engines do not", () => {
  const g = groups(robotsTxt(config()));
  for (const bot of ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended"]) {
    assert.deepEqual(g[bot], ["Allow: /"], bot);
  }
  assert.deepEqual(g["*"], ["Allow: /"]);
  for (const search of ["Bingbot", "Googlebot", "Applebot"]) assert.equal(search in g, false, `${search} is a search engine, not an AI crawler`);
});

test("robots: 'no AI' blocks the AI crawlers but never ordinary search", () => {
  const text = robotsTxt(config({ ai: { allowCrawlers: false } }));
  const g = groups(text);
  for (const bot of AI_USER_AGENTS) assert.deepEqual(g[bot], ["Disallow: /"], bot);
  assert.deepEqual(g["*"], ["Allow: /"], "everyone else, Bing and Google included, stays allowed");
  assert.equal(/^User-agent: (Bingbot|Googlebot|Applebot)$/m.test(text), false, "no group for an ordinary search engine");
});

test("robots: disallowed paths repeat in every group, and the sitemap line is absolute", () => {
  const text = robotsTxt(config({ ai: { disallow: ["/app/"] } }));
  const g = groups(text);
  for (const [agent, rules] of Object.entries(g)) assert.ok(rules.includes("Disallow: /app/"), agent);
  assert.match(text, /^Sitemap: https:\/\/test\.example\/sitemap-index\.xml$/m);
});

/* -- hreflang ---------------------------------------------------------------------- */

test("hreflang: a single built language emits nothing at all", () => {
  const i18n = defineI18n({ config: config(), dictionaries: { it: {}, en: {} } });
  assert.deepEqual(i18n.getAlternates("/prenota/", ["it"]), []);
  assert.deepEqual(i18n.getAlternates("/prenota/", []), []);
});

test("hreflang: two built languages emit each one plus x-default", () => {
  const i18n = defineI18n({ config: config(), dictionaries: { it: {}, en: {} } });
  const rows = i18n.getAlternates("/prenota/", ["it", "en"]);
  assert.deepEqual(rows.map((r) => r.locale), ["it", "en", "x-default"]);
  assert.equal(rows[0].href, "https://test.example/prenota/");
  assert.equal(rows[1].href, "https://test.example/en/prenota/");
  assert.equal(rows[2].href, rows[0].href, "x-default is the default-language URL");
});

test("hreflang: a site configured for one language never emits any", () => {
  const one = config({ locales: { default: "it", supported: ["it"] } });
  const i18n = defineI18n({ config: one, dictionaries: { it: {} } });
  assert.deepEqual(i18n.getAlternates("/", undefined), []);
});

/* -- llms.txt ---------------------------------------------------------------------- */

test("llms.txt: title, summary, notes, and only non-empty sections", () => {
  const text = llmsTxt({
    config: config(), notes: "Su appuntamento.",
    sections: [
      { title: "Pagine", links: [{ title: "Prenota", path: "/prenota/", summary: "Chiedi un appuntamento" }] },
      { title: "Vuota", links: [] },
    ],
  });
  assert.match(text, /^# Test\n\n> Una descrizione di prova\.\n\nSu appuntamento\.\n\n## Pagine\n\n- \[Prenota\]\(https:\/\/test\.example\/prenota\/\): Chiedi un appuntamento\n$/);
  assert.equal(text.includes("Vuota"), false);
});
