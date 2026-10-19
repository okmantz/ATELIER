import { rgbToHex, hexToRgb } from '../engine/color-harmony';
import { ctx2d, newCanvas } from './image-resize';

/**
 * Suggest the dominant colour of a garment photo using plain pixel statistics:
 * quantise to 4 bits per channel, weight centre pixels higher, skip transparent pixels
 * and (for photos without a cut-out) skip pixels that match the backdrop colour.
 */
export function dominantColor(src: HTMLCanvasElement): string {
  const scale = 72 / Math.max(src.width, src.height);
  const c = newCanvas(src.width * scale, src.height * scale);
  const x = ctx2d(c);
  x.drawImage(src, 0, 0, c.width, c.height);
  const { data } = x.getImageData(0, 0, c.width, c.height);
  const w = c.width;
  const h = c.height;

  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 128) transparent++;
  const hasCutout = transparent > w * h * 0.05;

  // Backdrop estimate from corners.
  const corner = (px: number, py: number) => {
    const i = (py * w + px) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const cs = [corner(0, 0), corner(w - 1, 0), corner(0, h - 1), corner(w - 1, h - 1)];
  const bg = cs.reduce((a, v) => [a[0] + v[0] / 4, a[1] + v[1] / 4, a[2] + v[2] / 4], [0, 0, 0]);

  const buckets = new Map<number, { w: number; r: number; g: number; b: number }>();
  let total = 0;
  const collect = (skipBg: boolean) => {
    buckets.clear();
    total = 0;
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const i = (py * w + px) * 4;
        if (data[i + 3] < 128) continue;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (skipBg && !hasCutout) {
          const d = (r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2;
          if (d < 38 * 38) continue;
        }
        const dx = (px / w - 0.5) * 2;
        const dy = (py / h - 0.5) * 2;
        const wt = 1.2 - Math.min(1, Math.hypot(dx, dy)) * 0.9;
        const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
        const e = buckets.get(key) ?? { w: 0, r: 0, g: 0, b: 0 };
        e.w += wt; e.r += r * wt; e.g += g * wt; e.b += b * wt;
        buckets.set(key, e);
        total += wt;
      }
    }
  };
  collect(true);
  if (total < w * h * 0.04) collect(false);

  let best: { w: number; r: number; g: number; b: number } | null = null;
  for (const e of buckets.values()) if (!best || e.w > best.w) best = e;
  if (!best) return '#8A8D91';
  return rgbToHex(best.r / best.w, best.g / best.w, best.b / best.w);
}

export function readableOn(hex: string): '#171715' | '#F4F0E8' {
  const { r, g, b } = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#171715' : '#F4F0E8';
}
