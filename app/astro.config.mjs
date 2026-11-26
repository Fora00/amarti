// @ts-check
import { defineConfig } from "astro/config";
import tailwind from "@tailwindcss/vite";
import { assertNoSecretsInPublicVars, readDotenvFiles } from "./env-guard.mjs";

// Checks .env files AND the real environment (CI), before anything is bundled.
assertNoSecretsInPublicVars({ ...readDotenvFiles(process.cwd()), ...process.env });

// The private app: no sitemap, no i18n, no SEO — it is behind a login and must
// never be indexed. It ships client JS on purpose (the zero-JS rule is for the
// public pages; see vendor/plan/CONVENTIONS.md).
export default defineConfig({
  // GitHub Pages project path or a custom domain; set via env at build time.
  site: process.env.APP_SITE ?? "https://app.amarti.example",
  base: process.env.APP_BASE ?? "/",
  vite: {
    plugins: [tailwind()],
    ssr: { noExternal: ["@factory/design-system", "@factory/common"] },
  },
});
