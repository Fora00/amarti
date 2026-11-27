/** Browser side: the build-time course list (CoursesData.astro) + tags from `corsi`. */
import type { CorsoRow } from "./types";
import type { CourseLite } from "./people";

export function readCourses(corsi: CorsoRow[]): CourseLite[] {
  const el = document.getElementById("courses-data");
  const list = JSON.parse(el?.textContent || "[]") as CourseLite[];
  const tags = new Map(corsi.map((c) => [c.event_id, c.tags ?? []]));
  return list.map((c) => ({ ...c, tags: tags.get(c.id) ?? [] }));
}

/** Public site root (the dashboard lives at <site>/dashboard/), absolute, no trailing slash. */
export function siteUrl(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "").replace(/\/dashboard$/, "");
  return `${location.origin}${base}`;
}
