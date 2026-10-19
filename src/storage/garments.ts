import type { Garment, GarmentFields, GarmentStatus, ImageRecord } from '../types';
import { db, friendlyStorageError, nowIso, todayKey, uid } from './database';

export interface EncodedImage {
  blob: Blob;
  width: number;
  height: number;
}

export interface NewGarmentInput {
  fields: GarmentFields;
  full: EncodedImage;
  thumb: EncodedImage;
  hasAlpha: boolean;
}

function imageRecord(id: string, kind: ImageRecord['kind'], img: EncodedImage): ImageRecord {
  return { id, kind, blob: img.blob, mime: img.blob.type || 'image/webp', width: img.width, height: img.height, createdAt: nowIso() };
}

export async function addGarment(input: NewGarmentInput): Promise<Garment> {
  const t = nowIso();
  const g: Garment = {
    ...input.fields,
    id: uid(),
    imageId: uid(),
    thumbnailId: uid(),
    imageWidth: input.full.width,
    imageHeight: input.full.height,
    hasAlpha: input.hasAlpha,
    wearCount: 0,
    createdAt: t,
    updatedAt: t,
  };
  try {
    await db.transaction('rw', db.garments, db.images, async () => {
      await db.images.bulkAdd([imageRecord(g.imageId, 'full', input.full), imageRecord(g.thumbnailId, 'thumb', input.thumb)]);
      await db.garments.add(g);
    });
  } catch (e) {
    throw friendlyStorageError(e);
  }
  return g;
}

export async function updateGarment(
  id: string,
  patch: Partial<GarmentFields>,
  newImage?: { full: EncodedImage; thumb: EncodedImage; hasAlpha: boolean },
): Promise<void> {
  try {
    await db.transaction('rw', db.garments, db.images, async () => {
      const current = await db.garments.get(id);
      if (!current) throw new Error('Garment not found');
      const next: Garment = { ...current, ...patch, updatedAt: nowIso() };
      if (newImage) {
        next.imageId = uid();
        next.thumbnailId = uid();
        next.imageWidth = newImage.full.width;
        next.imageHeight = newImage.full.height;
        next.hasAlpha = newImage.hasAlpha;
        await db.images.bulkAdd([imageRecord(next.imageId, 'full', newImage.full), imageRecord(next.thumbnailId, 'thumb', newImage.thumb)]);
        await db.images.bulkDelete([current.imageId, current.thumbnailId]);
      }
      await db.garments.put(next);
    });
  } catch (e) {
    throw friendlyStorageError(e);
  }
}

/** Permanently deletes a garment and its images. Callers must confirm with the user first. */
export async function removeGarment(id: string): Promise<void> {
  await db.transaction('rw', db.garments, db.images, async () => {
    const g = await db.garments.get(id);
    if (!g) return;
    await db.images.bulkDelete([g.imageId, g.thumbnailId]);
    await db.garments.delete(id);
  });
}

export async function removeGarments(ids: string[]): Promise<void> {
  for (const id of ids) await removeGarment(id);
}

export async function setStatus(ids: string[], status: GarmentStatus): Promise<void> {
  await db.transaction('rw', db.garments, async () => {
    for (const id of ids) await db.garments.update(id, { status, updatedAt: nowIso() });
  });
}

export async function toggleFavorite(id: string): Promise<void> {
  const g = await db.garments.get(id);
  if (g) await db.garments.update(id, { favorite: !g.favorite, updatedAt: nowIso() });
}

/** Logs a wear: bumps the counter, stamps the date and marks clean pieces as worn. */
export async function logWorn(ids: string[], date = todayKey()): Promise<void> {
  await db.transaction('rw', db.garments, async () => {
    for (const id of ids) {
      const g = await db.garments.get(id);
      if (!g) continue;
      await db.garments.update(id, {
        wearCount: g.wearCount + 1,
        lastWorn: date,
        status: g.status === 'clean' ? 'worn' : g.status,
        updatedAt: nowIso(),
      });
    }
  });
}

export async function getImageBlob(id: string): Promise<Blob | undefined> {
  return (await db.images.get(id))?.blob;
}

export async function removeSampleGarments(): Promise<number> {
  const samples = (await db.garments.toArray()).filter((g) => g.sample);
  await removeGarments(samples.map((g) => g.id));
  return samples.length;
}
