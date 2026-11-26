/**
 * Open Graph images — Node only, build time only (like `./demo`): import it from
 * an endpoint such as `src/pages/og/default.jpeg.ts`, never from a page or layout.
 *
 * Promoted from `angelo/src/lib/og.ts` when a second site (annina) needed it
 * (rule of two, plan/CONVENTIONS.md). Behaviour is unchanged: angelo's emitted
 * JPEGs were compared byte for byte before and after.
 */
import sharp from "sharp";

/**
 * Compose a true 1200x630 Open Graph image.
 *
 * `astro:assets` cannot do this: its `fit: "contain"` fits *inside* the box
 * rather than padding out to it, so a 3:2 box shot came out 895x630 and the
 * square logo 630x630 — while the meta tags claimed 1200x630. A scraper trusts
 * those tags, so the mismatch is a real defect, not a cosmetic one.
 *
 * sharp composites onto a full-size canvas instead, which is why this lives
 * behind an endpoint rather than in a page.
 *
 * JPEG, not WebP: several link scrapers ignore WebP and then show no preview at
 * all — the exact failure this exists to fix.
 */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

export interface Rgba {
  r: number;
  g: number;
  b: number;
  alpha: number;
}

/** A near-white surface, so the letterbox reads as the page. Pass the site's own. */
export const DEFAULT_BACKGROUND: Rgba = { r: 252, g: 250, b: 253, alpha: 1 };

export interface OgOptions {
  /**
   * Fill the whole card instead of fitting the artwork inside a margin, cropping
   * what overflows. For a source that already is a finished card with its own
   * background (a logo on a patterned page): a margin would show that
   * background's edge as a hard line.
   */
  bleed?: boolean;
}

export async function renderOg(
  /** Absolute path to a local source image. */
  file: string,
  background: Rgba = DEFAULT_BACKGROUND,
  options: OgOptions = {},
): Promise<Buffer> {
  if (options.bleed) {
    return sharp(file)
      .resize(OG_WIDTH, OG_HEIGHT, { fit: "cover", position: "centre" })
      .flatten({ background })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  }

  // Margin so the artwork never touches the edge of the card.
  const inner = await sharp(file)
    .resize(OG_WIDTH - 120, OG_HEIGHT - 80, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .toBuffer();

  return sharp({
    create: { width: OG_WIDTH, height: OG_HEIGHT, channels: 4, background },
  })
    .composite([{ input: inner, gravity: "centre" }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

export function ogResponse(body: Buffer): Response {
  return new Response(new Uint8Array(body), {
    headers: { "Content-Type": "image/jpeg" },
  });
}

export { renderPlaceholderIcons, seeded, SHAPE_NAMES } from "./placeholder-icon.ts";
export type { PlaceholderIcons } from "./placeholder-icon.ts";
