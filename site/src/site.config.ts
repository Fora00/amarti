import { defineSiteConfig } from "@factory/common";

/**
 * PLACEHOLDER DOMAIN — must be replaced before launch.
 *
 * `siteUrl` is the root of every canonical, hreflang, OG `url` and JSON-LD
 * `@id` this site emits. `.example` can never resolve, so a value that
 * survives to production fails loudly instead of quietly doing the wrong thing.
 * See plan/BRIEF.md.
 */
const VINTED_URL = "https://www.vinted.it/member/180510136-martinabonfi";

export const site = defineSiteConfig({
  name: "aMarti ceramics",
  siteUrl: "https://amarti.example",
  description: "aMarticeramics Lab è un laboratorio di ceramica e concept store in Piazza Malfatti 10 a Rovereto, con laboratori creativi serali per adulti e bambini.",

  locales: {
    default: "it",
    supported: ["it", "en"],
  },

  organization: {
    name: "aMarti ceramics",
    // Her wordmark, traced (src/lib/logo.ts → `pnpm --filter amarti favicon`):
    // 180x180 opaque PNG, above Google's 112 px logo minimum. Swap for her
    // original file when she sends it.
    logo: "/apple-touch-icon.png",
  },

  // TODO: add `defaultImage` (1200x630, composed by an endpoint — see
  // angelo/src/pages/og/studio.jpeg.ts) once a logo exists. Without it a page
  // that sets no image ships with no link preview.

  // Off-site presences (Instagram, a Vinted profile…). Each becomes schema.org
  // `sameAs` on the Organization when `sameAs: true`.
  links: [
    { label: "Instagram", url: "https://www.instagram.com/amarticeramics/" },
    // Her own Vinted account (given by the user, 2026-11-20). A personal
    // profile, not the studio's, so it stays out of the Organization's sameAs.
    { label: "Vinted", url: VINTED_URL, sameAs: false },
  ],
});

/** Where a visitor writes to her: a DM, which is how bookings work today. */
export const instagramDm = "https://ig.me/m/amarticeramics";
/** Her shop online. */
export const vintedUrl = VINTED_URL;
/**
 * Vinted is HIDDEN for now, not removed (user, 2026-11-27, after meeting her):
 * set to true and every Vinted link (footer, home, shop) comes back.
 */
export const showVinted = false;
/** Off-site links shown in the footer: Vinted only while `showVinted`. */
export const footerLinks = site.links.filter((link) => showVinted || link.label !== "Vinted");

/**
 * Locales this site has actually published pages for. English since
 * 2026-11-27 (every public page has an /en/ twin; contatti/grazie stay Italian
 * and say `italianOnly`). Feeds
 * `getAlternates()`, `sitemapI18nConfig()` and `sitemapFilter()`.
 */
export const builtLocales = ["it", "en"] as const;
