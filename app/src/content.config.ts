import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { file, glob } from "astro/loaders";

/**
 * The programme, read at BUILD time straight from the public site's content
 * (`../site/src/content/`), so a course exists in one place only. The site's
 * schema is the strict one; here we read just the fields the dashboard shows and
 * let the rest through. A change to the programme needs an app rebuild too.
 *
 * Sign-ups will be keyed by the event's `id` (its file name), the same slug as
 * the public page `/eventi/<id>/`.
 */
const eventi = defineCollection({
  loader: glob({ base: "../site/src/content/eventi", pattern: "**/*.md" }),
  schema: z.looseObject({
    title: z.string(),
    /** Wall-clock Europe/Rome, `2026-11-07T18:00` (never a Z): see the site's content.config.ts. */
    start: z.string(),
    end: z.string().optional(),
    host: z.string().optional(),
    capacity: z.number().optional(),
    free: z.boolean().default(false),
    serie: z.object({ day: z.number(), of: z.number(), with: z.string() }).optional(),
  }),
});

const ospiti = defineCollection({
  loader: file("../site/src/content/ospiti.yaml"),
  schema: z.object({ name: z.string(), instagram: z.string().optional() }),
});

export const collections = { eventi, ospiti };
