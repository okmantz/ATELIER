import Dexie, { type Table } from 'dexie';
import type { CalendarEntry, Garment, ImageRecord, OutfitScene, SavedOutfit } from '../types';

export class AtelierDB extends Dexie {
  garments!: Table<Garment, string>;
  images!: Table<ImageRecord, string>;
  outfits!: Table<SavedOutfit, string>;
  scenes!: Table<OutfitScene, string>;
  calendarEntries!: Table<CalendarEntry, string>;
  settings!: Table<{ key: string; value: unknown }, string>;

  constructor(name = 'atelier') {
    super(name);
    // Only index fields we query by. Booleans are not valid IndexedDB keys, so they are filtered in memory.
    this.version(1).stores({
      garments: 'id, category, status, gender, primaryColor, createdAt, updatedAt',
      images: 'id, kind',
      outfits: 'id, createdAt',
      scenes: 'id, updatedAt',
      calendarEntries: 'id, date',
      settings: 'key',
    });
  }
}

export const db = new AtelierDB();

export function uid(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const nowIso = () => new Date().toISOString();

export const todayKey = (d = new Date()) => {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export function friendlyStorageError(e: unknown): Error {
  const name = (e as { name?: string })?.name;
  if (name === 'QuotaExceededError' || /quota/i.test(String((e as Error)?.message))) {
    return new Error('Your device is out of storage. Export a backup, then free some space or archive items.');
  }
  return e instanceof Error ? e : new Error('Storage error');
}

export async function estimateStorage(): Promise<{ usage: number; quota: number } | null> {
  try {
    if (navigator.storage?.estimate) {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      return { usage, quota };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch {
    /* ignore */
  }
  return false;
}
