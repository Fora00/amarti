# Conventions

Only things you **cannot** infer by reading the source. Everything obvious is
deliberately left out so this file stays worth reading.

## Gotchas that will cost you an hour

**`vite.ssr.noExternal` is mandatory.** Vite externalises workspace deps by
default, which breaks `.astro` files imported from `node_modules`. Every site's
`astro.config.mjs` needs:

```js
vite: { ssr: { noExternal: ["@factory/design-system", "@factory/common"] } }
```

**Tailwind scanning is already handled — do not add `@source` lines to sites.**
Class names used only inside design-system components would be tree-shaken away
(unstyled page, no error), so `design-system/src/theme.css` carries
`@source "./components";` itself. `@source` resolves relative to the file that
declares it, and this was **verified to work through the pnpm symlink** — a site
that imports the theme inherits the scanning for free. `common` will need the
same line if it ever ships classed markup.

**Use `@tailwindcss/vite`, never `@astrojs/tailwind`.** The latter is for
Tailwind 3 and is deprecated.

**`@theme` override order.** A site re-themes by importing the design system
first, then declaring its own `@theme` block. Later declarations win. Reversing
the order silently does nothing.

## Tokens

- Two layers. **Primitives** (`--color-brand-500`, `--font-display`) live in
  `@theme` and are what a site overrides. **Semantic aliases**
  (`--color-surface`, `--color-ink`, `--color-line`) live in `@layer base` and
  are what components consume.
- Components reference semantic names only. If you find yourself writing
  `bg-brand-500` inside `design-system/src/components/`, add a semantic alias
  instead — that is the bug the two-layer model exists to prevent.
- Dark mode redefines **only** the semantic block, never the primitives, and
  does it three times: bare `:root` (light), `@media (prefers-color-scheme: dark)`
  guarded as `:root:not([data-theme="light"])`, and `:root[data-theme="dark"]`.
  All three are required for an explicit toggle to beat the system setting in
  both directions.

## Where code goes

`design-system` = how it looks. `common` = how it behaves. Site folder =
everything else, and it is the **default**.

**The rule of two:** nothing gets promoted into a shared package until a second
site actually needs it. One site's needs are indistinguishable from that site's
preferences. Premature extraction is the main way a factory like this rots.

## Performance budget

Non-negotiable without an explicit decision recorded in `DECISIONS.md`:

- **Zero client-side JS by default.** No islands, no `client:*` directives.
- **< 100 KB transferred** for a first-visit landing page.
- All images through `astro:assets` with explicit width/height (AVIF/WebP).
- Fonts self-hosted `woff2`, `font-display: swap`, `preload` the display face
  only — never the whole family.

## SEO / AI search

- Every page renders `<Seo>` from `@factory/common`. Never hand-write `<meta>`,
  canonical or hreflang tags — hand-written hreflang is reliably wrong.
- Every content entry carries `summary`: 1–2 sentences that stand alone when
  quoted out of context. It feeds the meta description *and* `llms.txt`. Write
  it as an answer, not a teaser.
- `faq` entries are one array that feeds the page (`design-system/components/Faq.astro`,
  native `<details>`) and `llms.txt`. **No `FAQPage` JSON-LD**: Google no longer shows
  FAQ rich results (DECISIONS 2026-11-26). `faqPageLd` stays in `common`, unused.
- One `<h1>` per page, no skipped heading levels, real `<article>`/`<section>`/
  `<nav>`. Extractors parse structure, so structure is a feature, not polish.
- `sitemap.xml` comes from `@astrojs/sitemap` with its `i18n` option. Do not
  hand-roll it.

## i18n

- Locale keys are dot-notation, grouped by page or component
  (`nav.home`, `home.hero.cta`). Dictionaries are per-locale JSON in the site.
- Never concatenate a locale prefix by hand — use `localizePath()`.
- Italian is the default locale and is **unprefixed**: `/` is Italian,
  `/en/…` is English.

## Content

- Copy supplied by a friend in `ispiration/` is final. Transcribe it; do not
  rewrite, "improve", or translate it without being asked.
- `ispiration/` is read-only reference and is excluded from the build.

## Token model, resolved

Read this before writing `design-system/src/theme.css`. The obvious version of
the two-layer model silently breaks dark mode, and this is the fix.

The problem: Tailwind v4 emits `@theme` variables into `:root` under
`@layer theme`. If a semantic token is declared as
`@theme { --color-surface: var(--color-brand-50) }`, the generated utility is
`background-color: var(--color-surface)` — and overriding `--color-surface`
later works, but overriding the *primitive* it points at does not reliably
propagate, because Tailwind may resolve the reference at build time.

The fix is `@theme inline`, which tells Tailwind to inline the token's *value*
(itself a `var()`) into the utility, so the runtime cascade stays live:

