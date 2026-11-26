import { organizationLd, type JsonLdNode } from "@factory/common";
import { site } from "../site.config.ts";

/**
 * Her shop as a `LocalBusiness`, retyped over the Organization `@id` that
 * every page's base graph already carries — one node, not two publishers.
 *
 * Only what is known and shown on the page: name, address, Instagram. Hours,
 * phone, `geo` (Google wants ≥ 5 decimals; nobody has measured the door) and
 * `priceRange` are left out until Martina gives them — an empty or guessed
 * property is worse than none. Plain `LocalBusiness`: she runs workshops *and*
 * a concept store, and no single subtype says both (plan/DECISIONS.md).
 * Site-level until a second site needs a real address (CONVENTIONS rule of two).
 */
export const address = {
  streetAddress: "Piazza Malfatti 10",
  postalCode: "38068",
  addressLocality: "Rovereto",
  addressRegion: "TN",
  addressCountry: "IT",
} as const;

export function localBusinessLd(): JsonLdNode {
  return {
    ...organizationLd(site),
    "@type": "LocalBusiness",
    description: site.description,
    address: { "@type": "PostalAddress", ...address },
    hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `aMarticeramics Lab, ${address.streetAddress}, ${address.addressLocality}`,
    )}`,
  };
}

/** The base graph with the Organization swapped for the LocalBusiness above. */
export function withLocalBusiness(nodes: JsonLdNode[]): JsonLdNode[] {
  return nodes.map((node) => (node["@type"] === "Organization" ? localBusinessLd() : node));
}
