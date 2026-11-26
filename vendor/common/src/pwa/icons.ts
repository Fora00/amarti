/**
 * App icons from ONE square source image — Node + sharp, build time (like ./og).
 *
 * Android crops "maskable" icons to a circle/squircle, so the artwork has to sit
 * inside the central 80% (the "safe zone"); the plain "any" icon can use more of
 * the canvas. iOS wants an opaque 180 px square.
 */
import sharp, { type OverlayOptions } from "sharp";

export interface PwaIconSet {
  /** 192x192, purpose any */ icon192: Buffer;
  /** 512x512, purpose any */ icon512: Buffer;
  /** 512x512, purpose maskable (artwork inside the safe zone, opaque background) */ maskable512: Buffer;
  /** 180x180 opaque, for iOS */ appleTouch: Buffer;
}

export interface PwaIconOptions {
  /** CSS hex colour behind the artwork, e.g. "#184958". */
  background: string;
  /** Share of the canvas the artwork may use in the "any" icons. Default 0.78. */
  fill?: number;
  /** Take only this part of the source first (pixels). */
  crop?: { left: number; top: number; width: number; height: number };
  /** Cut the artwork to an ellipse first (a round logo on a busy rectangular background). */
  circle?: boolean;
}

export async function renderPwaIcons(sourceInput: Buffer | string, o: PwaIconOptions): Promise<PwaIconSet> {
  let source: Buffer | string = o.crop ? await sharp(sourceInput).extract(o.crop).toBuffer() : sourceInput;
  if (o.circle) {
    const { width = 0, height = 0 } = await sharp(source).metadata();
    const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><ellipse cx="${width / 2}" cy="${height / 2}" rx="${width / 2}" ry="${height / 2}"/></svg>`);
    source = await sharp(source).ensureAlpha().composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  }
  const fill = o.fill ?? 0.78;
  const art = (size: number, share: number) => {
    const inner = Math.round(size * share);
    return sharp(source).resize(inner, inner, { fit: "inside", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  };
  const make = async (size: number, share: number, round: boolean) => {
    const canvas = sharp({ create: { width: size, height: size, channels: 4, background: o.background } });
    const layers: OverlayOptions[] = [{ input: await art(size, share), gravity: "centre" }];
    let img = canvas.composite(layers).png({ compressionLevel: 9 });
    if (round) {
      // rounded corners for the plain icon; a maskable one stays square (the OS draws the shape)
      const r = Math.round(size * 0.22);
      const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}"/></svg>`);
      img = sharp(await img.toBuffer()).composite([{ input: mask, blend: "dest-in" }]).png({ compressionLevel: 9 });
    }
    return img.toBuffer();
  };
  return {
    icon192: await make(192, fill, true),
    icon512: await make(512, fill, true),
    maskable512: await make(512, 0.6, false),
    appleTouch: await make(180, fill, false),
  };
}
