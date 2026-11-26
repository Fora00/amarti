/**
 * Writes the favicons from her logo (src/lib/logo.ts) into public/:
 *   favicon.svg          — modern browsers; crisp at any density
 *   favicon.ico          — 16/32/48 px PNG entries, for whatever asks /favicon.ico
 *   apple-touch-icon.png — 180 px, OPAQUE (iOS paints transparency black)
 *
 * Re-run after changing the logo:  pnpm --filter amarti favicon
 *
 * The mark sits on a white disc with a thin ring, like her round Instagram
 * avatar, so it reads on a dark tab bar too. Strokes get thicker as the icon
 * gets smaller, or the hairline wordmark disappears at 16 px.
 *
 * The ICO writer is the same few lines as common/src/og/placeholder-icon.ts
 * (not exported there); promote it if a third place needs it.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { LOGO_VIEWBOX, logoMarkup } from "./src/lib/logo.ts";

const INK = "#1c1714";
const [, , vbW, vbH] = LOGO_VIEWBOX.split(" ").map(Number);

/** 64-unit square canvas: disc + ring + wordmark scaled to fit inside. */
function iconSvg({ size, stroke, ring, opaque }) {
  const inner = 46; // width of the wordmark inside the 64-unit canvas
  const scale = inner / vbW;
  const x = (64 - inner) / 2;
  const y = 32 - (vbH * scale) / 2 + 1.5; // optical centre: the M rises above
  const bg = opaque ? `<rect width="64" height="64" fill="#fff"/>` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">${bg}` +
    `<circle cx="32" cy="32" r="${opaque ? 30 : 31.5}" fill="#fff"/>` +
    (ring ? `<circle cx="32" cy="32" r="29.5" fill="none" stroke="${INK}" stroke-width="${ring}"/>` : "") +
    `<g transform="translate(${x} ${y}) scale(${scale})">${logoMarkup(stroke / scale, INK)}</g></svg>`
  );
}

const png = (svg) => sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();

function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size, 0);
    entry.writeUInt8(size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

// Stroke in canvas units (64 = icon width). Hairline at large sizes like the
// real logo, bolder when small so 16 px still shows letters.
const SIZES = [
  { size: 16, stroke: 4.2, ring: 0 },
  { size: 32, stroke: 2.8, ring: 1.6 },
  { size: 48, stroke: 2.2, ring: 1.2 },
];

mkdirSync("public", { recursive: true });
writeFileSync("public/favicon.svg", iconSvg({ size: 64, stroke: 1.6, ring: 1, opaque: false }));
const images = await Promise.all(SIZES.map(async (s) => ({ size: s.size, data: await png(iconSvg({ ...s, opaque: false })) })));
writeFileSync("public/favicon.ico", buildIco(images));
writeFileSync("public/apple-touch-icon.png", await png(iconSvg({ size: 180, stroke: 1.4, ring: 0.8, opaque: true })));
console.log("public/favicon.svg, favicon.ico (16/32/48), apple-touch-icon.png (180)");
