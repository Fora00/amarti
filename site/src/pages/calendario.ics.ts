import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { icsCalendar } from "@factory/common/calendar";
import { absoluteUrl } from "@factory/common";
import { site } from "../site.config.ts";

/** The whole programme as one subscribable feed. */
export const GET: APIRoute = async () => {
  const events = await getCollection("eventi");

  const body = icsCalendar(
    events.map(({ id, data }) => ({
      uid: id,
      title: data.title,
      timing: data,
      description: data.summary,
      location: data.location
        ? [data.location.name, data.location.address].filter(Boolean).join(", ")
        : undefined,
      url: absoluteUrl(site, `/eventi/${id}/`),
      status: data.status,
    })),
    { productName: site.name, calendarName: site.name, host: new URL(site.siteUrl).host },
  );

  return new Response(body, {
    headers: { "Content-Type": "text/calendar; charset=utf-8" },
  });
};
