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
