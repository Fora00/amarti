/**
 * The programme as courses, at BUILD time (frontmatter only: it reads
 * `astro:content`). Shared by the Corsi page and the per-course pages so both
 * agree on ids, dates and titles.
 *
 * A two-evening course is one course: its id is day 1's entry id (the one the
 * site books), and `aliases` lists day 2's id too, so a sign-up recorded against
 * either lands on the same card.
 */
import { getCollection } from "astro:content";

// Wall-clock strings, never a Z: read the parts, no time-zone conversion.
const parts = (s: string) => {
  const [d, t = ""] = s.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm] = t ? t.split(":").map(Number) : [];
  return { y, m, day, hh, mm, hasTime: Boolean(t) };
};
export const asDate = (s: string) => { const p = parts(s); return new Date(p.y, p.m - 1, p.day, p.hh ?? 0, p.mm ?? 0); };
const dayFmt = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short" });
const when = (s: string) => {
  const p = parts(s);
  return `${dayFmt.format(asDate(s))}${p.hasTime ? ` · ${String(p.hh).padStart(2, "0")}:${String(p.mm).padStart(2, "0")}` : ""}`;
};

export interface Course {
  id: string;
  aliases: string[];
  title: string;
  month: number;
  monthKey: string;
  dates: string[];
  /** The last evening, as YYYY-MM-DD: the course is past from the next day. */
  lastDay: string;
  host?: string;
  capacity?: number;
  free: boolean;
}

export async function loadCourses(): Promise<Course[]> {
  const eventi = await getCollection("eventi");
  const ospiti = new Map((await getCollection("ospiti")).map((o) => [o.id, o.data.name]));
  const byId = new Map(eventi.map((e) => [e.id, e]));
  return eventi
    .filter((e) => !e.data.serie || e.data.serie.day === 1)
    .sort((a, b) => a.data.start.localeCompare(b.data.start))
    .map((e) => {
      const other = e.data.serie ? byId.get(e.data.serie.with) : undefined;
      const last = other?.data.start ?? e.data.start;
      return {
        id: e.id,
        aliases: [e.id, ...(other ? [other.id] : [])],
        title: e.data.title,
        month: parts(e.data.start).m,
        monthKey: e.data.start.slice(0, 7),
        dates: [e.data.start, ...(other ? [other.data.start] : [])].map(when),
        lastDay: last.slice(0, 10),
        host: e.data.host ? (ospiti.get(e.data.host) ?? e.data.host) : undefined,
        capacity: e.data.capacity,
        free: e.data.free,
      };
    });
}
