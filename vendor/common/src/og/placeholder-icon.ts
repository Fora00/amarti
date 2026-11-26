/**
 * Placeholder favicons for a brand-new site: a random colour and a random white
 * geometric shape on a rounded square. Node only, scaffold time only — it is what
 * `new-site` writes so a fresh site never starts with a 404 favicon, and so a
 * placeholder is unmistakably a placeholder until the real mark exists.
 *
 * Shapes, not letters, on purpose: lettering depends on the fonts installed on
 * whatever machine runs the generator, shapes do not.
 */
import sharp from "sharp";

/** Small seedable PRNG (mulberry32): the same seed always gives the same icon. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Shape = (bg: string) => string;

// Drawn on a 64x64 canvas, bold enough to read at 16 px.
const SHAPES: Record<string, Shape> = {
  ring: () => `<circle cx="32" cy="32" r="14" fill="none" stroke="#fff" stroke-width="8"/>`,
  diamond: () => `<polygon points="32,10 54,32 32,54 10,32" fill="#fff"/>`,
  triangle: () => `<polygon points="32,12 54,50 10,50" fill="#fff"/>`,
  bars: () => `<rect x="12" y="30" width="11" height="22" fill="#fff"/><rect x="26.5" y="14" width="11" height="38" fill="#fff"/><rect x="41" y="24" width="11" height="28" fill="#fff"/>`,
  dot: (bg) => `<circle cx="32" cy="32" r="19" fill="#fff"/><circle cx="32" cy="32" r="8" fill="${bg}"/>`,
  moon: () => `<path d="M10 42a22 22 0 0 1 44 0z" fill="#fff"/>`,
};

export const SHAPE_NAMES = Object.keys(SHAPES);

export interface PlaceholderIcons {
  /** `favicon.ico` with 16, 32 and 48 px images (PNG-compressed entries). */
  ico: Buffer;
  /** 180 px, opaque and square: iOS paints transparent corners black. */
  appleTouch: Buffer;
  /** What was drawn, for the generator to print. */
  description: string;
}

function svg(size: number, hue: number, shape: string, rounded: boolean): string {
  const bg = `hsl(${hue} 58% 40%)`;
  const body = SHAPES[shape]!(bg);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="${rounded ? 14 : 0}" fill="${bg}"/>${body}</svg>`;
}

const png = (markup: string) => sharp(Buffer.from(markup)).png({ compressionLevel: 9 }).toBuffer();

/** An ICO file is a small directory followed by the images; modern ICOs may hold PNGs directly. */
function buildIco(images: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

/** `random` is injectable so a test (or `--icon-seed`) can make the result repeatable. */
export async function renderPlaceholderIcons(random: () => number = Math.random): Promise<PlaceholderIcons> {
  const hue = Math.floor(random() * 360);
  const shape = SHAPE_NAMES[Math.floor(random() * SHAPE_NAMES.length)]!;
  const sizes = [16, 32, 48];
  const images = await Promise.all(sizes.map(async (size) => ({ size, data: await png(svg(size, hue, shape, true)) })));
  return {
    ico: buildIco(images),
    appleTouch: await png(svg(180, hue, shape, false)),
    description: `${shape} on hue ${hue}`,
  };
}
