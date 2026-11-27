// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwind from "@tailwindcss/vite";
import { astroI18nConfig, sitemapI18nConfig, sitemapFilter } from "@factory/common";

import { site, builtLocales } from "./src/site.config.ts";

export default defineConfig({
  // Both derived from src/site.config.ts so the locale list exists once.
  site: site.siteUrl,
  // "/" on a custom domain; "/<repo>/" on GitHub Pages. Set by `pnpm build:site`.
  base: process.env.SITE_BASE ?? "/",
  i18n: astroI18nConfig(site),

  // Display face ONLY, one weight: the posters are hand-lettered, Caveat is the
  // nearest open face. Body stays on the system stack (CONVENTIONS → Images,
  // "One webfont"). A placeholder until she says what her lettering is.
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Caveat",
      cssVariable: "--font-caveat",
      weights: [700],
      subsets: ["latin"],
      fallbacks: ["cursive"],
    },
  ],

  integrations:
    // A demo build is noindex everywhere; a sitemap listing its URLs would contradict that.
    process.env.PUBLIC_DEMO === "1"
      ? []
      : [
          sitemap({
            i18n: sitemapI18nConfig(site, { locales: [...builtLocales] }),
            // noindex pages (thank-you pages, the draft privacy notice) stay out of the sitemap.
            filter: (page) =>
              sitemapFilter(site, [...builtLocales])(page) &&
              !["/grazie/", "/iscrizione/", "/privacy/", "/richiesta-inviata/"].some((p) => page.includes(p)),
          }),
        ],

  vite: {
    plugins: [tailwind()],
    // Mandatory: Vite externalises workspace deps by default, which breaks
    // `.astro` files imported from node_modules. See vendor/plan/CONVENTIONS.md.
    ssr: { noExternal: ["@factory/design-system", "@factory/common"] },
  },
});
