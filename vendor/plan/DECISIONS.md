# Decisions

Append-only. Newest at the bottom. The point of this file is that a future
session does not spend tokens re-deriving, or worse, quietly reversing a
choice that was already made on purpose.

Format: **date — decision.** Why. What was rejected.

---

**2026-09-01 — pnpm workspaces, flat layout.**
Sites sit at the repo root (`angelo/`), shared packages too (`design-system/`,
`common/`). Rejected `apps/` + `packages/`: the flat shape was deliberately laid
out by the user, and with a handful of sites the convention buys nothing.
Cost: workspace members are listed explicitly in `pnpm-workspace.yaml` rather
than globbed, because a glob at root would also match `plan/` and `scripts/`.

**2026-09-01 — Astro 5, static output, no adapter.**
Hosting is undecided and will differ per friend. A plain `dist/` builds on
Cloudflare Pages, Netlify, Vercel or any static host without changes. Adding an
adapter later is a one-line change; removing one is not. Rejected: picking a
host now.

**2026-09-01 — Tailwind v4 with CSS-first `@theme` tokens.**
Tokens are declared once and become both CSS custom properties and utility
classes, so there is no second source of truth. Rejected: plain CSS custom
properties (better output weight, much slower to author) and a hybrid.
Consequence: the `@tailwindcss/vite` plugin is used, **not** `@astrojs/tailwind`,
which is deprecated for v4.

**2026-09-01 — Two-layer token model: primitives → semantic aliases.**
Components only ever reference semantic names (`bg-surface`, `text-ink`), never
`brand-500`. A site re-themes by overriding the primitive ramp; every component
follows with no edits. This indirection *is* the factory. Rejected: components
referencing brand ramps directly — it works for one site and collapses on the
second.

**2026-09-01 — Content in Astro content collections (Markdown + Zod).**
Files in-repo, typed frontmatter, no external service, no API keys, no cost.
Rejected for now: a headless CMS, and Keystatic. Revisit self-editing only once
2–3 sites exist and a friend actually asks — see backlog in `ROADMAP.md`.

**2026-09-01 — i18n built in from the start.**
`it` default (unprefixed), `en` second (`/en/…`). Retrofitting i18n means
rewriting every route and every canonical URL, so the routing shape and the
hreflang machinery are in place from day one even while only Italian copy
exists. Astro's `fallback` serves Italian rather than 404 for missing English
pages, and `getAlternates()` only advertises locales that were actually built.

**2026-09-01 — robots.txt explicitly allows AI crawlers.**
GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-User, PerplexityBot,
Google-Extended, Applebot-Extended, Bingbot. These sites want to be cited by
assistants; that is a stated goal, not an oversight. It is per-site opt-out via
`site.config.ts` → `ai.allowCrawlers: false`, because a friend may disagree and
that is their call to make.

**2026-09-01 — Git deliberately not initialised.**
User's explicit instruction. Do not run `git init`, `git add`, or anything else
until they say so. `.gitignore` is written and waiting.

**2026-09-01 — Shared packages ship source, not a build.**
`@factory/design-system` and `@factory/common` export `.astro` and `.ts`
directly; Astro and Vite compile them. Rejected: a `tsup`/`tsc` build step —
it adds a watch process and a stale-output failure mode for zero benefit inside
a monorepo. Consequence: consuming sites **must** set
`vite.ssr.noExternal` for both packages, or `.astro` imports from
`node_modules` break. Recorded in `CONVENTIONS.md`.

**2026-09-01 — Target Astro 7, not Astro 5.** The approved plan said Astro 5;
the current release is **7.2.10**. Three things actually differ and they are the
only ones that matter here:
1. The legacy content-collections API is **gone** (removed in v6). Config must be
   `src/content.config.ts`, every collection needs a `loader`, and `entry.slug` /
   `entry.render()` no longer exist — import `render()` from `astro:content`.
2. `i18n.routing.redirectToDefaultLocale` now defaults to `false`, and only
   applies when `prefixDefaultLocale: true`. We use `false`, so this is a no-op
   for us — noted so nobody re-checks it.
3. Endpoints with file extensions reject trailing slashes: `/sitemap.xml/` is a
   404 regardless of `trailingSlash` config.
Also relevant: cropping is now the default for `astro:assets`, and images never
upscale.

