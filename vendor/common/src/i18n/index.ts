import type { Locale, SiteConfig } from "../site/config.ts";
import { absoluteUrl, normalizePath } from "../site/url.ts";

/**
 * i18n for a factory site.
 *
 * The default locale is served unprefixed (`/lore/`), every other locale sits
 * under its code (`/en/lore/`). Nothing here should be reimplemented per site:
 * a hand-built locale prefix is how hreflang goes quietly wrong.
 */

/** Per-locale JSON, nested or flat. `{ nav: { home: "Home" } }` and `{ "nav.home": "Home" }` both resolve for `nav.home`. */
export type Dictionary = { [key: string]: string | Dictionary };

export type TranslateParams = Record<string, string | number>;

/** One hreflang row. `locale` is `x-default` for the fallback entry. */
export interface Alternate {
  locale: string;
  href: string;
}

export interface I18nOptions {
  config: SiteConfig;
  /** Keyed by locale. Every locale in `config.locales.supported` should be present. */
  dictionaries: Record<Locale, Dictionary>;
}

const missing = new Set<string>();

// Vite defines `import.meta.env.DEV`; plain Node does not, and this package is
// type-checked without Astro's client types. Widen locally rather than pulling
// `astro/client` into a package that has no DOM.
const isDev =
  (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV ?? false;

/** Warn once per distinct message — a missing key in a loop would otherwise flood the build log. */
function warnOnce(message: string): void {
  if (!isDev || missing.has(message)) return;
  missing.add(message);
  console.warn(`[i18n] ${message}`);
}

/** Walk a dot-path, accepting a flat key at every level. */
function lookup(dictionary: Dictionary, key: string): string | undefined {
  const direct = dictionary[key];
  if (typeof direct === "string") return direct;

  const parts = key.split(".");
  let node: string | Dictionary | undefined = dictionary;

  for (const part of parts) {
    if (typeof node !== "object" || node === null) return undefined;
    node = node[part];
  }

  return typeof node === "string" ? node : undefined;
}

/** Replace `{name}` placeholders. Unmatched placeholders are left visible on purpose. */
function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

export function defineI18n({ config, dictionaries }: I18nOptions) {
  const defaultLocale = config.locales.default;
  const locales = config.locales.supported;

  /** Strip a leading locale segment. Returns the locale it found (default if none) and the shared path. */
  function stripLocale(pathname: string): { locale: Locale; path: string } {
    const normalized = normalizePath(pathname);
    const [, first = ""] = normalized.split("/");

    if (first !== defaultLocale && locales.includes(first)) {
      const rest = normalized.slice(first.length + 1);
      return { locale: first, path: normalizePath(rest || "/") };
    }

    return { locale: defaultLocale, path: normalized };
  }

  /** The locale a URL belongs to. Pass `Astro.url.pathname`. */
  function localeFrom(pathname: string): Locale {
    return stripLocale(pathname).locale;
  }

  /**
   * Prefix a shared path for a locale. The only sanctioned way to build a
   * localised link — never concatenate the prefix yourself.
   */
  function localizePath(path: string, locale: Locale = defaultLocale): string {
    const { path: shared } = stripLocale(path);
    if (locale === defaultLocale) return shared;
    return normalizePath(`/${locale}${shared}`);
  }

  /** Absolute URL of a shared path in a given locale. */
  function localizedUrl(path: string, locale: Locale = defaultLocale): string {
    return absoluteUrl(config, localizePath(path, locale));
  }

  /**
   * hreflang rows for a page, plus `x-default` pointing at the default locale.
   *
   * `available` narrows the list to the locales this particular page was
   * actually built in — advertising a locale that 404s or silently falls back
   * is worse than advertising none.
   */
  function getAlternates(path: string, available: Locale[] = locales): Alternate[] {
    const built = locales.filter((locale) => available.includes(locale));
    // hreflang says "this page also exists in another language". With one built
    // language there is nothing to say, and a lone self-reference is just noise.
    if (built.length < 2) return [];
    const rows: Alternate[] = built.map((locale) => ({
      locale,
      href: localizedUrl(path, locale),
    }));

    if (built.includes(defaultLocale)) {
      rows.push({ locale: "x-default", href: localizedUrl(path, defaultLocale) });
    }

    return rows;
  }

  /**
   * Translator bound to one locale. Falls back to the default locale, then to
   * the key itself — a visible `nav.home` in the page beats an empty element.
   */
  function useTranslations(locale: Locale = defaultLocale) {
    return function t(key: string, params?: TranslateParams): string {
      const own = dictionaries[locale];
      const hit = own && lookup(own, key);
      if (hit !== undefined) return interpolate(hit, params);

      const fallbackDict = dictionaries[defaultLocale];
      const fallback = fallbackDict && lookup(fallbackDict, key);
      if (fallback !== undefined) {
        warnOnce(`missing "${key}" for "${locale}" — using "${defaultLocale}"`);
        return interpolate(fallback, params);
      }

      warnOnce(`missing "${key}" in every locale`);
      return key;
    };
  }

  return {
    defaultLocale,
    locales,
    stripLocale,
    localeFrom,
    localizePath,
    localizedUrl,
    getAlternates,
    useTranslations,
  };
}

export type I18n = ReturnType<typeof defineI18n>;
