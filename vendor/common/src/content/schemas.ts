import { z } from "astro/zod";
import { LOCAL_DATETIME_PATTERN } from "../calendar/time.ts";

/**
 * Zod fragments shared by every site's content collections.
 *
 * `z` comes from `astro/zod`, not from `zod` directly, so these are built with
 * the exact instance Astro validates collections against. Mixing instances
 * works until it doesn't, and the failure looks like a schema that silently
 * accepts anything.
 *
 * `astro/zod` supersedes the `astro:content` / `astro:schema` re-export, which
 * Astro 7 deprecates and Astro 8 removes. It is also a real module path rather
 * than a virtual one, so unlike the old import this file type-checks outside
 * an Astro build.
 */

/**
 * One or two sentences that make sense quoted with no surrounding page.
 *
 * It feeds the meta description *and* `llms.txt`, which is why the lower bound
 * exists: "A card game." is a label, not an answer. Write it as an answer.
 */
export const summary = z
  .string()
  .min(40, "A summary shorter than 40 characters cannot stand alone when quoted.")
  .max(300, "Keep the summary to one or two sentences.");

export const faqEntry = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

/** Feeds a rendered block and `FAQPage` JSON-LD from one source. */
export const faq = z.array(faqEntry).default([]);

export type FaqEntry = z.infer<typeof faqEntry>;

/**
 * Spread into any collection schema that becomes a page:
 *
 *   schema: z.object({ title: z.string(), ...seoFields.shape })
 */
export const seoFields = z.object({
  summary,
  faq,
  /** Keep out of indexes and out of `llms.txt`. */
  noindex: z.boolean().default(false),
  /** Overrides the default OG image for this entry. */
  image: z.string().optional(),
  imageAlt: z.string().optional(),
});

/* -- events ---------------------------------------------------------------- */

/**
 * Wall-clock time as written on a flyer: `2026-11-07T18:00`, or `2026-11-07`
 * for an all-day event. Deliberately a string, not `z.date()` — a bare YAML
 * timestamp is read as UTC, which shifts the event by an hour in winter.
 * `calendar/time.ts` resolves it against `timezone`.
 */
export const localDateTime = z
  .string()
  .regex(LOCAL_DATETIME_PATTERN, "Use YYYY-MM-DD or YYYY-MM-DDTHH:mm, with no offset and no Z.");

export const money = z.object({
  amount: z.number().nonnegative(),
  currency: z.string().length(3).toUpperCase().default("EUR"),
});

export type Money = z.infer<typeof money>;

export const eventFields = z.object({
  start: localDateTime,
  /** Same form as `start`. For all-day events this is the last day, inclusive. */
  end: localDateTime.optional(),
  timezone: z.string().default("Europe/Rome"),
  /** `scheduled` unless the owner says otherwise; feeds JSON-LD and the `.ics` feed. */
  status: z.enum(["scheduled", "cancelled", "postponed"]).default("scheduled"),
  location: z
    .object({
      name: z.string().min(1),
      address: z.string().optional(),
    })
    .optional(),
  /** Omit for a free event. */
  price: money.optional(),
  /** Where to book — a Stripe Payment Link, a form, a WhatsApp link. Off-site. */
  bookingUrl: z.string().url().optional(),
  /** How people book. Only picks the button's wording; the site never handles a booking itself. */
  bookingProvider: z.enum(["instagram", "whatsapp", "stripe", "email", "other"]).default("other"),
  /** Seats, shown to people. Not enforced: the booking provider enforces it. */
  capacity: z.number().int().positive().optional(),
  /**
   * Set when the seats are gone. The site cannot know this by itself: flip it
   * and rebuild. It swaps the booking button for "sold out" and marks the
   * JSON-LD offer `SoldOut`.
   */
  soldOut: z.boolean().default(false),
});

/**
 * Build an event collection schema. Takes the site's own fields, so the site
 * keeps ownership of `image()` and anything else it needs:
 *
 *   schema: ({ image }) => defineEventSchema({
 *     title: z.string(),
 *     cover: image(),
 *     ...seoFields.shape,
 *   })
 *
 * It wraps rather than exposes a bare object because the start/end check is a
 * refinement, and a refined Zod 4 object can no longer be extended.
 */
export function defineEventSchema<T extends z.ZodRawShape>(shape: T) {
  return z.object({ ...shape, ...eventFields.shape }).refine(
    // The generic `T` makes the inferred output opaque to the checker, so the
    // two fields this reads are asserted rather than inferred.
    (event) => endFollowsStart(event as { start: string; end?: string }),
    { message: "`end` must be the same form as `start` and not before it.", path: ["end"] },
  );
}

function endFollowsStart({ start, end }: { start: string; end?: string }): boolean {
  if (!end) return true;
  return start.includes("T") === end.includes("T") && end >= start;
}

/* -- shop ------------------------------------------------------------------ */

/**
 * `https` only. The provider's checkout page is the only place a card number is
 * typed, so a plain-http link is always a mistake.
 */
export const buyUrl = z
  .string()
  .url()
  .refine((value) => value.startsWith("https://"), "A buy link must be https.");

export const productFields = z.object({
  price: money,
  /** Off-site page where this piece is bought: a Stripe Payment Link, a Vinted listing. */
  buyUrl,
  /**
   * Who runs that page. Drives the button label ("Acquista su Vinted") and
   * lets a site hold both at once; the site's dictionary supplies the words.
   */
  provider: z.enum(["stripe", "vinted", "other"]).default("stripe"),
  /**
   * Flip to `sold` when the piece goes. A one-of-a-kind item sold twice is the
   * failure this guards. A Stripe link should also be limited to one completed
   * session in the dashboard; Vinted removes a sold listing by itself.
   */
  availability: z.enum(["available", "sold"]).default("available"),
  /** Shown on the page; also `sku` in JSON-LD. */
  sku: z.string().optional(),
});

export function defineProductSchema<T extends z.ZodRawShape>(shape: T) {
  return z.object({ ...shape, ...productFields.shape });
}

export type EventFields = z.infer<typeof eventFields>;
export type ProductFields = z.infer<typeof productFields>;
