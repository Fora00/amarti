import type { SiteConfig } from "../site/config.ts";
import { siteShortName } from "../site/config.ts";
import { absoluteUrl } from "../site/url.ts";
import { resolveTiming, type EventTiming } from "../calendar/time.ts";

/**
 * JSON-LD builders.
 *
 * Every builder returns a plain object and takes stable `@id`s from the
 * helpers below, so a page can emit one `@graph` whose nodes reference each
 * other instead of repeating the organisation five times. Extractors follow
 * `@id` references; duplicated inline entities are how a knowledge panel ends
 * up describing two different publishers.
 */

export type JsonLdNode = Record<string, unknown>;

/** Drop `undefined` and empty arrays — an empty JSON-LD property is worse than an absent one. */
function pruned<T extends JsonLdNode>(node: T): T {
  const out: JsonLdNode = {};
  for (const [key, value] of Object.entries(node)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return out as T;
}

/* -- stable identifiers ---------------------------------------------------- */

export const ids = {
  organization: (config: SiteConfig) => `${config.siteUrl}/#organization`,
  website: (config: SiteConfig) => `${config.siteUrl}/#website`,
} as const;

/** `{ "@id": … }` — a reference to a node defined elsewhere in the graph. */
function ref(id: string): JsonLdNode {
  return { "@id": id };
}

/* -- builders -------------------------------------------------------------- */

export function organizationLd(config: SiteConfig): JsonLdNode {
  const { organization } = config;

  // `sameAs` merges the explicit list with any configured external link that
  // opted in, so a storefront or BGG page corroborates identity without being
  // written down twice. De-duplicated: a repeated URL weakens the signal.
  const sameAs = [
    ...organization.sameAs,
    ...config.links.filter((link) => link.sameAs).map((link) => link.url),
  ];

  return pruned({
    "@type": "Organization",
    "@id": ids.organization(config),
    name: organization.name,
    url: organization.url ?? `${config.siteUrl}/`,
    logo: organization.logo ? absoluteUrl(config, organization.logo) : undefined,
    sameAs: [...new Set(sameAs)],
  });
}

export function websiteLd(config: SiteConfig, locale?: string): JsonLdNode {
  return pruned({
    "@type": "WebSite",
    "@id": ids.website(config),
    name: config.name,
    alternateName: config.shortName ? siteShortName(config) : undefined,
    url: `${config.siteUrl}/`,
    description: config.description,
    inLanguage: locale ?? config.locales.default,
    publisher: ref(ids.organization(config)),
  });
}

export interface BreadcrumbItem {
  name: string;
  /** Root-relative path or absolute URL. Omit on the current page's own crumb. */
  path?: string;
}

/**
 * `BreadcrumbList` in document order, starting at the home page.
 *
 * The final crumb deliberately carries no `item`: Google treats a self-linking
 * last crumb as a separate page.
 */
export function breadcrumbsLd(config: SiteConfig, items: BreadcrumbItem[]): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) =>
      pruned({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item:
          index === items.length - 1 || !item.path
            ? undefined
            : absoluteUrl(config, item.path),
      }),
    ),
  };
}

export interface FaqEntry {
  question: string;
  answer: string;
}

/**
 * `FAQPage` from the same entries the page renders. Emitting FAQ markup that
 * is not visible on the page is a structured-data violation, so both surfaces
 * must read from one source — see CONVENTIONS.md.
 */
