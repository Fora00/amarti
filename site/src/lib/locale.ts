/**
 * Which language a page is in, and links that stay in it. Italian is the
 * default and unprefixed (`/eventi/`), English lives under `/en/`
 * (CONVENTIONS → i18n). One page component renders both: `pages/x.astro` and
 * `pages/en/x.astro` import the same view, and everything inside reads the
 * language from the URL through `useLocale(Astro)`, so no prop is threaded.
 *
 * The base path (`/amarti/` on GitHub Pages) is stripped first: the factory's
 * `localeFrom()` would otherwise read "amarti" as the first segment.
 */
import { url } from "./path.ts";
import { i18n } from "../i18n/dictionaries.ts";

export type Lang = "it" | "en";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

/** `/amarti/en/eventi/` → `/en/eventi/`. */
function withoutBase(pathname: string): string {
  return base && pathname.startsWith(base) ? pathname.slice(base.length) || "/" : pathname;
}

/** The page's language and its path shared across languages (`/eventi/`). */
export function pageLocale(pathname: string): { lang: Lang; path: string } {
  const { locale, path } = i18n.stripLocale(withoutBase(pathname));
  return { lang: locale as Lang, path };
}

/** A root-relative link in a language, through `url()` so the base path survives. */
export const localUrl = (path: string, lang: Lang): string => url(i18n.localizePath(path, lang));

/** Everything a page or component needs: `lang`, `t()`, `href()` and the BCP 47 tag for Intl. */
export function useLocale(astro: { url: URL }) {
  const { lang, path } = pageLocale(astro.url.pathname);
  return {
    lang,
    path,
    t: i18n.useTranslations(lang),
    href: (p: string) => localUrl(p, lang),
    /** The localized path WITHOUT the base, for JSON-LD / canonical helpers that add `siteUrl` themselves. */
    lpath: (p: string) => i18n.localizePath(p, lang),
    intl: lang === "en" ? "en-GB" : "it-IT",
  };
}