**2026-09-01 — Use Astro's built-in `fonts` config, not manual woff2 files.**
`fonts` is stable (no longer experimental) in Astro 7 and handles self-hosting,
subsetting, `font-display`, optimised fallbacks and preloading from one config
block. This supersedes the "self-hosted woff2 + manual preload" line in the
approved plan — same goal, far less to get wrong. Shape:
`fonts: [{ provider, name, cssVariable, weights, subsets, fallbacks }]`, and the
`cssVariable` is what the design system's `--font-display` / `--font-body`
should point at.

**2026-09-01 — pnpm for everything, including one-off lookups.**
User preference, stated explicitly. Use `pnpm dlx` over `npx`, and
`pnpm view <pkg> version` over `npm view`. No `npm` or `yarn` commands in this
repo.

**2026-09-01 — `cx()` instead of `clsx` + `tailwind-merge`.**
~25 lines, no dependency. These components expose variants rather than
accepting arbitrary class overrides, so last-wins conflict resolution is not
needed. If a caller's class ever loses to a component's own, that is a signal
the component needs a new variant — not that the helper needs to be smarter.

**2026-09-01 — Hand-written `Prose` instead of `@tailwindcss/typography`.**
The plugin ships rules for many elements these sites never use, and re-theming
it means fighting its own colour variables instead of using our roles. Our
version is ~40 declarations, reads from the same tokens as everything else, and
uses `:where()` so any utility on the markup still wins. Slotted content needs
`:global()` because it comes from the parent component, not this one.

**2026-09-01 — `Heading` separates semantic `level` from visual `size`.**
The convention is one `<h1>` and no skipped levels, but documents genuinely need
an `h3` that looks like a lead. Without the split, the usual fix is to choose
the tag by how big it should look, which silently wrecks the document outline
that extractors and screen readers depend on. `level` is required; `size`
defaults to matching it.

**2026-09-01 — Design system ships no `astro check` script.**
It hangs on a package with no pages. Component type-checking happens in Phase 4
through the consuming site. Recorded so nobody re-adds it.

**2026-09-02 — `defineSiteConfig()` throws; it does not return a result.**
A bad `siteUrl` is not a recoverable condition — it silently poisons every
canonical, every hreflang and every JSON-LD `@id` on the site, and the failure
is invisible until something is already indexed. Validating at module load
turns that into a build error with `z.prettifyError()` output. Rejected:
returning `{ success, error }` and letting call sites decide, which in practice
means nobody decides.

**2026-09-02 — `src/site/url.ts` is the only place that builds a URL.**
Not in the approved plan; added because canonical, hreflang, OG `url`, JSON-LD
`@id`, sitemap entries and `llms.txt` links must agree character-for-character,
and six modules each doing their own concatenation is how they stop agreeing.
`normalizePath()` owns both trailing-slash rules: pages get one (Astro's
`build.format: "directory"`), extensioned endpoints never do (`/sitemap.xml/`
is a 404 in Astro 7).

**2026-09-02 — `<Seo>` receives the config as an explicit `site` prop.**
Astro has no ambient context. Rejected: a module-level `setSiteConfig()`
singleton — it works until two things import the package in one build, and its
failure mode is a page rendering another site's canonical. A layout threads
`site` through once; pages never see it.

**2026-09-02 — content-schema fragments import `z` from `astro:content`.**
Astro runs `instanceof` checks against its own zod instance when processing
collection schemas, and a schema built from a second copy fails them *silently*
— it looks like a schema that accepts anything. Astro 7.2.10 depends on
zod `^4.3.6` and `common` on `^4.5.4`; they dedupe to one copy today, but that
is a coincidence, not a guarantee. Cost: `common/src/content/schemas.ts` cannot
be type-checked standalone and is excluded from `common/tsconfig.json`.

**2026-09-02 — JSON-LD is emitted as one `@graph` with stable `@id`s.**
`graph(...baseGraph(config), …)` composes nodes that cross-reference via
`ids.organization` / `ids.website` rather than re-inlining the publisher in
every entity. Extractors follow `@id`; duplicated inline entities read as
competing claims. `serializeJsonLd()` escapes `<` so a `</script>` inside any
string value cannot close the tag early.

**2026-09-02 — schema.org `Game`, not `VideoGame` or `Product`.**
There is no `BoardGame` type in core schema.org. A physical card game is a
`Game` with `numberOfPlayers`; `VideoGame` implies a platform and is wrong.

**2026-09-02 — pnpm 11 uses `allowBuilds`; the previous note was wrong.**
`onlyBuiltDependencies` (a list) parses and is silently ignored under pnpm 11 —
the key is `allowBuilds`, a map of package → boolean. This was recorded twice as
a "benign warning". It is not benign: while any build-script package is
undeclared, `pnpm exec` fails outright, so `pnpm check` cannot run at all.
`esbuild` and `sharp` are `true`; `@parcel/watcher` is `false` — Astro watches
through Vite and never loads its native binary.

