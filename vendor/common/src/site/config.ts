import { z } from "zod";

/**
 * The single source of truth for a site. Every SEO surface — canonical URLs,
 * hreflang, Open Graph, JSON-LD, `robots.txt`, `llms.txt` — is derived from
 * this object, so a wrong value here is wrong in a dozen places at once.
 * That is why it is validated rather than merely typed.
 */

const LOCALE_RE = /^[a-z]{2}(-[A-Z]{2})?$/;

export const localeSchema = z
  .string()
  .regex(LOCALE_RE, "Locale must look like `it` or `pt-BR`.");

/** A social/OG image. Dimensions are required: OG cards without them render inconsistently. */
export const socialImageSchema = z.object({
  /** Root-relative path (`/og/default.png`) or an absolute URL. */
  src: z.string().min(1),
  /** Real alternative text. Not the site name. */
  alt: z.string().min(1),
  width: z.number().int().positive().default(1200),
  height: z.number().int().positive().default(630),
});

export const organizationSchema = z.object({
  /** Legal or publishing name — often not the site name. */
  name: z.string().min(1),
  /** Publisher's own site, when it differs from this one. */
  url: z.url().optional(),
  /** Root-relative path or absolute URL to a logo. */
  logo: z.string().min(1).optional(),
  /** Profiles that corroborate identity: schema.org `sameAs`. */
  sameAs: z.array(z.url()).default([]),
});

/**
 * A newsletter the site invites people to join.
 *
 * `subscribeUrl` must be the provider's own subscribe endpoint, because the
 * signup form posts straight to it — that is what keeps the page at zero JS.
 * For Substack that is `https://<publication>.substack.com/subscribe`.
 */
export const newsletterSchema = z.object({
  /** Recorded so a future session knows what the endpoint contract is. */
  provider: z.enum(["substack", "buttondown", "mailchimp", "other"]),
  /** Where the form submits. Absolute URL. */
  subscribeUrl: z.url(),
  /** The publication's home, for a plain "read it first" link. */
  homeUrl: z.url().optional(),
  /**
   * Query parameter the provider expects the address in. Substack and most
   * others use `email`; it is configurable because getting it wrong silently
   * drops the address and the person still sees a success page.
   */
  emailField: z.string().min(1).default("email"),
});

/**
 * Off-site presences. These become schema.org `sameAs` on the organisation,
 * which is how a search engine or an assistant corroborates that a studio, its
 * storefront and its BGG entry are one entity rather than three.
 */
export const externalLinkSchema = z.object({
  /** Short, human label: "BoardGameGeek", "Gamefound". */
  label: z.string().min(1),
  url: z.url(),
  /**
   * Whether to advertise this in JSON-LD `sameAs`. True for profiles that
   * identify the entity; false for a link that is merely useful.
   */
  sameAs: z.boolean().default(true),
});

export const aiSchema = z.object({
  /**
   * Whether `robots.txt` names AI crawlers as allowed. Opt-out exists because
   * it is the site owner's call, not ours — see DECISIONS.md.
   */
  allowCrawlers: z.boolean().default(true),
  /** Emit `/llms.txt` and `/llms-full.txt`. */
  llmsTxt: z.boolean().default(true),
  /** Extra `Disallow:` paths applied to every user-agent group. */
  disallow: z.array(z.string().startsWith("/")).default([]),
});

export const siteConfigSchema = z
  .object({
    /** Display name. Used in `<title>` suffixes, OG `site_name`, JSON-LD. */
    name: z.string().min(1),
    /** Short form for cramped surfaces (manifest, breadcrumbs). Defaults to `name`. */
    shortName: z.string().min(1).optional(),

    /**
     * Absolute origin, no path, no trailing slash — it is normalised here.
     * A placeholder that survives to production poisons every canonical and
     * every hreflang tag on the site, so it is checked hard.
     */
    siteUrl: z
      .url({ protocol: /^https?$/ })
      .transform((value) => value.replace(/\/+$/, "")),

    /** Fallback meta description for pages that supply none. Aim for 110–160 chars. */
    description: z.string().min(1).max(320),

    locales: z.object({
      /** Rendered unprefixed at the site root. */
      default: localeSchema,
      /** Every locale the site builds, including the default. */
      supported: z.array(localeSchema).min(1),
    }),

    organization: organizationSchema,

    /** `@handle`, used only for the Twitter card. */
    twitterHandle: z
      .string()
      .regex(/^@[A-Za-z0-9_]{1,15}$/, "Twitter handle must start with `@`.")
      .optional(),

    /** Fallback OG image for pages that supply none. */
    defaultImage: socialImageSchema.optional(),

    /** `<meta name="theme-color">`. */
    themeColor: z.string().min(1).optional(),

    /** Optional. Omit and no signup surface renders anywhere. */
    newsletter: newsletterSchema.optional(),

    /** Off-site presences for the site as a whole. */
    links: z.array(externalLinkSchema).default([]),

    ai: aiSchema.prefault({}),
  })
  .check((ctx) => {
    const { locales } = ctx.value;

    if (!locales.supported.includes(locales.default)) {
      ctx.issues.push({
        code: "custom",
        input: locales.supported,
        path: ["locales", "supported"],
        message: `Default locale "${locales.default}" is missing from \`supported\`. hreflang and x-default are both derived from this list.`,
      });
    }

    const seen = new Set<string>();
    for (const [i, locale] of locales.supported.entries()) {
      if (seen.has(locale)) {
        ctx.issues.push({
          code: "custom",
          input: locale,
          path: ["locales", "supported", i],
          message: `Duplicate locale "${locale}".`,
        });
      }
      seen.add(locale);
    }
  });

/** What a site author writes: defaults are optional. */
export type SiteConfigInput = z.input<typeof siteConfigSchema>;
/** What every consumer reads: defaults filled in, `siteUrl` normalised. */
export type SiteConfig = z.output<typeof siteConfigSchema>;
export type Locale = string;
export type SocialImage = z.output<typeof socialImageSchema>;
export type Newsletter = z.output<typeof newsletterSchema>;
export type ExternalLink = z.output<typeof externalLinkSchema>;

/**
 * Validate a site's config at module load. Throws with a readable report
 * rather than letting a bad `siteUrl` reach a rendered `<link rel="canonical">`.
 */
export function defineSiteConfig(input: SiteConfigInput): SiteConfig {
  const result = siteConfigSchema.safeParse(input);

  if (!result.success) {
    throw new Error(
      `Invalid site config:\n${z.prettifyError(result.error)}\n\n` +
        `Fix it in the site's \`site.config.ts\`.`,
    );
  }

  return result.data;
}

/** `shortName` if set, else `name`. */
export function siteShortName(config: SiteConfig): string {
  return config.shortName ?? config.name;
}
