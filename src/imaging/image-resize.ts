import type { EncodedImage } from '../storage/garments';

export function newCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  return c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
}

async function decode(file: Blob): Promise<{ src: CanvasImageSource; w: number; h: number; close?: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
      return { src: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() };
    } catch {
      /* fall through to <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return { src: img, w: img.naturalWidth, h: img.naturalHeight };
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/** Decode a photo (honouring EXIF rotation) and downscale so the longest edge is at most maxDim. */
export async function loadImageCanvas(file: Blob, maxDim = 1600): Promise<HTMLCanvasElement> {
  const d = await decode(file);
  const scale = Math.min(1, maxDim / Math.max(d.w, d.h));
  const c = newCanvas(d.w * scale, d.h * scale);
  const x = ctx2d(c);
  x.imageSmoothingQuality = 'high';
  x.drawImage(d.src, 0, 0, c.width, c.height);
  d.close?.();
  return c;
}

export function resizeCanvas(src: HTMLCanvasElement, maxDim: number): HTMLCanvasElement {
  const scale = Math.min(1, maxDim / Math.max(src.width, src.height));
  if (scale >= 1) return src;
  const c = newCanvas(src.width * scale, src.height * scale);
  const x = ctx2d(c);
  x.imageSmoothingQuality = 'high';
  x.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

export function hasTransparency(c: HTMLCanvasElement): boolean {
  const { data } = ctx2d(c).getImageData(0, 0, c.width, c.height);
  for (let i = 3; i < data.length; i += 16) if (data[i] < 250) return true;
  return false;
}

export function canvasToBlob(c: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => c.toBlob((b) => resolve(b), type, quality));
}

/** WebP where supported (keeps transparency, small), otherwise PNG for cut-outs and JPEG for photos. */
export async function encodeCanvas(c: HTMLCanvasElement, alpha = hasTransparency(c)): Promise<EncodedImage> {
  let blob = await canvasToBlob(c, 'image/webp', 0.9);
  if (!blob || blob.type !== 'image/webp') {
    blob = alpha ? await canvasToBlob(c, 'image/png') : await canvasToBlob(c, 'image/jpeg', 0.9);
  }
  if (!blob) throw new Error('Could not encode the image.');
  return { blob, width: c.width, height: c.height };
}

export async function makeThumbnail(c: HTMLCanvasElement, maxDim = 360): Promise<EncodedImage> {
  return encodeCanvas(resizeCanvas(c, maxDim));
}