**2026-09-02 — both packages ship a `check` script running `tsc --noEmit`.**
This does not reverse the 2026-09-01 decision against `astro check`. They are
different tools: `astro check` hangs on a page-less package, `tsc` does not, and
`tsc` catches the type errors that matter before a site exists. `astro` is now a
root devDependency so `tsconfig.base.json`'s `extends astro/tsconfigs/strict`
resolves — without it every `.ts` import in the repo errors on `TS5097`.

**2026-09-02 — Astro's `i18n` and the sitemap's `i18n` are derived, not written.**
`astroI18nConfig()` and `sitemapI18nConfig()` in `@factory/common` build both
blocks from `site.config.ts`. Hand-writing them means the locale list exists in
three places (site config, routing, sitemap hreflang); when they drift nothing
errors, and routing and hreflang quietly disagree. Same failure mode `<Seo>`
prevents, one level up. Rejected: declaring locales in `astro.config.mjs` and
importing them into the site config — the config object has to be the root, or
its validation is decorative.

**2026-09-02 — `sitemapFilter()` + `builtLocales`, because the first build
shipped contradictory hreflang.** Astro's i18n `fallback` emits a page for every
*configured* locale — with `fallbackType: "redirect"` that is a `noindex`
redirect stub. `@astrojs/sitemap` then listed `/en/` as a canonical URL and
advertised `hreflang="en"`, while `<Seo>` on the real page advertised Italian
only. Two contradictory signals, in the very first build. Each site now exports
`builtLocales` (the locales that actually have copy) and feeds it to both
`sitemapI18nConfig()` and `sitemapFilter()`. Rejected: dropping Astro's
`fallback` — a 404 for `/en/` is worse than a redirect for a human who guesses
the URL.

**2026-09-02 — one documented cast in `common`, in `astroI18nConfig()`.**
Astro types `i18n.fallback` as a mapped type over the *literal* union of
locales, which only exists when a site writes them `as const`. Derived from
validated runtime config the union widens to `string`, `Exclude<string, string>`
is `never`, and every value's declared type becomes `undefined` — the property
is unsatisfiable by construction, and the double cast through `unknown` is
required because the target type overlaps nothing. The emitted value is exactly
what Astro's docs show, and Astro re-validates the block with its own schema at
startup, so a genuinely malformed fallback still fails at build. Rejected:
threading literal locale types through `defineSiteConfig` — it would put the
locale list back in two places, which is the bug this all exists to prevent.

