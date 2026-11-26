import type { APIRoute } from "astro";
import { robotsTxt } from "@factory/common";
import { site } from "../site.config.ts";
import { isDemo } from "../lib/path.ts";

// No trailing slash on this route: Astro 7 404s `/robots.txt/`.
export const GET: APIRoute = () =>
  new Response(isDemo ? "User-agent: *\nDisallow: /\n" : robotsTxt(site), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
