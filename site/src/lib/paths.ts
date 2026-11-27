/**
 * getStaticPaths for the dynamic routes, shared by the Italian page and its
 * English wrapper under pages/en/ so both build the same set of pages.
 */
import { getCollection } from "astro:content";
import { groupByMonth } from "@factory/common/calendar";

export async function eventPaths() {
  const events = await getCollection("eventi");
  return events.map((event) => ({ params: { slug: event.id }, props: { event } }));
}

export async function monthPaths() {
  const months = groupByMonth(await getCollection("eventi"), (event) => event.data);
  const keys = [...months.keys()];
  return keys.map((key, index) => ({
    params: { month: key },
    props: { events: months.get(key)!, previous: keys[index - 1], next: keys[index + 1] },
  }));
}

/**
 * One page per course tag with at least one upcoming event (a day 2 carries
 * its day 1's tags, as on /eventi/). Tags read at build time.
 */
export async function tagPaths() {
  const { isUpcoming, resolveTiming } = await import("@factory/common/calendar");
  const { loadCourseTags, tagsIn, tagsOf, tagSlug } = await import("./tags.ts");
  const map = await loadCourseTags();
  const upcoming = (await getCollection("eventi"))
    .filter((e) => isUpcoming(e.data))
    .sort((a, b) => resolveTiming(a.data).start.getTime() - resolveTiming(b.data).start.getTime());
  const allTags = tagsIn(upcoming, map);
  return allTags.map((tag) => ({
    params: { tag: tagSlug(tag) },
    props: { tag, events: upcoming.filter((e) => tagsOf(e, map).includes(tag)), allTags },
  }));
}
