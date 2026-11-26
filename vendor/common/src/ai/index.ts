import type { SiteConfig } from "../site/config.ts";
import { absoluteUrl } from "../site/url.ts";

/**
 * Text surfaces aimed at assistants rather than browsers: `robots.txt`,
 * `llms.txt`, `llms-full.txt`.
 *
 * Each returns a string for an Astro endpoint to serve. Being cited by an
 * assistant is a stated goal of these sites, not an accident — see the
 * `robots.txt` entry in DECISIONS.md.
 */

/**
 * Crawlers that fetch for AI training, retrieval or live answering. Named
 * explicitly, because a bare `User-agent: *` group is regularly treated as
 * insufficient permission by the retrieval bots.
 *
 * Three kinds, all in one list because `ai.allowCrawlers` switches them together:
 * training (GPTBot, ClaudeBot, Google-Extended, Applebot-Extended), search
 * (OAI-SearchBot, Claude-SearchBot, PerplexityBot) and user-triggered fetches
 * (ChatGPT-User, Claude-User, Perplexity-User). Blocking training bots does not
 * remove a site from search; blocking search bots removes it from AI answers.
 *
 * Ordinary search engines (Googlebot, Bingbot, Applebot) are deliberately NOT here:
 * they are search crawlers, already allowed by the `*` group, and listing them
 * would make `allowCrawlers: false` ("no AI") also block Bing and Siri search.
 * (Bingbot used to be listed; it is not an AI bot.)
 */
export const AI_USER_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
] as const;

export interface RobotsOptions {
  /**
   * Path of the sitemap index. `@astrojs/sitemap` emits
   * `/sitemap-index.xml`, not `/sitemap.xml`.
   */
  sitemapPath?: string;
}

export function robotsTxt(config: SiteConfig, options: RobotsOptions = {}): string {
  const { sitemapPath = "/sitemap-index.xml" } = options;
  const disallow = config.ai.disallow;

  const group = (agent: string, rule: string) =>
    [`User-agent: ${agent}`, rule, ...disallow.map((path) => `Disallow: ${path}`)].join("\n");

  const blocks = [group("*", "Allow: /")];

  for (const agent of AI_USER_AGENTS) {
    blocks.push(group(agent, config.ai.allowCrawlers ? "Allow: /" : "Disallow: /"));
  }

  blocks.push(`Sitemap: ${absoluteUrl(config, sitemapPath)}`);

  return `${blocks.join("\n\n")}\n`;
}

export interface LlmsLink {
  title: string;
  /** Root-relative path or absolute URL. */
  path: string;
  /** The entry's `summary`. Shown to the model as the reason to follow the link. */
  summary?: string;
}

export interface LlmsSection {
  title: string;
  links: LlmsLink[];
}

export interface LlmsTxtOptions {
  config: SiteConfig;
  /** One-paragraph blockquote under the title. Defaults to the site description. */
  summary?: string;
  /** Free prose between the summary and the first section. Optional. */
  notes?: string;
  sections: LlmsSection[];
}

/**
 * `/llms.txt` — an index. Title, a blockquote summary, then linked sections.
 * Format per llmstxt.org: the file is Markdown and the structure is the API.
 */
export function llmsTxt({ config, summary, notes, sections }: LlmsTxtOptions): string {
  const lines: string[] = [`# ${config.name}`, "", `> ${summary ?? config.description}`];

  if (notes) lines.push("", notes.trim());

  for (const section of sections) {
    if (section.links.length === 0) continue;
    lines.push("", `## ${section.title}`, "");
    for (const link of section.links) {
      const url = absoluteUrl(config, link.path);
      lines.push(`- [${link.title}](${url})${link.summary ? `: ${link.summary}` : ""}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

export interface LlmsDocument {
  title: string;
  /** Root-relative path or absolute URL, emitted so a model can cite the page. */
  path: string;
  /** Markdown body. Already-rendered HTML is the wrong input here. */
  body: string;
}

export interface LlmsFullTxtOptions {
  config: SiteConfig;
  summary?: string;
  documents: LlmsDocument[];
}

/**
 * `/llms-full.txt` — the whole site as one Markdown document, so a model can
 * answer without following links. Headings are pushed one level down and each
 * document carries its own URL, because a quote with no source cannot be cited.
 */
export function llmsFullTxt({ config, summary, documents }: LlmsFullTxtOptions): string {
  const parts: string[] = [`# ${config.name}`, "", `> ${summary ?? config.description}`];

  for (const doc of documents) {
    parts.push(
      "",
      "---",
      "",
      `## ${doc.title}`,
      "",
      `Source: ${absoluteUrl(config, doc.path)}`,
      "",
      demoteHeadings(doc.body.trim()),
    );
  }

  return `${parts.join("\n")}\n`;
}

/**
 * Push every ATX heading down one level so page `h1`s nest under the document
 * `h2`. Fenced code blocks are skipped — a `#` comment inside one is not a
 * heading.
 */
function demoteHeadings(markdown: string): string {
  let inFence = false;

  return markdown
    .split("\n")
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      return line.replace(/^(#{1,5})(\s)/, "#$1$2");
    })
    .join("\n");
}