**2026-09-02 — `typescript@6.0.3` is scoped to `angelo`; root and packages stay
on 7.** `astro check` does not run at all under TypeScript 7: the native
compiler does not expose the programmatic API `@astrojs/language-server` needs
(upstream: withastro/roadmap#1321). Since `astro check` is the *only* thing that
type-checks `.astro` props, losing it means losing component checking entirely.
`tsc --noEmit` on the shared packages is happily faster on 7, so the two
versions coexist rather than pinning everything back. Revisit when the language
server supports TS 7.

**2026-09-02 — `defineConfig` is imported from `astro/config`, not `astro`.**
Recorded only because getting it wrong produces a config-load stack trace that
does not name the actual problem.

**2026-09-02 — per-game theming via scoped semantic roles, not per-game ramps.**
Each game entry carries `theme.light` and `theme.dark`; `GameTheme.astro` emits
`[data-game="<id>"] { --accent: … }` and the layout puts `data-game` on `<body>`.
This is the design system's own re-theming contract applied one level down: it
works precisely because components consume `var(--accent)` and never a primitive,
so a game re-themes with zero component edits and zero JS.

Both light and dark are **required** in the schema rather than derived. A single
flat override would also beat the design system's dark-mode block, so a game
themed for white paper would keep its light-on-light button when the viewer
prefers dark. Three blocks for the same reason `theme.css` has three. Rejected:
a full per-game `brand` ramp — a game should tint the studio's identity, not
replace it, and re-skinning `--surface` per page would make the site feel like
several sites.

Kept in `angelo/`, not promoted to the design system: rule of two.

**2026-09-02 — `import { z } from "astro/zod"`, superseding the 2026-09-02
decision to import it from `astro:content`.** That earlier entry was right about
*why* (Astro runs `instanceof` checks against its own zod instance, and a schema
from a second copy fails them silently) but named an import Astro 7 deprecates
and Astro 8 removes — `astro check` reported 21 deprecation warnings. `astro/zod`
is the same instance via a real module path rather than a virtual one, which has
a second benefit: `common/src/content/schemas.ts` now type-checks standalone, so
the `exclude` in `common/tsconfig.json` is gone.

**2026-09-02 — client assets are copied into `src/assets/`, not imported from
`ispiration/`.** `ispiration/` is read-only reference and excluded from the
build. Copying keeps the originals untouched (a standing rule in CLAUDE.md) and
makes the build's real inputs explicit. Consequence: `sharp` becomes a direct
dependency of the site, because pnpm's isolated layout hides Astro's transitive
copy and `astro:assets` fails with `MissingSharp`.

**2026-09-02 — `angelo/budget.mjs` + `pnpm --filter angelo budget`.** The
"< 100 KB first visit" line in CONVENTIONS was unfalsifiable until something
measured it. The script counts the document, stylesheets, preloaded fonts and
**one** variant per image — srcset candidates are alternatives, not additions,
and counting them all reports ~385 KB for a 60 KB page. Exits non-zero when
over, so it can gate a launch check later. Kept in the site, not `common`: rule
of two, and it reads `dist/` rather than any shared code.

**2026-09-02 — `angelo` is a studio site, not a single-game site.**
Recorded here only as a pointer, because it reframed the whole project: the
site belongs to **Purple Ink Games** and Crystal Echoes is one game within it.
The reasoning, and every other site-specific choice, lives in
`plan/angelo/DECISIONS.md` — that is the authoritative file for this site.

**2026-09-02 — the newsletter signup ships zero JavaScript.**
The reference implementation in `~/Dev/personal/website` intercepts `submit` and
calls `window.open` with the address appended to the provider URL. That is a
script for something the platform already does: a `method="get"` form
serialises its own fields into the query string of `action`. So
`NewsletterForm.astro` is a plain form pointed at the provider's subscribe
endpoint — same destination, no JS, and it still works while JS is loading or
disabled. This is why the performance budget survived the feature.

Rejected: an embedded provider iframe (heavy, unstyleable, and a third-party
cookie), and a POST proxy (needs a server; the whole factory is static).

**2026-09-02 — `external` is a prop, not caller-supplied attributes.**
`Button external` and `ExternalLink` set `target="_blank"` **and**
`rel="noopener noreferrer"` **and** a visually hidden "opens in a new window"
note as one unit. `target` without `rel` hands the opened page a `window.opener`
handle; a tab that opens silently is disorienting for anyone not watching the
viewport. Leaving it to callers means it is right until someone forgets.

The sr-only label defaults to Italian but is an overridable prop — the design
system holds no dictionary, and i18n belongs to `common`.

**2026-09-02 — placeholder URLs use `.example`, never a plausible guess.**
`purpleinkgames.substack.com` might be real and belong to somebody else, and a
newsletter form pointed at a stranger's list would silently hand them real
email addresses. `.example` is IANA-reserved and can never resolve, so a
placeholder that survives to production fails loudly instead of quietly doing
the wrong thing. Same reasoning as `siteUrl`.

**2026-09-02 — OG images are composed by an endpoint with sharp, not by
`astro:assets`.** `getImage({ fit: "contain" })` fits *inside* the box rather
than padding out to it: a 3:2 box shot came out 895x630 and the square logo
630x630, while the meta tags declared 1200x630. A scraper trusts those tags, so
the mismatch is a real defect. `src/pages/og/*.jpeg.ts` composites onto a
full-size canvas instead, and the output is genuinely 1200x630.

JPEG rather than WebP: several link scrapers ignore WebP and then show no
preview at all — the exact failure the image is there to prevent. OG images are
fetched only by scrapers, never by a visiting browser, so they cost nothing
against the first-visit budget.

Two path gotchas, both recorded because neither is guessable: `import.meta.url`
in an endpoint points into the bundle rather than the source tree, so a
studio-level asset is resolved from `process.cwd()`; and a content-collection
image carries `fsPath` at runtime but Astro does not expose it on the public
`image()` type, so the game endpoint casts with a runtime guard.

**2026-09-02 — external images cannot be inferred from a link.**
Asked whether the site could pull artwork from the BoardGameGeek and Gamefound
pages. It cannot: BGG's XML API answers **401** (it now requires registration)
and Gamefound answers **403** to a plain request, both regardless of
user-agent. Even with access, hotlinking their CDN would sit outside the
`astro:assets` pipeline and the performance budget. The site therefore uses the
artwork Angelo supplied, which is better material anyway.

**2026-10-23 — Ceramics shop: Stripe Payment Links, no adapter, no database.**
For a local ceramics shop with one-of-a-kind pieces. Each piece carries its own
Payment Link (limited to one completed session in Stripe, which is what stops a
double sale); the product frontmatter has `availability: available | sold` and
flipping it needs a rebuild. Stripe handles payment, shipping address and VAT.
Rejected for now: an SSR adapter with a KV/D1 stock store and a checkout
endpoint (more moving parts and our own payment code, to get only a "reserved"
state), and Shopify (right if the catalogue grows past ~30 pieces, sells often,
or needs variants/returns — revisit then). Zero client JS is untouched.

**2026-10-23 — Events: wall-clock time + IANA zone, entered monthly.**
Events are authored as `2026-11-07T18:00` plus `timezone` (default
`Europe/Rome`), never as a UTC timestamp or a bare offset — YAML reads a bare
timestamp as UTC and a fixed offset is wrong half the year. The zone is resolved
with `Intl`. Date-only means all-day. The owner sets events at the start of each
month, so a static build with a manual rebuild is enough; a daily cron is an
optional later addition, not a requirement. Keystatic stays in the backlog.

**2026-10-23 — Calendar, event/product schemas and JSON-LD promoted to `common`
before a second site exists.** The user asked for it explicitly, which overrides
the rule of two in `CONVENTIONS.md`. Cost: these APIs are unproven against a
real site and may need to change when the ceramics site first uses them.

**2026-10-23 — Shop link is `buyUrl` + `provider`, because the shop already sells on Vinted.**
The ceramics owner already lists on Vinted (it is the link in her Instagram bio).
A product therefore points at *any* off-site buy page — a Vinted listing or a
Stripe Payment Link — and `provider` picks the button label. Supersedes the
field name `paymentLink` from the entry above; the no-adapter, no-database
reasoning is unchanged. Open point to confirm with her: Vinted's terms for
professional sellers, and whether she wants Stripe for workshops regardless.

**2026-10-23 — The site generator was built before Angelo shipped, with `events` / `shop` as opt-in modules.**
The roadmap said to extract it only after Angelo shipped. The user asked for a
generic scaffold now, with a second site (`amarti`) waiting, so it was derived
from Angelo as it stands. Rejected: a generator that bakes events and shop into
every site (a marketing site does not want a calendar) and one template folder
per site type. Modules are overlays in `scripts/templates/site/<module>/`; an
overlay may only *add* files or deep-merge JSON, never replace a base file, so a
module cannot silently change another's behaviour. Conditional lines
(`@@if events,shop` … `@@end`) cover the few base files that must vary.
Consequence: Angelo-only features (display font, OG endpoint, newsletter,
per-page theming) are not in the templates yet.

**2026-10-23 — Event booking starts as an Instagram DM link.**
`bookingUrl: https://ig.me/m/<handle>` with `bookingProvider: instagram` makes
the button read "Prenota su Instagram" and open a DM — the owner's existing
flow, so nothing changes for her. The site still does not count seats or hold
bookings. Move individual events to a Stripe Payment Link with a seat limit
(`bookingProvider: stripe`) when she wants to be paid up front.

**2026-10-23 — First exception to zero client JS: one inline script that copies the booking message.**
Requested explicitly by the user. Instagram has no way to prefill a DM, so on an
event with `bookingProvider: instagram` the booking button copies a message
("Ciao! Vorrei prenotare «<titolo>» (<quando>).") to the clipboard and opens the
chat, where the visitor pastes it. The script is ~600 bytes, `is:inline` (no
second request), and appears **only on those event pages**; every other page
still ships zero JS. It is progressive enhancement: with JS off, or no
`navigator.clipboard`, the button is a plain link and the "we copy a message"
hint stays hidden. Page weight is unchanged within the budget (7.8 KB).
Rejected: a visible select-all text box (no JS, but two manual steps nobody
will do) and any client framework or island. Not browser-tested at the time of
writing — only built and inspected.

**2026-10-23 — The repo stays one monorepo; any public GitHub repo is a one-way copy.**
The user wants something for a CV. Per-site repos were rejected: sites depend on
`@factory/design-system` and `@factory/common` through `workspace:*`, so a site
alone does not build, and splitting would mean publishing the two packages and a
release before every change. If anything goes public it is a **single repo
holding `design-system/` and `common/` together** (two folders, cut from the
monorepo with a history filter), never `angelo/`, `amarti/` or `plan/<site>/`,
which contain client material and the owners' private details. The user will
create it themselves, later; **git is still not initialised** and sessions must
not run it. Before publishing: scan both packages for client names/URLs, add a
licence and a README.

**2026-11-04 — The local-demo tooling is a factory feature: `@factory/common/demo` + `pnpm demo <site>` / `pnpm build:site <site>`.**
The user asked for it to be reusable rather than Annina-specific, in `common` if it stays in this repo. So the generic part moved there — building a site's packages and merging them into `deploy/<site>/`, a static server with a plug-in hook, a JSON state store, a manifest type — and each site opts in with `<site>/demo.config.mjs` (packages and mounts, env for `--demo`/`--local`, path of its backend). The site-specific part (Annina's dogs, inbox, RPC) stays in `annina-app/mock/backend.mjs`, a module exporting `createBackend(kit)`; the kit injects the helpers so a backend needs no import from `common`. This is promoted before a second site uses it, at the user's explicit request (same precedent as events/shop, 2026-10-23), so expect it to change when one does. It is Node-only dev tooling behind its own subpath: no site imports it into a page, and it needs `@types/node` as a devDependency of `common`. Needs Node >= 22.18 (it runs `.ts` through type stripping); `engines` still says >= 20.12, which is enough for the sites themselves. Replaces `pnpm build:annina` and `annina-app/mock/server.mjs`. Rejected: leaving it in `scripts/` (the user wanted it where other sites will find it) and a per-site copy of the server.

