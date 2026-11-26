import type { AstroUserConfig } from "astro";

import type { SiteConfig } from "./config.ts";

/**
 * Config fragments derived from `site.config.ts`, for `astro.config.mjs`.
 *
 * Without these, the locale list is written out three times — once here, once
 * in Astro's `i18n` block (which drives routing) and once in
 * `@astrojs/sitemap`'s `i18n` option (which drives sitemap hreflang). When
 * those three drift, routing and hreflang disagree and nothing errors. Same
 * failure mode `<Seo>` exists to prevent, one level up.
 *
 * Import the site config into `astro.config.mjs` and spread the result.
 */

/** Astro's own `i18n` block type, instantiated for runtime-derived locales. */
type AstroI18nBlock = NonNullable<AstroUserConfig<string[]>["i18n"]>;

export interface AstroI18nOptions {
  /**
   * What Astro does when a page is missing in a non-default locale.
   *
   * `"redirect"` (Astro's default) sends `/en/lore/` to `/lore/`.
   * `"rewrite"` serves the Italian content at the English URL, which means two
   * URLs with identical content — only choose it knowing that.
   *
   * Either way the fallback is a safety net, not a translation: `getAlternates()`
   * advertises only the locales a page was actually built in.
   */
  fallbackType?: "redirect" | "rewrite";
}

/**
 * The `i18n` block for `astro.config.mjs`.
 *
 * `prefixDefaultLocale` is always `false` — Italian is unprefixed at the root,
 * which is a settled decision, not a default worth re-deciding.
 */
export function astroI18nConfig(
  config: SiteConfig,
  options: AstroI18nOptions = {},
): AstroI18nBlock {
  const { fallbackType = "redirect" } = options;
  const { default: defaultLocale, supported } = config.locales;

  // Every non-default locale falls back to the default one.
  const fallback: Record<string, string> = {};
  for (const locale of supported) {
    if (locale !== defaultLocale) fallback[locale] = defaultLocale;
  }

  return {
    defaultLocale,
    locales: [...supported],
    routing: {
      prefixDefaultLocale: false,
      fallbackType,
    },
    // The one cast in this package, and it is a type limitation rather than a
    // value problem. Astro types `fallback` as a mapped type over the *literal*
    // union of locales, which only exists when a site writes them `as const`.
    // Derived from validated runtime config the union widens to `string`, and
    // `Exclude<string, string>` is `never` — so every value's declared type
    // becomes `undefined` and the property is unsatisfiable by construction.
    // The emitted value is exactly what Astro's own docs show, and Astro
    // re-validates this block with its own schema at startup, so a genuinely
    // malformed fallback still fails loudly at build time. The double cast is
    // required because the degenerate target type overlaps nothing.
    ...(Object.keys(fallback).length > 0
      ? { fallback: fallback as unknown as AstroI18nBlock["fallback"] }
      : {}),
  };
}

export interface SitemapOptions {
  /**
   * Locales the site has actually published pages for.
   *
   * Defaults to every supported locale, which is only correct once every
   * locale has real copy. Pass the built list otherwise — see the warning on
   * `sitemapFilter` for what goes wrong if you don't.
   */
  locales?: string[];
  /** Widen a locale to a regional hreflang tag: `{ it: "it-IT" }`. */
  hreflang?: Record<string, string>;
}

/**
 * The `i18n` option for `@astrojs/sitemap`, which wants locale → hreflang tag.
 *
 * A bare language tag (`it`) is valid hreflang and is what the config already
 * holds, so locales map to themselves unless `hreflang` widens them.
 */
export function sitemapI18nConfig(config: SiteConfig, options: SitemapOptions = {}) {
  const built = options.locales ?? config.locales.supported;
  const locales: Record<string, string> = {};

  for (const locale of config.locales.supported) {
    if (!built.includes(locale)) continue;
    locales[locale] = options.hreflang?.[locale] ?? locale;
  }

  return { defaultLocale: config.locales.default, locales };
}

/**
 * A `filter` for `@astrojs/sitemap` that drops pages in locales that were not
 * actually built.
 *
 * Astro's i18n `fallback` still emits a page for every configured locale — a
 * `noindex` redirect stub when `fallbackType: "redirect"`. Without this filter
 * the sitemap lists those stubs as canonical URLs and advertises hreflang for
 * them, which directly contradicts what `<Seo>` renders on the real page.
 * Two contradictory hreflang signals are worse than none.
 */
export function sitemapFilter(
  config: SiteConfig,
  builtLocales: string[],
): (page: string) => boolean {
  const unbuilt = config.locales.supported.filter(
    (locale) => locale !== config.locales.default && !builtLocales.includes(locale),
  );

  return (page: string) => {
    let pathname: string;
    try {
      pathname = new URL(page).pathname;
    } catch {
      pathname = page;
    }
    const [, first = ""] = pathname.split("/");
    return !unbuilt.includes(first);
  };
}
