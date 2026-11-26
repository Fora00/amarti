import { defineCollection, reference } from "astro:content";
import { z } from "astro/zod";
import { file, glob } from "astro/loaders";
import { seoFields } from "@factory/common/content";
import { defineEventSchema } from "@factory/common/content";
import { defineProductSchema } from "@factory/common/content";

/**
 * Astro 7: every collection needs a `loader`, config lives here, and `render()`
 * is imported from `astro:content`. See vendor/plan/DECISIONS.md.
 */

/**
 * Events. `start`/`end` are wall-clock time in `timezone` (default
 * Europe/Rome), written as `2026-11-07T18:00`; a date alone is an all-day event.
 * Never write a `Z` or an offset — see common/src/calendar/time.ts.
 */
const eventi = defineCollection({
  loader: glob({ base: "./src/content/eventi", pattern: "**/*.md" }),
  schema: ({ image }) =>
    defineEventSchema({
      title: z.string(),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      /**
       * Who runs the lab when it is not the owner: an id in `ospiti.yaml`.
       * The studio is a room that hosts other makers, so this is shown on
       * every card. Omit when she runs it herself. A typo fails the build — via
       * an explicit check in eventi/[slug].astro, since `reference()` alone does not.
       */
      host: reference("ospiti").optional(),
      /**
       * Explicitly free. Without it, an event with no `price` shows a "00"
       * placeholder ("prezzo da definire"), never "Gratuito": the programme
       * comes from posters that say "info in DM", so a missing price means
       * unknown, not free.
       */
      free: z.boolean().default(false),
      /**
       * Two-evening courses (model on day 1, glaze on day 2). Both entries
       * point at each other; only day 1 carries the booking button.
       */
      serie: z
        .object({
          day: z.number().int().positive(),
          of: z.number().int().min(2),
          with: reference("eventi"),
        })
        .optional(),
      ...seoFields.shape,
    }),
});

/**
 * Guest makers, one YAML list, so a guest who runs three labs is written once
 * and their Instagram link is fixed in one place.
 */
const ospiti = defineCollection({
  loader: file("./src/content/ospiti.yaml"),
  schema: z.object({
    name: z.string().min(1),
    /** Handle without "@". Only once verified — never guessed. */
    instagram: z
      .string()
      .regex(/^[a-z0-9._]{1,30}$/, "Instagram handle: lowercase letters, digits, dots, underscores; no @.")
      .optional(),
  }),
});

/**
 * Products. One Markdown file per piece; `buyUrl` is the off-site page where
 * it is bought and `availability` flips to `sold` when it goes (needs a rebuild).
 */
const prodotti = defineCollection({
  loader: glob({ base: "./src/content/prodotti", pattern: "**/*.md" }),
  schema: ({ image }) =>
    defineProductSchema({
      title: z.string(),
      photo: image().optional(),
      photoAlt: z.string().optional(),
      ...seoFields.shape,
    }),
});

export const collections = {
  eventi,
  ospiti,
  prodotti,
};
