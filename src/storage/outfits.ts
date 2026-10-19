import type { OutfitScene, SavedOutfit } from '../types';
import { db, friendlyStorageError, nowIso, uid } from './database';
import type { EncodedImage } from './garments';

export async function saveOutfit(o: Omit<SavedOutfit, 'id' | 'createdAt' | 'favorite'> & { favorite?: boolean }): Promise<SavedOutfit> {
  const outfit: SavedOutfit = { ...o, id: uid(), favorite: o.favorite ?? true, createdAt: nowIso() };
  await db.outfits.add(outfit);
  return outfit;
}

export async function deleteOutfit(id: string): Promise<void> {
  await db.outfits.delete(id);
}

export async function toggleOutfitFavorite(id: string): Promise<void> {
  const o = await db.outfits.get(id);
  if (o) await db.outfits.update(id, { favorite: !o.favorite });
}

export async function saveScene(scene: OutfitScene, thumb?: EncodedImage): Promise<OutfitScene> {
  const next: OutfitScene = { ...scene, updatedAt: nowIso() };
  try {
    await db.transaction('rw', db.scenes, db.images, async () => {
      if (thumb) {
        if (scene.thumbnailId) await db.images.delete(scene.thumbnailId);
        const id = uid();
        await db.images.add({ id, kind: 'scene', blob: thumb.blob, mime: thumb.blob.type, width: thumb.width, height: thumb.height, createdAt: nowIso() });
        next.thumbnailId = id;
      }
      await db.scenes.put(next);
    });
  } catch (e) {
    throw friendlyStorageError(e);
  }
  return next;
}

export async function deleteScene(id: string): Promise<void> {
  await db.transaction('rw', db.scenes, db.images, async () => {
    const s = await db.scenes.get(id);
    if (s?.thumbnailId) await db.images.delete(s.thumbnailId);
    await db.scenes.delete(id);
  });
}