```css
@import "tailwindcss";
@source "./components";              /* keep package classes from being tree-shaken */

/* 1. primitives — ramps, type, motion. What a SITE overrides. */
@theme {
  --color-brand-50:  …;  --color-brand-500: …;  --color-brand-950: …;
  --font-display: …;     --font-body: …;
}

/* 2. semantic aliases as plain vars. What COMPONENTS consume. Light first. */
@layer base {
  :root { --surface: var(--color-brand-50); --ink: var(--color-brand-950); … }

  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { --surface: …; --ink: …; }
  }
  :root[data-theme="dark"] { --surface: …; --ink: …; }
}

/* 3. expose the semantics as utilities — `inline` is load-bearing. */
@theme inline {
  --color-surface: var(--surface);
  --color-ink:     var(--ink);
}
```

Three dark-mode blocks, not one: bare `:root` for light, the
`prefers-color-scheme` block guarded with `:not([data-theme="light"])`, and an
explicit `[data-theme="dark"]` block. All three are needed for a manual toggle
to beat the system setting in *both* directions.

Only the semantic layer gets redefined for dark. Never the primitives.

## Tooling

**pnpm only.** `pnpm dlx` not `npx`, `pnpm view` not `npm view`. No npm or yarn
commands in this repo.

**`allowBuilds`, not `onlyBuiltDependencies`.** Fixed 2026-09-02; the old note
here called the warning benign, which was wrong. Under pnpm 11 the workspace key
is **`allowBuilds`, a map of package → boolean**. `onlyBuiltDependencies` (a
list) still parses and is silently ignored — that is why
`ERR_PNPM_IGNORED_BUILDS` survived two sessions of being called harmless.

It is not harmless: while any package is undeclared, **`pnpm exec` fails
outright**, so `pnpm check` and every other tool invocation dies with a stack
trace rather than a useful message.

Every package with an install script needs an explicit `true` or `false`.
`pnpm add` re-inserts any missing one as the literal string
`set this to true or false` — a stub for a human to resolve, not a value. If one
appears after an install, decide it rather than leaving it.

**`astro check` needs TypeScript 6, and it is the only thing that checks
`.astro` props.** TS 7's native compiler does not expose the API the Astro
language server uses, so `astro check` fails outright under it. `typescript@6`
is therefore a devDependency of each *site*; the root and the shared packages
stay on 7 for `tsc --noEmit`. Do not "tidy up" the duplicate — removing it
silently removes all component type-checking.

**`defineConfig` comes from `astro/config`, not `astro`.** The wrong import
produces a config-load stack trace that never names the real problem.

**A schema change needs `rm -rf <site>/.astro`, not just a dev restart.**
Astro caches the parsed content layer in `<site>/.astro/data-store.json`.
Adding a field to `content.config.ts` *and* the Markdown can leave the running
dev server with entries that lack the new field — `astro dev stop` and start is
**not** enough, because the restart reuses the cache. The symptom is nasty: the
production build is perfectly fine while dev throws
`Cannot read properties of undefined`, or a page 404s because
`getStaticPaths` saw an empty collection. Cost an hour once; clear the cache
first, then debug.

Related and milder: adding `src/content.config.ts` to an already-running dev
server needs a restart before any collection route resolves at all.

**`sharp` must be a direct dependency of every site.** It is a transitive dep
of Astro, but pnpm's isolated layout means the site cannot resolve it, and
`astro:assets` fails at build with `MissingSharp` — only when an image is
actually optimised, so it surfaces late.

**`pnpm check` runs `tsc --noEmit`, and it works.** Both packages have it.
This does not contradict the next paragraph — `tsc` and `astro check` are
different tools, and only the latter hangs.

**`astro check` does not work on the shared packages.** They have no pages, and
the standalone run hangs indefinitely. Type-checking of `.astro` components
happens in Phase 4 via the site that consumes them — that is the only run with
real signal. For a fast syntax check meanwhile, `@astrojs/compiler-rs` (a
transitive dep, under `node_modules/.pnpm/`) exposes `parse` and `transform`;
note its `convertToTSX` is not implemented in 0.4.0.

## `@factory/common`

**Everything derives from `defineSiteConfig()`.** Canonical URLs, hreflang, OG
tags, JSON-LD, `robots.txt` and `llms.txt` all read the same validated object,
which is why it throws on bad input at module load instead of returning a
result. The field is `siteUrl` (absolute, `http(s)` only, trailing slash
stripped for you).

