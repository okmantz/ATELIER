import type Konva from 'konva';
import type { EncodedImage } from '../storage/garments';

export function stageToBlob(stage: Konva.Stage, pixelRatio: number, mime = 'image/png', quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    stage.toBlob({
      pixelRatio,
      mimeType: mime,
      quality,
      callback: (b: Blob | null) => (b ? resolve(b) : reject(new Error('Export failed'))),
    } as never);
  });
}

export async function stageThumbnail(stage: Konva.Stage, logicalWidth: number, targetWidth = 420): Promise<EncodedImage> {
  const ratio = targetWidth / (logicalWidth * stage.scaleX());
  const blob = await stageToBlob(stage, ratio, 'image/jpeg', 0.85);
  return { blob, width: Math.round(stage.width() * ratio), height: Math.round(stage.height() * ratio) };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Opens the native share sheet with the image where supported. Returns false if unsupported. */
export async function shareImage(blob: Blob, filename: string, title: string): Promise<boolean> {
  const file = new File([blob], filename, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return true;
    } catch {
      return true; // user cancelled
    }
  }
  return false;
}
