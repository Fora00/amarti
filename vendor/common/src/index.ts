/**
 * Behaviour shared by every site: config, URLs, i18n, JSON-LD, AI surfaces.
 *
 * Components are imported by path so Astro compiles them:
 *
 *   import Seo from "@factory/common/components/Seo.astro";
 *
 * `./content` is still imported by its own subpath rather than from here: it
 * pulls in Astro's zod instance, which plain-Node consumers of the other
 * modules have no reason to load.
 */

export {
  defineSiteConfig,
  siteConfigSchema,
  siteShortName,
  localeSchema,
  socialImageSchema,
  organizationSchema,
  aiSchema,
  newsletterSchema,
  externalLinkSchema,
} from "./site/config.ts";
export type {
  SiteConfig,
  SiteConfigInput,
  SocialImage,
  Newsletter,
  ExternalLink,
  Locale,
} from "./site/config.ts";

export { absoluteUrl, canonicalUrl, normalizePath } from "./site/url.ts";

export {
  astroI18nConfig,
  sitemapI18nConfig,
  sitemapFilter,
} from "./site/astro.ts";
export type { AstroI18nOptions, SitemapOptions } from "./site/astro.ts";

export { defineI18n } from "./i18n/index.ts";
export type {
  I18n,
  I18nOptions,
  Alternate,
  Dictionary,
  TranslateParams,
} from "./i18n/index.ts";

export {
  organizationLd,
  websiteLd,
  breadcrumbsLd,
  faqPageLd,
  articleLd,
  gameLd,
  eventLd,
  productLd,
  graph,
  baseGraph,
  serializeJsonLd,
  ids,
} from "./jsonld/index.ts";
export type {
  JsonLdNode,
  BreadcrumbItem,
  FaqEntry,
  ArticleInput,
  GameInput,
  EventInput,
  ProductInput,
} from "./jsonld/index.ts";

export { robotsTxt, llmsTxt, llmsFullTxt, AI_USER_AGENTS } from "./ai/index.ts";
export type {
  RobotsOptions,
  LlmsLink,
  LlmsSection,
  LlmsTxtOptions,
  LlmsDocument,
  LlmsFullTxtOptions,
} from "./ai/index.ts";

export * from "./calendar/index.ts";
export type { EventTiming, ResolvedTiming, GridDay } from "./calendar/index.ts";