**Never concatenate a URL by hand.** `src/site/url.ts` is the only place that
builds one. `normalizePath()` encodes two rules that must not drift apart:
pages get a trailing slash (Astro's `build.format: "directory"`), and anything
whose last segment has a file extension does **not** — `/sitemap.xml/` is a 404
in Astro 7. Same reasoning for `localizePath()`: a hand-built `/en/` prefix is
how hreflang goes quietly wrong.

**`<Seo>` takes the config as a `site` prop.** Astro has no ambient context and
this package deliberately does not invent one with a module-level global — a
layout threads `site` through once and pages never see it.

**Content-schema fragments import `z` from `astro/zod`, never from `zod`.**
Astro runs `instanceof` checks on collection schemas, and an instance from a
second copy of zod fails them *silently* — the failure looks like a schema that
accepts anything. `astro/zod` is Astro's own instance.

Not `astro:content` and not `astro:schema`: both re-export the same thing but
are deprecated in Astro 7 and removed in Astro 8. `astro/zod` is also a real
module path rather than a virtual one, so the fragments type-check outside an
Astro build.

**One `@graph` per page, not several scripts.** `graph(...baseGraph(config),
…)` composes nodes that reference each other through the stable `@id`s in
`ids`. Several competing top-level entities read as competing claims about who
the publisher is.

**`serializeJsonLd()` escapes `<`.** A `</script>` inside any string value
would close the tag early and inject the remainder as markup. Never
`JSON.stringify` into a script tag directly.

## Sites

**Every site exports `builtLocales` from `site.config.ts`** — the locales it has
actually published copy for, which is *not* the same as `locales.supported`.
Feed it to `getAlternates()`, `sitemapI18nConfig()` and `sitemapFilter()`.

Skipping this does not error; it ships contradictory hreflang. Astro's i18n
`fallback` emits a page for every configured locale — a `noindex` redirect stub
under `fallbackType: "redirect"` — and `@astrojs/sitemap` will happily list
those stubs as canonical URLs with their own hreflang, disagreeing with what
`<Seo>` renders on the real page. This happened in Angelo's first build.

**`astro.config.mjs` derives everything it can from `site.config.ts`:**

```js
import { astroI18nConfig, sitemapI18nConfig, sitemapFilter } from "@factory/common";
import { site, builtLocales } from "./src/site.config.ts";

site: site.siteUrl,
i18n: astroI18nConfig(site),
integrations: [sitemap({
  i18n: sitemapI18nConfig(site, { locales: [...builtLocales] }),
  filter: sitemapFilter(site, [...builtLocales]),
})],
```

**The layout owns `<head>`, not the page.** `BaseLayout` is the only file that
imports `<Seo>` and the only one that knows about `site`. A page passes a title
and optional JSON-LD nodes and nothing else.

**`global.css` imports the theme, then overrides it.** Order is load-bearing and
there is no `@source` line — see the Tailwind note above.

## Per-game theming

A game tints the studio's identity; it does not replace it. Each entry in the
`games` collection carries `theme.light` and `theme.dark`, `GameTheme.astro`
emits `[data-game="<id>"] { --accent: … }`, and `BaseLayout` puts `data-game` on
`<body>`.

This works only because components consume semantic roles and never primitives
— re-declaring the roles inside a scope re-themes everything within it with zero
component edits. It is the factory's re-theming contract one level down.

**Both light and dark are required**, and there are three blocks, not one, for
exactly the reason `theme.css` has three: a flat override would also beat the
design system's dark-mode block, leaving a game themed for white paper with a
light-on-light button when the viewer prefers dark.

**Contrast is checked, not eyeballed.** Every accent must carry its
`accentContrast` text at 4.5:1 *and* read against `--surface` in both modes.

## Images

**Always pass explicit `width` and `height`, even alongside `widths`.** Without
them Astro emits the *intrinsic-size* original as the non-srcset `src` — a
3068x2160 box shot became a 272 KB fallback and set the layout dimensions to
match. With them, `src` is generated at the size you asked for.

**Copy client assets into `src/assets/` rather than importing from
`ispiration/`.** That folder is read-only reference and excluded from the
build; copying makes the build's real inputs explicit and keeps the originals
untouched.

**`pnpm --filter <site> budget [route]`** prints the first-visit weight of a
built route against the 100 KB budget: document, stylesheets, preloaded fonts
and one variant per image (the smallest srcset candidate — a phone at 1x). It
exits non-zero when over. Run it before claiming a page is within budget.

**One webfont, not a family set.** A display face is what makes a page look
designed; a second downloaded family for body text costs ~25 KB of the budget
and is not distinguishable from the system stack at reading sizes.

## Off-site links, newsletter, OG images

**A newsletter signup ships zero JavaScript.** A `method="get"` form serialises
its own fields into the query string of `action`, so `NewsletterForm` points
straight at the provider's subscribe endpoint. Do not reintroduce the common
pattern of intercepting `submit` and calling `window.open` — it is a script for
something the platform already does, and it breaks with JS disabled or still
loading.

**Never hand-write `target="_blank"`.** Use `Button external` or
`ExternalLink`, which set `target`, `rel="noopener noreferrer"` and a visually
hidden "opens in a new window" note as one unit. `target` without `rel` hands
the opened page a `window.opener` handle; a tab that opens silently is
disorienting. The sr-only label is an overridable prop — the design system holds
no dictionary.

**Placeholder URLs use `.example`, never a plausible guess.**
`<studio>.substack.com` might be real and belong to someone else, and a signup
form pointed at a stranger's list would hand them real email addresses.
`.example` is IANA-reserved and can never resolve, so a placeholder that
survives to production fails loudly instead of quietly doing the wrong thing.
Same reasoning as `siteUrl`.

**`sameAs` follows the entity.** A studio's own profiles go in
`site.config.ts` → `links` and land on the `Organization`. A *game's* listings
(Gamefound, BoardGameGeek) belong in that game's frontmatter and land on its
`Game` node. Putting a game's storefront on the Organization claims the studio
and the game are the same entity.

**OG images come from `@factory/common/og` (`renderOg`), through an endpoint, not from `astro:assets`.** Promoted from angelo when annina needed it (2026-11-05): `src/pages/og/*.jpeg.ts` calls `renderOg(file, background)`. `{ bleed: true }` fills the whole card (for a source that is already a finished card with its own background, like annina's logo — a margin would show that background's edge as a hard line). Angelo's images were compared byte for byte before and after the move: do the same when you change `renderOg`. Original reasoning, still true:
`getImage({ fit: "contain" })` fits *inside* the box rather than padding out to
it, so a 3:2 source yields 895x630 while the meta tags declare 1200x630 — and a
scraper trusts the tags. `src/pages/og/*.jpeg.ts` composites onto a full-size
canvas. Emit **JPEG, not WebP**: several scrapers ignore WebP and then show no
preview at all, which is the failure the image exists to prevent.

Two path gotchas, neither guessable: in an endpoint, `import.meta.url` points
into the bundle rather than the source tree, so studio-level assets resolve from
`process.cwd()`; and a content-collection image carries `fsPath` at runtime but
Astro does not expose it on the public `image()` type, so it needs a cast with a
runtime guard.

**Every page needs an `og:image`.** Set `defaultImage` in `site.config.ts` so a
page that supplies none still gets one. OG images are fetched only by scrapers,
never by a visiting browser, so they cost nothing against the first-visit
budget — `budget.mjs` correctly ignores them.

**Images cannot be inferred from an external link.** BoardGameGeek's XML API
answers 401 (it requires registration) and Gamefound answers 403, regardless of
user-agent. Use the artwork the client supplied.

## Scaffolding a site

`pnpm new-site <dir> --name "Display Name" [--with events,shop] [--with-backend] [--url …]`.

**`--with-backend` makes a project folder, not a package**: `<dir>/{site,app,backend}`
plus `<dir>/demo.config.mjs` (see "Grouped projects"). The backend template is the
generic part of Annina's: a contact form (`/contatti/`, zero JS) → the `request`
edge function → an `inbox` table → a "Richieste" page in the app, with login, the
two-adapter data layer (mock/Supabase), the build-time key guard and a mock backend
for `pnpm demo --<dir>`. Domain tables (Annina's dogs, visits, appointments) are not
in it on purpose: add them to `schema.sql`, `mock/backend.mjs` and
`app/src/lib/data*.ts` together — a method missing from one of the three is the bug
to look for. It is not `--with backend` because a backend is a different shape
(three packages), not one more module of the site.

**A template change is only proven by generating from it.** Both the `tsconfig`
depth and an unused import slipped through hand-edited copies and only showed up
in a freshly generated project. After editing `scripts/templates/`, generate a
throw-away project (`--with-backend`, and a flat one with `--with events,shop`),
run `astro check --minimumSeverity hint` on each package, `pnpm demo --<dir>`, then
delete it: its folder, `plan/<dir>/`, its `pnpm-workspace.yaml` lines, `deploy/<dir>`.
`__ROOT__` in a template is `..` for a flat site and `../..` for a project.
Never copy a site folder by hand — the generator also adds the workspace entry
and seeds `plan/<dir>/`. Then `pnpm install`, because a new workspace member
needs linking.

**Fix the template, not the generated site.** A bug found in a scaffolded site
goes into `scripts/templates/site/`, and the site is regenerated (delete the
folder, `plan/<dir>/` and its line in `pnpm-workspace.yaml`) — otherwise the
next site inherits it. Template syntax is documented at the top of
`scripts/new-site.mjs`.

**`noindex` needs two hops.** A collection's `noindex` field does nothing by
itself: the page must pass `noindex` to `BaseLayout`, which forwards it to
`<Seo>`. It still appears in the sitemap (see ROADMAP Phase 5).

## The JS exceptions

Zero client JS still holds on every page except these, each with a DECISIONS entry:
1. **Event page booked through Instagram** (`events` module): one inline script that
   copies a prefilled message (DECISIONS 2026-10-23). `is:inline`, guarded.
2. **`annina` `/prenota/`**: the booking calendar and the "remember my details" box, one
   bundled script (DECISIONS 2026-11-05).
3. **`annina` `/scheda/`**: only the "remember my details" box, one script.
Do not copy any of these patterns to another page without a new decision.

An exception must be **progressive enhancement**: the page and its form work without
the script, and a failure of whatever it calls leaves the plain version in place.
`pnpm --filter <site> budget <route>` counts external scripts and prints
`JS requests: N`; anything above 0 on a page with no decision is a regression.

## Availability (annina; promote only when a second site books by time)

`annina/backend/supabase/functions/_shared/availability.ts` is the single source of
truth for "which times may a client ask for": pure (no clock, no I/O; `now` is an
argument), imported by the `availability` edge function, the mock backend and (types
and `checkSettings`) the app. Keep it free of Deno and Node specifics, like
`validate.ts`.

**The public endpoint returns free start times and nothing else.** Never add who,
what, or how many other appointments there are; an availability answer is read by
any visitor. CORS is limited to the origin of `SITE_URL`; the answer is cached 30 s.

**Wall-clock times live in the studio's zone** (`settings.timezone`); each slot
carries its UTC instant, so a browser never converts a zone. Offsets are resolved
with `Intl` and a second pass for DST edges, both covered by tests.

**Test it with `pnpm --filter annina-backend test`**, and when you change the
calculation, mutate it: break a boundary (`<` to `<=`, drop the buffer, exclude a
closure's end day, remove the DST second pass) and confirm a test fails. Two of six
mutations survived the first version of the tests — passing tests prove little until
they are shown to fail.

**Open requests hold their slot, and the server re-checks it.** `pendingHolds()` (pure)
feeds the same busy list as appointments; `load-availability.ts` (Deno) and the mock's
`availabilityDays()` build that list from the same inputs — keep them identical. The
`request` function asks the loader on submit and answers `#orario` if the time is gone.
Only `slot` and `created_at` of an open request are read for this; no other field of an
inbox row may be returned by a public endpoint.

**Email is required on public forms and checked by shape only**, in `specs.ts`
(`looksLikeEmail`, which also refuses a newline: addresses end up in headers). A required
flag and the format check overlap, so removing only the flag changes nothing (an
equivalent mutation, left on purpose as documentation).

**Settings shape lives in two places that must agree**: `DEFAULT_SETTINGS` and the
seed row in `schema.sql` (a test compares them). In `annina` the SQL lives only in
`backend/supabase/migrations/` (no `schema.sql`; a test refuses one): read "`schema.sql`"
as "the migrations" there, and change a pushed database with a new migration file.

## Events and shop (`@factory/common`)

**Event times are wall-clock + zone.** Write `start: "2026-11-07T18:00"` with
`timezone` (default `Europe/Rome`); no `Z`, no offset. A date alone is an
all-day event, and its `end` is the last day, inclusive. Resolution is in
`common/src/calendar/time.ts`.

**`soldOut` is manual.** Set it on the event and rebuild; the site cannot see
Stripe. It hides the booking button and marks the JSON-LD offer `SoldOut`.

**Booking is off-site too.** `bookingUrl` + `bookingProvider` only choose the
button label; the site never counts seats (`capacity` is display-only). A
`mailto:` link opens in the same tab, anything `http(s)` in a new one.

**A product's buy link is off-site.** `buyUrl` + `provider` (`stripe`,
`vinted`, `other`); the button label comes from the dictionary. Flipping
`availability` to `sold` needs a rebuild. `.example` placeholders as always.

**`seoFields` already owns `image` / `imageAlt`.** Name a collection's own
picture something else (`cover`, `photo`) or the spread silently overwrites it.

## Environment variables and keys (annina, annina-app)

**Every `PUBLIC_*` variable is shipped to the browser.** Astro inlines it into
JavaScript anyone can download, so only values safe for the whole internet go
there: the Supabase project URL and the **anon / publishable** key (row-level
security is what protects the data). The **service-role / secret** key bypasses
RLS and must never be in a `PUBLIC_` variable, a repo, a chat, or a page.

`annina/app/env-guard.mjs` enforces this at **build time** (a runtime check would
come too late — the key would already have shipped). It runs from
`astro.config.mjs`, reads the `.env*` files and the real environment, and fails
the build naming the variable, never printing the value. It uses Node's
`util.parseEnv` (Node ≥ 20.12) because `vite` is not resolvable from a pnpm
package that does not list it. `site` has the same exposure but no guard yet —
it only reads the project URL; add the guard if it ever reads a key.

**Where each secret lives.** Browser-safe values: `annina/app/.env` and
`annina/site/.env` (git-ignored, `.env.example` is the template). Server-side secrets
(`SITE_URL`, later `RESEND_API_KEY`): `annina/backend/supabase/.env`, loaded with
`supabase secrets set --env-file`. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
are injected into edge functions by Supabase itself — never copy them by hand.

**`PUBLIC_DATA_MODE`**: `mock` (default) = sample data in the browser; `supabase`
= the real database. Anything unconfigured falls back to `mock`, never to a half
connected real mode.

**Two type-checkers.** `annina/app` and `annina/site` are checked by `astro check`;
the Supabase edge functions (Deno code: `Deno` and `npm:` imports are unknown to
it) live in `annina/backend` and are checked with
`pnpm --filter annina-backend check:functions` (`deno check`). Running only the
first lets a broken function through. `deno check` resolves the functions'
`npm:@supabase/supabase-js` from `annina/backend/node_modules`, which is why that
package lists it as a devDependency — without it Deno tries to write to its global
cache and fails. Do not "tidy" it away, and do not add `--no-config`.

## Local demo (`pnpm demo --<site>`)

`pnpm demo --<site>` builds the site for local use and serves it with a mock
backend on one origin; `pnpm build:site --<site> [--base /repo/] [--demo]` builds
the merged folder for a GitHub preview or a real domain. Both read
`<site>/demo.config.mjs` (the site is a `--flag` or a bare word; any `--name` with a manifest counts, an unknown flag is an error; type `DemoManifest`, `common/src/demo/manifest.ts`);
a site without one has no demo. Output goes to `deploy/<site>/`, demo state to
`deploy/.state/<site>.json` (both git-ignored, `--reset` clears the state).

**A mock backend must reuse the real validation**, not copy it. Annina's
imports `annina/backend/supabase/functions/_shared/validate.ts` and `specs.ts`, so the demo and
production cannot disagree about what a valid form is. Those two files must stay
free of Deno and Node specifics for that reason.

**The demo server is not a security boundary**: no auth, 127.0.0.1 only. Never
point it at real data.

**Never disturb a demo that is running.** Someone may be using `pnpm demo` on port 4321. Test on
other ports (they get their own state file), stop only processes you started (keep the PID;
never `pkill -f scripts/demo.mjs`, which also kills theirs), and do not delete or rebuild the
folder a running server serves (`deploy/<site>-local/`): every page 404s until it is back. A
`--local` rebuild replaces that folder, so tell them to restart or reload.

**`--local` needs base `/`**; a GitHub preview (`--base /repo/`) has no backend,
so only the public pages and the app shell work there.

**Three builds, three folders, never mix them.** `pnpm build:site --<site>` → `deploy/<site>/`
(what a domain would serve: sitemap, open robots, real canonicals; do not push while `siteUrl`
is a `.example`); `--demo [--base /repo/]` → the same folder, noindex everywhere, `Disallow: /`,
no sitemap (what you push to the GitHub preview); `--local` → `deploy/<site>-local/`, noindex,
for `pnpm demo` only. Before pushing a preview, read `deploy/<site>/robots.txt`: it must say
`Disallow: /`. A non-demo build left in `deploy/<site>/` is a hazard — delete it.

**Node-only code in `common` lives under `./demo`** and is imported only from
`scripts/`. A page importing it would drag `node:http` into a browser bundle.

## Grouped projects (a site with its own app and backend)

A site that needs a private app and a backend is a **project folder** instead of
a single package: `annina/` holds `site/` (public), `app/` (private) and
`backend/` (Supabase schema and functions plus the local mock, shared by both
front ends), with the `demo.config.mjs` at the project root. Each of `site/`,
`app/`, `backend/` is its own pnpm package (`annina`, `annina-app`,
`annina-backend` — names did not change), listed in `pnpm-workspace.yaml` by
path (`annina/site`). `plan/<project>/` stays one folder per project.

A manifest build says where its package lives: `{ package, dir: "annina/site", … }`;
`dir` defaults to `package`, which is why flat sites (`angelo`, `amarti`) need
nothing. A new site starts flat (rule of two: do not pre-group) and is grouped
when it first needs a backend — `new-site --with-backend` for a site that is born
with one, `pnpm add-backend <site>` for one that already exists. `new-site` never
converts anything; only `add-backend` touches an existing site.

Paths in `tsconfig.json` climb one level further: `extends` is
`../../tsconfig.base.json`.

**`annina` and `amarti` are no longer grouped projects inside the factory**: they are
standalone repos (next section). What follows here still describes a project that
`new-site --with-backend` / `add-backend` generate today.

## Standalone projects (`pnpm sync <project>`)

`annina/` and `amarti/` are their own repos (DECISIONS 2026-11-26): own
`pnpm-workspace.yaml` (`site`, `app`, `backend`, `e2e`, `vendor/common`,
`vendor/design-system`), own root `package.json` and lockfile, own `.gitignore`,
`CLAUDE.md`/`AGENTS.md`, and their plan in `<project>/plan/` (not `plan/<project>/`;
`pnpm resume <project>` finds it). They are **not** in the factory workspace: run
pnpm inside the project folder (`cd annina && pnpm check`), never `pnpm --filter annina`
from the factory root.

- **`vendor/` is written only by `pnpm sync <project>` in the factory.** Never edit it
  in the project. A fix goes into `common/` or `design-system/`, is checked in the
  factory (angelo + tests), then synced to each project, followed by `pnpm install`
  there if a `package.json` changed, and `pnpm check && pnpm test && pnpm build`.
- **Drift is refused, not merged.** `vendor/.factory-sync.json` has a sha256 per file;
  a hand edit (modified, added or deleted file) makes `pnpm sync` and
  `pnpm vendor:check` fail with the list. `--force` overwrites — only after the
  change has been moved into the factory or deliberately dropped.
- `pnpm sync <project> --check` changes nothing and says whether the project is
  behind. A project not synced stays on its old copy: that is the point.
- What is synced is the `SET` at the top of `scripts/sync.mjs`. Editing
  `plan/CONVENTIONS.md` or `plan/DECISIONS.md` makes every project "behind" too; sync
  them at the end of the session.
- **Proving "pushable"** (no git yet): copy the project somewhere outside the factory
  with the `.gitignore` exclusions (`rsync … --exclude node_modules --exclude dist
  --exclude .astro --exclude '.env' --exclude '.env.*' --include .env.example
  --exclude /deploy --exclude 'supabase/.temp'`), then `pnpm install --frozen-lockfile`,
  `pnpm vendor:check`, `pnpm check`, `pnpm test`, `pnpm build`. Grep the copy for keys.
- A new dependency of `common`/`design-system` lands in a project's lockfile only when
  `pnpm install` runs there after the sync; commit both together.
- **Not yet realigned**: `pnpm demo` / `pnpm build:site` and `annina/e2e` still assume
  the factory layout (`dir: "annina/site"`, `../../scripts/demo.mjs`), and the preview
  repos are still `deploy/annina` and `deploy/amarti` in the factory. ROADMAP Phase 8.

## Adding a backend to an existing site (`pnpm add-backend <site>`)

Turns a flat site into the project shape. **Run `--dry-run` first** — it changes
nothing and prints what it would create, merge, patch and leave for you. A real run
backs the site up to `deploy/.backup/<site>-<time>.tgz` first (there is no git; the
last line of its output is the exact undo command, which was tested) and refuses to
write over a file it did not plan to create.

**A flat site may already have a `demo.config.mjs`** (a preview-only manifest: one build, no `dir`, no `backend` — amarti's). `add-backend` replaces it with the project one (same `demoEnv`) and does not carry it into `site/`; a manifest with a `backend`, a `dir` or several builds still means "already a project". The check imports the manifest instead of grepping it: a comment saying "no backend:" fooled the first version.

**It patches only what it recognises exactly.** Each patch is a string from the
base templates; a group of patches (the `BaseLayout` three, the header two) is
all-or-nothing. A customised file that does not match is left untouched and listed
under MANUAL STEPS with the string it looked for and the snippet to add. Angelo's
`BaseLayout` is such a case. Never loosen a match to "make it work": a patch applied
to a file it does not understand is how a site breaks silently. When a base template
changes, update the matching `find` string in `scripts/add-backend.mjs` too.

**Dictionaries are merged, never replaced**: only keys the site lacks are added, and
a clash keeps the site's own value. **Existing files are never overwritten**; only
new ones are created.

**Test it on a COPY, never only on `--dry-run`.** A dry run reads the original
folder, a real run reads it before the move too — but the first version looked in
the wrong place on a real run and overwrote a dictionary, which the dry run could not
show. To test: copy a flat site (`rsync -a --exclude node_modules --exclude dist
--exclude .astro amarti/ zzcopy/`), rename its package, add it to the workspace, run
it, `pnpm install`, type-check every package, `pnpm demo --zzcopy`; then delete it,
`deploy/<copy>`, `deploy/.backup`, and its workspace lines.

**Shared engine:** `scripts/_scaffold.mjs` (render, merge, collect, workspace edits)
serves both `new-site` and `add-backend`. Changing it? Generate a flat and a
`--with-backend` project before and after and `diff -r` them: a refactor must produce
identical output.

**Internal links go through `url()`** (`src/lib/path.ts`) in every template layer,
events and shop included; proven by building with `SITE_BASE=/x/` and grepping the
HTML for any `href`/`src`/`action` starting with `/` but not `/x/`.

## Favicon and link previews

**Ship `/favicon.ico` (and name it in the layout).** A browser asks for it whatever
the `<link>` tags say; without the file every page load is a 404, which also hides
real errors in a browser test. The layout's `<link rel="icon">` goes through `url()` so
it survives a base path. Skip PNG sizes nobody asked for: Chrome may pick the largest
`<link rel="icon">`, so a 192 or 512 px file becomes a per-visit download.
A touch icon (`apple-touch-icon.png`, opaque — iOS paints transparency black) is only
fetched by iOS.

**`new-site` writes a random placeholder favicon** (`@factory/common/og`
`renderPlaceholderIcons`): a random hue and a random white shape (ring, diamond,
triangle, bars, dot, moon) on a rounded square, as `favicon.ico` (16/32/48 px, PNG
entries) and an opaque `apple-touch-icon.png`, in `public/` of the site and, for
`--with-backend`, of the app too. The layouts' `<link>` tags are in the templates, so
a new site starts with no favicon 404, and it is obviously not a brand. `--icon-seed N`
makes it repeatable. The plan template lists "replace the placeholder" so it is not
forgotten. Shapes, not letters: lettering would depend on the fonts of the machine
running the generator. `add-backend` gives the app a copy of the site's icons, or a
random placeholder (and a manual step) if the site has none; it never touches the
site's own files for this. Still not generated: an OG endpoint and `defaultImage`.

**A link preview needs a reachable `siteUrl`.** `og:image` is `siteUrl` + path, and
`siteUrl` is a `.example` placeholder until a real domain exists (and `common` assumes
it has no path), so sharing the GitHub preview shows no card. That is the correct
failure; do not "fix" it with a guessed domain. Browser tests must not excuse a
`/favicon.ico` 404 any more — it was removed from the exceptions.

## Forms (public, zero JS)

**A form POSTs to an edge function and gets a 303 back.** Success goes to `/grazie/`,
a refusal to `<form page>/#errore`, where a `hidden … target:block` banner with
`role="alert"` shows the message (CSS `:target`; the old `?errore=1` could not be read
by a static page). Every form has the same honeypot field (`website`) and a server
whitelist (`_shared/specs.ts`); an unknown field is dropped.

**Test the server rule, not just the browser.** The browser already blocks an empty
required field, so a browser test of "the server refuses" passes for the wrong reason.
`annina/backend/test/forms.test.mjs` runs the real `validate()` with forged values
(`consent=yes`, a filled honeypot, an over-long field…) and is mutation-checked: each
mutation of `validate.ts`/`specs.ts` (check ignored, honeypot ignored, no trim, no cap,
required not enforced) fails a test. Do the same for any new rule.

**A consent text is versioned data.** Store the version with every signature and change
it with the wording. Draft wording is marked on screen and in the version name
(`bozza-…`), never silently.

**Browser tests must not depend on the hour.** The first bookable day is cut by the
notice period, so what is left of it changes through the day; use a whole day.

## Tests in `common`

`pnpm --filter @factory/common test` (Node's runner, no dependencies) covers `robotsTxt`,
`getAlternates` and `llmsTxt`. Behaviour of `common` is read by every site, so a change to it
gets a test and a mutation check, and every site's output is rebuilt and inspected
(angelo, amarti and annina for the crawler list and hreflang change).

## Browser tests (`annina/e2e`)

`pnpm --filter annina-e2e test` builds the local demo and runs every browser test in real
Chrome; `test:no-build` reuses `deploy/annina-local`. Rules that cost a debugging session each:

- **Each test starts its own demo on its own port** (4410–4550) with its own state file, and
  stops only the server it started. Never use `pkill -f` on a name; never delete the folder a
  running demo serves. A `--local` build replaces `deploy/annina-local/`, so someone using the
  demo on 4321 must reload.
- **Never `page.type()` into a field the script may hide.** Typing into a hidden element does not
  fail: the keys go to the previously focused field (a dog named "FidoMeticcio"). Wait for the
  enhancement to finish first, then use what is visible, as a client would.
- **Bring the tab you use to the front** (`page.bringToFront()`) when several are open: Chrome
  throttles background tabs and `waitForFunction` stalls.
- **Read a redirect from the server side** (`node fetch` with `redirect: "manual"`); a browser
  `fetch` returns an opaque response.
- **Do not depend on the time of day**: the first bookable day is cut by the notice period.
- A test that passes must be shown to be able to fail: break the code on purpose, watch it go red,
  restore from a backup taken first (a mutation script that dies half-way leaves the file broken).

## Deploying a site and its function separately

The site and the Supabase function are published on their own schedule, so either may be newer.
A client must require only what it cannot work without and treat every extra as optional; a
missing or malformed answer falls back to the plain page. The mock backend is loaded once:
restart `pnpm demo` after changing it. Test version skew by feeding the page an older answer.

## Remembered details (visitor's device)

Only basics, only after a tick, removable at once, never health, consent, signature, message or
time (`annina/site/src/lib/remember.ts`; `annina/e2e/remember.mjs` proves each point). Stored
values are untrusted: whitelist keys, cap length, insert as text. Anything new that wants to be
remembered needs its own decision, because it is personal data in the visitor's browser.

## Private apps and the PWA (`annina/app`, `scripts/templates/app`)
- **Layout**: `AppShell` from the design system (top bar, title + `actions` slot, `#status` line, tab bar: bottom on a phone, under the top bar from 48 rem). Tabs are `{ id, label, href, icon }` with icons `today | dogs | inbox | hours | more`; a page that has no tabs (login) passes `plain`. The shell is zero JS; the app's layout script fills `[data-badge-for="<tab id>"]` and `#offline`.
- **Helpers**: import from the app's `lib/ui.ts` (which re-exports `@factory/common/app` and adds `href`, the only thing that needs `BASE_URL`). A string given to `el()` is a TEXT node: never use `innerHTML` for anything a stranger could have typed.
- **Actions that lose something ask first** with `confirmDialog` (a `<dialog>`; the safe button has focus). Warnings that the owner can overrule (overlaps) are a sentence plus "Salva comunque", never a block.
- **Durations** are shown with `fmtDuration` ("1 h 30"), dates with the `fmt*` helpers (Italian), and form dates with `toLocalInput` / `localDay` (LOCAL time: `toISOString().slice(0, 10)` is the wrong day after midnight in Rome).
- **PWA**: `src/pages/manifest.webmanifest.ts` calls `webManifest()`, `src/pages/sw.js.ts` calls `serviceWorkerSource()` (both read `BASE_URL`, so a path prefix works), the layout links the manifest, sets `theme-color` for light and dark and `viewport-fit=cover`, and registers the worker only in production builds. Icons: `pnpm pwa-icons <source.png> <app>/public/icons --background "#fff" [--crop l,t,w,h] [--circle]`. The worker lives at the app's own path so its scope needs no special header.
- **Never cache** anything that carries data: list its URL fragments in `bypass`. The unit test (`common/test/pwa.test.mjs`) fails if a request to another origin, a non-GET, or a bypassed path is answered; `annina/e2e/pwa.mjs` lists the Cache Storage and fails on any data URL.
- A PWA needs HTTPS to install (localhost counts). iPhone has no install prompt: the app says "Condividi → Aggiungi a Home". The home-screen badge is a courtesy and fails silently.