export function faqPageLd(faqs: FaqEntry[]): JsonLdNode {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export interface ArticleInput {
  headline: string;
  description?: string;
  /** Root-relative path or absolute URL of the article itself. */
  path: string;
  image?: string;
  datePublished?: Date | string;
  dateModified?: Date | string;
  authorName?: string;
  locale?: string;
}

export function articleLd(config: SiteConfig, input: ArticleInput): JsonLdNode {
  const url = absoluteUrl(config, input.path);
  const iso = (value: Date | string | undefined) =>
    value === undefined ? undefined : value instanceof Date ? value.toISOString() : value;

  return pruned({
    "@type": "Article",
    headline: input.headline,
    description: input.description,
    url,
    // A URL, not an `@id` reference: schema.org accepts either, and nothing in
    // this module emits a `WebPage` node for a reference to resolve against.
    mainEntityOfPage: url,
    image: input.image ? absoluteUrl(config, input.image) : undefined,
    datePublished: iso(input.datePublished),
    dateModified: iso(input.dateModified) ?? iso(input.datePublished),
    author: input.authorName
      ? { "@type": "Person", name: input.authorName }
      : ref(ids.organization(config)),
    publisher: ref(ids.organization(config)),
    inLanguage: input.locale ?? config.locales.default,
  });
}

export interface GameInput {
  name: string;
  description: string;
  /** Root-relative path or absolute URL of the page describing the game. */
  path?: string;
  image?: string;
  /** People who designed it. */
  authorNames?: string[];
  numberOfPlayers?: { min?: number; max?: number };
  /** `"12-"` or `"8-99"` — schema.org wants a string. */
  typicalAgeRange?: string;
  /** Minutes. */
  playTimeMinutes?: { min?: number; max?: number };
  genre?: string[];
  locale?: string;
  /** Off-site pages for this game — a Gamefound campaign, a BGG entry. */
  sameAs?: string[];
}

/**
 * schema.org `Game`. There is no `BoardGame` type in core schema.org, so a
 * physical card game is a `Game` with `numberOfPlayers` — do not reach for
 * `VideoGame`, which implies a platform.
 */
export function gameLd(config: SiteConfig, input: GameInput): JsonLdNode {
  const players = input.numberOfPlayers;
  const time = input.playTimeMinutes;

  return pruned({
    "@type": "Game",
    name: input.name,
    description: input.description,
    url: absoluteUrl(config, input.path ?? "/"),
    image: input.image ? absoluteUrl(config, input.image) : undefined,
    author: input.authorNames?.map((name) => ({ "@type": "Person", name })),
    publisher: ref(ids.organization(config)),
    numberOfPlayers: players
      ? pruned({
          "@type": "QuantitativeValue",
          minValue: players.min,
          maxValue: players.max,
          unitText: "player",
        })
      : undefined,
    typicalAgeRange: input.typicalAgeRange,
    timeRequired: time ? isoDuration(time) : undefined,
    genre: input.genre,
    sameAs: input.sameAs ? [...new Set(input.sameAs)] : undefined,
    inLanguage: input.locale ?? config.locales.default,
  });
}

/** ISO-8601 duration. A range collapses to its upper bound — the format has no range form. */
function isoDuration({ min, max }: { min?: number; max?: number }): string | undefined {
  const minutes = max ?? min;
  return minutes === undefined ? undefined : `PT${minutes}M`;
}

export interface EventInput {
  name: string;
  description: string;
  /** Root-relative path or absolute URL of the event page. */
  path: string;
  timing: EventTiming;
  status?: "scheduled" | "cancelled" | "postponed";
  location?: { name: string; address?: string };
  image?: string;
  price?: { amount: number; currency: string };
  /** Where tickets are sold. Falls back to the event page. */
  bookingUrl?: string;
  /** Seats are gone — the offer is advertised as `SoldOut`. */
  soldOut?: boolean;
  locale?: string;
}

const EVENT_STATUS = {
  scheduled: "https://schema.org/EventScheduled",
  cancelled: "https://schema.org/EventCancelled",
  postponed: "https://schema.org/EventPostponed",
} as const;

/**
 * schema.org `Event`, in person. Dates carry the zone's real offset, computed
 * from the author's wall-clock time, so Google shows the right hour in winter.
 */
export function eventLd(config: SiteConfig, input: EventInput): JsonLdNode {
  const timing = resolveTiming(input.timing);
  const url = absoluteUrl(config, input.path);

  return pruned({
    "@type": "Event",
    name: input.name,
    description: input.description,
    url,
    startDate: timing.startIso,
    endDate: timing.endIso,
    eventStatus: EVENT_STATUS[input.status ?? "scheduled"],
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: input.location
      ? pruned({
          "@type": "Place",
          name: input.location.name,
          address: input.location.address,
        })
      : undefined,
    image: input.image ? absoluteUrl(config, input.image) : undefined,
    offers: input.price
      ? {
          "@type": "Offer",
          price: input.price.amount,
          priceCurrency: input.price.currency,
          url: input.bookingUrl ?? url,
          availability: input.soldOut
            ? "https://schema.org/SoldOut"
            : "https://schema.org/InStock",
        }
      : undefined,
    organizer: ref(ids.organization(config)),
    inLanguage: input.locale ?? config.locales.default,
  });
}

export interface ProductInput {
  name: string;
  description: string;
  /** Root-relative path or absolute URL of the product page. */
  path: string;
  image?: string;
  sku?: string;
  price: { amount: number; currency: string };
  availability: "available" | "sold";
  locale?: string;
}

/**
 * schema.org `Product` with one `Offer`. The offer `url` is the product page,
 * not the checkout: Google wants the page a person can read, and the payment
 * link is a hand-off, not a document.
 *
 * Sold pieces stay in the index as `SoldOut` rather than disappearing — the
 * page keeps ranking and shows the shop has a track record.
 */
export function productLd(config: SiteConfig, input: ProductInput): JsonLdNode {
  const url = absoluteUrl(config, input.path);

  return pruned({
    "@type": "Product",
    name: input.name,
    description: input.description,
    url,
    image: input.image ? absoluteUrl(config, input.image) : undefined,
    sku: input.sku,
    brand: ref(ids.organization(config)),
    offers: {
      "@type": "Offer",
      price: input.price.amount,
      priceCurrency: input.price.currency,
      url,
      availability:
        input.availability === "available"
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
      seller: ref(ids.organization(config)),
    },
  });
}

/* -- composition ----------------------------------------------------------- */

/**
 * Wrap nodes in one `@graph`. A page should emit a single script tag built
 * this way rather than several competing ones.
 */
export function graph(...nodes: (JsonLdNode | null | undefined | false)[]): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.filter((node): node is JsonLdNode => Boolean(node)),
  };
}

/**
 * The two nodes every page in the factory carries. Spread further nodes after
 * these: `graph(...baseGraph(config, locale), gameLd(config, …))`.
 */
export function baseGraph(config: SiteConfig, locale?: string): JsonLdNode[] {
  return [organizationLd(config), websiteLd(config, locale)];
}

/**
 * Serialise for a `<script type="application/ld+json">` body.
 *
 * `<` is escaped because a `</script>` inside any string value would otherwise
 * close the tag early and inject the rest of the payload as markup.
 */
export function serializeJsonLd(node: JsonLdNode): string {
  return JSON.stringify(node).replace(/</g, "\\u003c");
}
