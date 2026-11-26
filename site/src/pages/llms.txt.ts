import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { llmsTxt } from "@factory/common";
import { site } from "../site.config.ts";
import { faq } from "../faq.ts";

export const GET: APIRoute = async () => {
  const eventi = (await getCollection("eventi")).filter((event) => !event.data.noindex);
  const prodotti = (await getCollection("prodotti")).filter((product) => !product.data.noindex);

  return new Response(
    llmsTxt({
      config: site,
      sections: [
        {
          title: "Home",
          links: [{ title: site.name, path: "/", summary: site.description }],
        },
        {
          title: "Domande frequenti",
          links: faq.map((item) => ({ title: item.question, path: "/#faq", summary: item.answer })),
        },
        {
          title: "Eventi",
          links: eventi.map((event) => ({
            title: event.data.title,
            path: `/eventi/${event.id}/`,
            summary: event.data.summary,
          })),
        },
        {
          title: "Negozio",
          links: prodotti.map((product) => ({
            title: product.data.title,
            path: `/negozio/${product.id}/`,
            summary: product.data.summary,
          })),
        },
      ],
    }),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
};
