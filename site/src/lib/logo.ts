/**
 * Her wordmark "aMarti" as SVG markup, the single source for `Logo.astro` and
 * the favicons (`favicon.mjs`). A hand tracing from a screenshot (2026-11-20),
 * not her file. Grid: viewBox 0 0 134 46, baseline y=42, x-height top y=20,
 * "M" top y=4. Static markup, never user input.
 */
export const LOGO_VIEWBOX = "0 0 134 46";

export function logoMarkup(stroke = 2, color = "currentColor"): string {
  const strokes = [
    '<circle cx="13" cy="31" r="11"/>', // a
    '<path d="M24 20V42"/>',
    '<path d="M30 42V13.5A9.5 9.5 0 0 1 49 13.5V42M49 13.5A9.5 9.5 0 0 1 68 13.5V42"/>', // M
    '<circle cx="85" cy="31" r="11"/>', // a
    '<path d="M96 20V42"/>',
    '<path d="M103 42V20M103 31Q103 20 113 20"/>', // r
    '<path d="M119 11V42M114 21H124"/>', // t
    '<path d="M130 20V42"/>', // i
  ].join("");
  return (
    `<g fill="none" stroke="${color}" stroke-width="${stroke}">${strokes}</g>` +
    `<circle cx="130" cy="13.5" r="${(stroke * 0.85).toFixed(2)}" fill="${color}"/>`
  );
}
