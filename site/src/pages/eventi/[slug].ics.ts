import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";
import { icsCalendar } from "@factory/common/calendar";
import { absoluteUrl } from "@factory/common";
import { site } from "../../site.config.ts";
import { eventSummary } from "../../lib/when.ts";

export const getStaticPaths: GetStaticPaths = async () =>
  (await getCollection("eventi")).map((event) => ({
    params: { slug: event.id },
    props: { event },
  }));

export const GET: APIRoute = ({ props }) => {
  const { event } = props as { event: CollectionEntry<"eventi"> };
  const { data } = event;

  const body = icsCalendar(
    [
      {
        uid: event.id,
        title: data.title,
        timing: data,
        description: eventSummary(data),
        location: data.location
          ? [data.location.name, data.location.address].filter(Boolean).join(", ")
          : undefined,
        url: absoluteUrl(site, `/eventi/${event.id}/`),
        status: data.status,
      },
    ],
    { productName: site.name, host: new URL(site.siteUrl).host },
  );

  return new Response(body, {
    headers: { "Content-Type": "text/calendar; charset=utf-8" },
  });
};
