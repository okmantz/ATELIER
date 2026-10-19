import { ctx2d, newCanvas } from './image-resize';

export function rotateQuarter(src: HTMLCanvasElement, turns: number): HTMLCanvasElement {
  const t = ((turns % 4) + 4) % 4;
  if (t === 0) return src;
  const swap = t % 2 === 1;
  const c = newCanvas(swap ? src.height : src.width, swap ? src.width : src.height);
  const x = ctx2d(c);
  x.translate(c.width / 2, c.height / 2);
  x.rotate((t * Math.PI) / 2);
  x.drawImage(src, -src.width / 2, -src.height / 2);
  return c;
}

export interface CropFractions {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export function cropFractions(src: HTMLCanvasElement, f: CropFractions): HTMLCanvasElement {
  if (!f.top && !f.left && !f.right && !f.bottom) return src;
  const x0 = Math.round(src.width * f.left);
  const y0 = Math.round(src.height * f.top);
  const w = Math.max(8, Math.round(src.width * (1 - f.left - f.right)));
  const h = Math.max(8, Math.round(src.height * (1 - f.top - f.bottom)));
  const c = newCanvas(w, h);
  ctx2d(c).drawImage(src, x0, y0, w, h, 0, 0, w, h);
  return c;
}

/**
 * Removes a plain backdrop: flood-fills inwards from the border, treating every pixel within
 * `strength` colour-distance of the backdrop colour as background. Pure image processing.
 * Returns null if it would erase almost everything (e.g. white shirt on white wall).
 */
export function removeBackground(src: HTMLCanvasElement, strength: number): HTMLCanvasElement | null {
  const w = src.width;
  const h = src.height;
  const img = ctx2d(src).getImageData(0, 0, w, h);
  const d = img.data;

  // Backdrop colour = average of border samples.
  let r = 0, g = 0, b = 0, n = 0;
  const sample = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    if (d[i + 3] < 128) return;
    r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
  };
  for (let x = 0; x < w; x += 4) { sample(x, 0); sample(x, h - 1); }
  for (let y = 0; y < h; y += 4) { sample(0, y); sample(w - 1, y); }
  if (!n) return src;
  r /= n; g /= n; b /= n;

  const thr = strength * 2.4; // 0..100 → 0..240 euclidean RGB distance
  const thr2 = thr * thr;
  const isBg = (p: number) => {
    const i = p * 4;
    if (d[i + 3] < 16) return true;
    const dr = d[i] - r, dg = d[i + 1] - g, db_ = d[i + 2] - b;
    return dr * dr + dg * dg + db_ * db_ <= thr2;
  };

  const removed = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0, tail = 0;
  const push = (p: number) => {
    if (removed[p] || !isBg(p)) return;
    removed[p] = 1;
    queue[tail++] = p;
  };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (head < tail) {
    const p = queue[head++];
    const x = p % w;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (p >= w) push(p - w);
    if (p < w * (h - 1)) push(p + w);
  }
  if (tail > w * h * 0.93) return null;

  // Soften the cut edge: pixels touching the removed area become semi-transparent.
  const out = new Uint8ClampedArray(d);
  for (let p = 0; p < w * h; p++) {
    const i = p * 4 + 3;
    if (removed[p]) { out[i] = 0; continue; }
    const x = p % w;
    const touches =
      (x > 0 && removed[p - 1]) || (x < w - 1 && removed[p + 1]) || (p >= w && removed[p - w]) || (p < w * (h - 1) && removed[p + w]);
    if (touches) out[i] = Math.min(out[i], 140);
  }
  const c = newCanvas(w, h);
  ctx2d(c).putImageData(new ImageData(out, w, h), 0, 0);
  return c;
}

/** Crops transparent margins (if any) and adds a small even padding. */
export function trimToContent(src: HTMLCanvasElement, padding = 16): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const { data } = ctx2d(src).getImageData(0, 0, w, h);
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0 || (minX === 0 && minY === 0 && maxX === w - 1 && maxY === h - 1)) return src;
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const c = newCanvas(cw + padding * 2, ch + padding * 2);
  ctx2d(c).drawImage(src, minX, minY, cw, ch, padding, padding, cw, ch);
  return c;
}
