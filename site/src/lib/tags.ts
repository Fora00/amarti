/**
 * Course tags for the public "filter by kind of workshop" pages. The tags are
 * set by the owner in the dashboard (`corsi.tags`, keyed by the day-1 event id)
 * and read here at BUILD time (public-data.ts: only event_id + tags are
 * readable by anon). Zero JS: filtering = one static page per tag,
 * /eventi/tag/<slug>/. A day-2 entry takes the tags of its day 1.
 */
import type { CollectionEntry } from "astro:content";
import { publicRows } from "./public-data.ts";
import { i18n } from "../i18n/dictionaries.ts";
import type { Lang } from "./locale.ts";

type Evento = CollectionEntry<"eventi">;

export async function loadCourseTags(): Promise<Map<string, string[]>> {
  const rows = await publicRows("corsi", "select=event_id,tags");
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const r = row as { event_id?: unknown; tags?: unknown };
    if (typeof r.event_id !== "string" || !Array.isArray(r.tags)) continue;
    const tags = r.tags.filter((t): t is string => typeof t === "string" && t.trim() !== "").map((t) => t.trim().toLowerCase());
    if (tags.length) map.set(r.event_id, [...new Set(tags)]);
  }
  return map;
}

/** The tags of one event (day 2 → its day 1's). */
export function tagsOf(event: Evento, map: Map<string, string[]>): string[] {
  const id = event.data.serie && event.data.serie.day > 1 ? event.data.serie.with.id : event.id;
  return map.get(id) ?? [];
}

/** "cosmetica naturale" → "cosmetica-naturale", "macramè" → "macrame". */
export const tagSlug = (tag: string) =>
  tag.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** The label in the page's language: `tags.<slug>` in the dictionary, else the tag as she wrote it. */
export function tagLabel(tag: string, lang: Lang): string {
  const key = `tags.${tagSlug(tag)}`;
  const t = i18n.useTranslations(lang);
  const label = t(key);
  return label === key ? tag : label;
}

/** Tags that have at least one of the given events, most used first. */
export function tagsIn(events: Evento[], map: Map<string, string[]>): string[] {
  const count = new Map<string, number>();
  for (const e of events) for (const t of tagsOf(e, map)) count.set(t, (count.get(t) ?? 0) + 1);
  return [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "it")).map(([t]) => t);
}
