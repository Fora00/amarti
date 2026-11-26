import type { SiteConfig } from "./config.ts";

/**
 * URL construction, in one place.
 *
 * Canonicals, hreflang, OG `url`, JSON-LD `@id`, sitemap entries and
 * `llms.txt` links must all agree character-for-character — search engines and
 * extractors treat `/lore` and `/lore/` as two documents. Nothing outside this
 * module should be concatenating a site URL to a path by hand.
 */

/** A path whose last segment carries a file extension: `/sitemap.xml`, `/og.png`. */
function hasExtension(path: string): boolean {
  const last = path.split("/").pop() ?? "";
  return last.includes(".");
}

/**
 * Normalise a root-relative path to the exact form the site serves.
 *
 * Astro's default `build.format: "directory"` serves pages at a trailing
 * slash, so canonical URLs carry one. File-extension endpoints must **not** —
 * `/sitemap.xml/` is a 404 in Astro 7 regardless of config (DECISIONS.md).
 */
export function normalizePath(path: string): string {
  const [pathnameRaw = "", ...rest] = path.split(/(?=[?#])/);
  const suffix = rest.join("");

  let pathname = pathnameRaw.startsWith("/") ? pathnameRaw : `/${pathnameRaw}`;
  pathname = pathname.replace(/\/{2,}/g, "/");
  pathname = pathname.replace(/\/index\.html?$/i, "/");

  // Compare on the bare form so `/sitemap.xml/` is recognised as an endpoint.
  const bare = pathname.replace(/\/+$/, "");
  if (bare === "") pathname = "/";
  else if (hasExtension(bare)) pathname = bare;
  else pathname = `${bare}/`;

  return `${pathname}${suffix}`;
}

/**
 * Absolute URL for a root-relative path. Values that are already absolute are
 * returned untouched, so callers can pass either without branching.
 */
export function absoluteUrl(config: SiteConfig, path: string | URL): string {
  const value = String(path);
  if (/^https?:\/\//i.test(value)) return value;
  return `${config.siteUrl}${normalizePath(value)}`;
}

/**
 * Canonical URL for the page currently rendering.
 *
 * Pass `Astro.url` — query strings and fragments are dropped, because a
 * canonical that varies per query is not a canonical.
 */
export function canonicalUrl(config: SiteConfig, url: URL | string): string {
  const pathname = typeof url === "string" ? url.split(/[?#]/)[0]! : url.pathname;
  return absoluteUrl(config, pathname);
}