**2026-11-04 — `annina/` is a project folder: `site/`, `app/`, `backend/`. Supersedes "flat layout" for projects that have a backend.**
The backend (Supabase schema, edge functions, the local mock, the shared form validation) serves both the public site (the booking form) and the private app, yet it lived inside `annina-app/`, and `annina` alone read as the whole project while meaning the public site. Now `annina/site`, `annina/app`, `annina/backend`, plus `annina/demo.config.mjs`; package names stay `annina`, `annina-app`, `annina-backend` so every `pnpm --filter` and doc keeps working. `DemoManifest` builds gained `dir`. `angelo` and `amarti` stay flat: they have no backend, and a site is grouped only when it first needs one. Rejected: three flat folders (`annina`, `annina-app`, `annina-backend`) — no tooling change, but `annina` stays ambiguous and the three sit unrelated at the repo root; and nesting `frontend/{site,app}` — one level deeper for no gain, since the backend is the thing that differs. Cost: workspace entries by path, `tsconfig` `extends` one level up, `new-site.mjs` still flat-only. Before moving, a tarball of the old tree was kept outside the repo, because there is no git. Verified after the move: all type checks, both build modes, the budget, and the 16-step browser run.

**2026-11-04 — `annina-backend` must declare `@supabase/supabase-js` as a devDependency.**
`deno check` resolves `npm:@supabase/supabase-js` from the nearest `node_modules`; the check only ever passed because the app, which depends on it, happened to be next door. Moved alone, the backend made Deno try the global cache (`~/Library/Caches/deno`), which is not writable here. `--no-config` and a `deno.json` with `nodeModulesDir` were tried and do not work (Deno treats `pnpm-workspace.yaml` as its workspace root, so the field is rejected). The check was also proven to catch a deliberately wrong type, not just to exit 0.

