/**
 * Internal links must respect Astro's `base`: on a GitHub project page the site
 * lives at `/<repo>/`, and a hard-coded `/eventi/` would 404. Use this for
 * every root-relative href. Never for absolute URLs or `#fragment`-only links.
 * Same helper as annina/site (CONVENTIONS → "Internal links go through url()").
 */
const base = import.meta.env.BASE_URL.replace(/\/$/, "");
export const url = (path: string) => `${base}${path}`;

/**
 * True for the temporary GitHub preview shown to the owner. Such a build must
 * not be indexed: it has a placeholder `siteUrl` and placeholder prices.
 */
export const isDemo = import.meta.env.PUBLIC_DEMO === "1";