**2026-11-04 — `pnpm new-site <dir> --with-backend` generates a project folder (`site/`, `app/`, `backend/`) from the generic part of Annina.**
Requested by the user so the next "complex" site starts from the working shape instead of from a copy of Annina. Generic = contact form → `request` edge function → `inbox` → app "Richieste" page, login, the data layer with a mock and a Supabase adapter, the build-time key guard, the local mock backend and `demo.config.mjs`. Specific (left in `annina/` only): dogs, owners, visits, consents, appointments, the `intake` flow, the ICS feed. New template sets live in `scripts/templates/{app,backend,project}` and `site/backend` (the form and thank-you page, a layer of the site like `events` and `shop`); the generator writes each set under a prefix and registers three workspace entries. The flag is boolean (the parser used to consume the next argument for every flag). Two things from Annina moved into the BASE site template for every site: base-aware links (`src/lib/path.ts`, `url()`) and the `--demo` noindex/robots switch, plus excluding `/grazie/` from the sitemap. Rejected: `--with backend` as a module (it changes the folder shape, not just the pages), and generating the Annina-specific tables (a mould for one friend's business is not a template). Known limits: the `events`/`shop` pages still use hard-coded `/eventi/`-style links, so those two modules do not yet work on a GitHub preview with a path prefix; the generic backend's kinds are `message` only; nothing generated has run against a real Supabase project. Annina's app got the generated login page, closing a gap (`guard.ts` redirected to a page that did not exist).

**2026-11-04 — Converting an existing site is a separate command, `pnpm add-backend <site>`; `new-site` only creates.**
The user's rule: `new-site` must never transform anything. `add-backend` moves a flat site into `<site>/site/`, generates `app/`, `backend/` and the manifest, adds the contact form and thank-you page where no file exists, merges dictionary keys without overwriting, and patches existing files only on an exact match, listing everything it could not do as MANUAL STEPS. It has `--dry-run`, an automatic backup (no git) with a printed undo, and a write-time guard against overwriting. The template engine moved to `scripts/_scaffold.mjs`, shared with `new-site`; the refactor was proven by generating a flat and a `--with-backend` project before and after and diffing the trees (identical). Tested for real on a copy of `amarti`: type checks 0/0/0 on all three packages, preview build with a prefix, 9-step Chrome run; and its undo path was exercised. A dry run on `angelo` shows its `BaseLayout` is not recognised, which is the intended outcome (manual step, nothing rewritten on a guess). Rejected: loosening matches or using regexes to cover customised files; running `pnpm install` for the user (a moved folder needs it, but a command that edits the workspace should not also fetch packages); converting in place without a backup. Found only by the real run: the analysis read the wrong folder and overwrote a dictionary in the throwaway copy — hence the "test on a copy" rule and the write-time guard. Also in this change: `events` and `shop` templates now use `url()`, so those modules work on a GitHub preview with a path prefix.

**2026-11-05 — `renderOg` promoted to `@factory/common/og` (second consumer: annina), with an optional `bleed` mode.**
Angelo had its own `src/lib/og.ts`; annina needed the same 1200x630 JPEG composition, which is the rule-of-two trigger. `common` gains `sharp` as a dependency and a Node-only `./og` export (like `./demo`: import it from an endpoint, never a page). Angelo's file became a one-line re-export so its three importers are untouched; its two emitted JPEGs were byte-identical before and after, also after `bleed` was added. `bleed` fills the card and crops, because annina's source is the Canva logo, which already carries a bubble background — with a margin its pattern ended in a hard edge 120 px from the sides. Rejected: copying `og.ts` into annina (a second copy is how the two drift), and re-cropping the logo by hand. Not done: the `new-site` template still ships no favicon, no OG endpoint and no `defaultImage`, so a new site starts with a 404 favicon and no preview; add a neutral placeholder set to the base template.

**2026-11-05 — `new-site` generates a random placeholder favicon; `add-backend` gives the app the site's icons.**
Supersedes the "not done" note of the `renderOg` entry for favicons. Requested by the user: new sites should not start with a 404 favicon. `renderPlaceholderIcons` (in `common/src/og`, where `sharp` already is) draws a random hue and a random geometric shape, writes `favicon.ico` and an apple-touch icon, and is called by `new-site` for the site (and the app of a project). Rejected: a fixed default icon (every new site would look the same and could be mistaken for a brand), letters (font-dependent output), shelling out to ImageMagick (not guaranteed to be installed), and shipping an SVG favicon only (browsers still request `/favicon.ico`, which would 404). Proven: unseeded runs differ, a fixed seed repeats, site and app get identical files, ICO parses with three sizes, `astro check` 0/0/0 on a flat and a `--with-backend` project, `/x/`-prefixed links, and Chrome gets 200 on `/favicon.ico` and `/app/favicon.ico` with no 4xx anywhere. Not generated: an OG endpoint and `defaultImage`, which need the brand's artwork.

**2026-11-05 — Crawler list and hreflang fixed in `common`: search engines are not AI crawlers; one built language emits no hreflang.**
From the SEO/GEO audit. `AI_USER_AGENTS` (robots.txt) lost `Bingbot` and gained `Claude-SearchBot` and `Perplexity-User`. Bingbot is a search engine, already allowed by the `*` group; listing it meant `ai.allowCrawlers: false` ("no AI") would also have blocked Bing. Googlebot, Bingbot and Applebot are deliberately never listed. `getAlternates()` returns `[]` when fewer than two languages are built: a lone self-reference plus `x-default` told crawlers nothing. Consequences for existing sites: their next build emits a robots.txt without the Bingbot group and with the two new groups, and no hreflang tags while they are single-language — checked by building angelo and amarti (robots 11 groups, no Bingbot, 0 pages with hreflang). New: `common/test/seo.test.mjs`, 7 tests, eight mutations each fail one (`pnpm --filter @factory/common test`).

**2026-11-05 — Private-app pieces promoted: `common/app`, `common/pwa*`, `design-system/app.css` + `AppShell`, `pnpm pwa-icons`.**
Second user reached (annina's app and the generated app template). `@factory/common/app` holds browser helpers for apps behind a login (DOM without innerHTML, Italian formatting, form reading, one status line, `confirmDialog`, `findConflicts`, `friendlyError`); `@factory/common/pwa` is pure strings/objects (manifest builder that THROWS for a missing 192/512/maskable icon or a start URL outside the scope; service-worker source with the never-cache list and cache policy), `pwa-client` the browser side (register, install prompt, iOS detection, app badge, online/offline), `pwa-icons` + `scripts/pwa-icons.mjs` make the four icon files from one source image (crop, circle, maskable safe zone). `design-system/app.css` is the component CSS the app used to carry in its own `global.css`; `components/AppShell.astro` is the frame (top bar, title, actions slot, status line, tab bar). `scripts/templates/app` imports all of it; a project generated from it type-checks (0/0/0), builds and renders the shell. NOT yet in the template: the manifest/worker endpoints and icons (a generated app is not a PWA until someone copies `annina/app/src/pages/{manifest.webmanifest,sw.js}.ts`; the layout carries a comment saying where). Reason: placeholder icons at 192/512 need the placeholder generator extended, and no second site needs the install yet. Rejected: a `pwa` Astro integration (hides what the worker does behind config; a ~30-line endpoint each is clearer); putting the app helpers in `design-system` (they are behaviour, not look).

**2026-11-26 — FAQs render through `design-system/Faq.astro`, with no `FAQPage` JSON-LD.**
annina (2026-11-05) and amarti (2026-11-26) had copied the same `<details>` markup, so the rule of two is met. The component takes only the items; the heading stays with the page. This replaces the convention "faq feeds a rendered block *and* `FAQPage` JSON-LD": Google dropped FAQ rich results, so the markup earns nothing (research in `plan/annina/SEO-GEO.md`). The questions still help people and AI answer engines, and `llms.txt` lists them. Rejected: a component that also emits the JSON-LD; removing `faqPageLd` from `common` (harmless, and cheap to bring back if Google changes course).


**2026-11-26 — Projects are standalone repos with a vendored copy of the factory (`pnpm sync <project>`), superseding the 2026-10-23 "one monorepo" entry for `annina` and `amarti`.**
The user's choice: every project on GitHub must be self-sufficient, **without published packages for now**, "a folder in each project, then a system that syncs the shared folders". So `annina/` and `amarti/` each have their own `pnpm-workspace.yaml`, root `package.json`, lockfile, `.gitignore`, `CLAUDE.md`/`AGENTS.md` and `plan/` (moved from `plan/<project>/`), and a `vendor/` written by the factory's `pnpm sync <project>`: `common/`, `design-system/`, `tsconfig.base.json`, the factory's `plan/CONVENTIONS.md` + `plan/DECISIONS.md`, and the drift checker. Package names and `workspace:*` are unchanged, so no import changed; only `tsconfig` `extends` moved to `../vendor/tsconfig.base.json`. They are no longer members of the factory workspace, and the factory's `.gitignore` excludes them (each is its own git repo).
**One direction only**: a fix goes into the factory and is synced out. `vendor/.factory-sync.json` records the sha256 of every file; `pnpm vendor:check` (project) and `pnpm sync` (factory) refuse on any hand edit, listing it, and `--force` is the only way past. `pnpm sync <p> --check` shows whether a project is behind. A project stays on its vendored version until synced, so changing the factory cannot break a project that is not touched.
The project lockfiles were derived from the factory's, so versions are identical (astro 7.2.10; a fresh resolve had picked 7.4.13). Rejected: published packages on GitHub Packages (registry auth, a release per change, not wanted yet); git subtree/submodules (no git yet, clumsier than a copy); per-site repos depending on the factory by path (a clone would not build). Not yet done: the demo/build:site/e2e tooling (still reads `annina/site`-style paths from the factory root, and the previews' `deploy/` repos still live in the factory); `new-site --with-backend`/`add-backend` still generate in-workspace projects. `angelo` stays in the factory workspace. The privacy rule of 2026-10-23 still holds: project repos contain client material and must be **private**; only `deploy/<site>` (dist) is public.
