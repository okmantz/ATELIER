import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import type { AppSettings, CalendarEntry, Garment, OutfitScene, SavedOutfit } from '../types';
import { db } from './database';

export const BACKUP_VERSION = 1;

interface ImageMeta {
  id: string;
  kind: 'full' | 'thumb' | 'scene';
  mime: string;
  width: number;
  height: number;
  createdAt: string;
  file: string;
}

export interface BackupManifest {
  app: 'ATELIER';
  version: number;
  exportedAt: string;
  garments: Garment[];
  outfits: SavedOutfit[];
  scenes: OutfitScene[];
  calendarEntries: CalendarEntry[];
  settings: AppSettings | null;
  images: ImageMeta[];
}

const EXT: Record<string, string> = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' };

export async function exportWardrobe(): Promise<Blob> {
  const [garments, outfits, scenes, calendarEntries, images, settingsRow] = await Promise.all([
    db.garments.toArray(),
    db.outfits.toArray(),
    db.scenes.toArray(),
    db.calendarEntries.toArray(),
    db.images.toArray(),
    db.settings.get('app'),
  ]);
  const files: Zippable = {};
  const meta: ImageMeta[] = [];
  for (const img of images) {
    const file = `images/${img.id}.${EXT[img.mime] ?? 'bin'}`;
    files[file] = [new Uint8Array(await img.blob.arrayBuffer()), { level: 0 }];
    meta.push({ id: img.id, kind: img.kind, mime: img.mime, width: img.width, height: img.height, createdAt: img.createdAt, file });
  }
  const manifest: BackupManifest = {
    app: 'ATELIER',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    garments,
    outfits,
    scenes,
    calendarEntries,
    settings: (settingsRow?.value as AppSettings | undefined) ?? null,
    images: meta,
  };
  files['manifest.json'] = strToU8(JSON.stringify(manifest));
  const zipped = zipSync(files);
  return new Blob([zipped as BlobPart], { type: 'application/zip' });
}

/** Throws a readable Error if the manifest is not a valid ATELIER backup. */
export function validateManifest(m: unknown, fileNames: string[]): BackupManifest {
  const x = m as Partial<BackupManifest> | null;
  if (!x || typeof x !== 'object' || x.app !== 'ATELIER') throw new Error('This file is not an ATELIER backup.');
  if (typeof x.version !== 'number' || x.version > BACKUP_VERSION)
    throw new Error('This backup was made by a newer version of ATELIER. Update the app and try again.');
  for (const key of ['garments', 'outfits', 'scenes', 'calendarEntries', 'images'] as const) {
    if (!Array.isArray(x[key])) throw new Error(`Backup is damaged (missing "${key}").`);
  }
  const files = new Set(fileNames);
  const imageIds = new Set<string>();
  for (const img of x.images!) {
    if (!files.has(img.file)) throw new Error(`Backup is damaged (missing image file ${img.file}).`);
    imageIds.add(img.id);
  }
  for (const g of x.garments!) {
    if (!g.id || !imageIds.has(g.imageId) || !imageIds.has(g.thumbnailId))
      throw new Error(`Backup is damaged (garment "${g.name ?? g.id}" has no image).`);
  }
  return x as BackupManifest;
}

export interface RestoreResult {
  garments: number;
  outfits: number;
  scenes: number;
  calendarEntries: number;
  skipped: number;
}

export async function restoreWardrobe(file: Blob, mode: 'merge' | 'replace'): Promise<RestoreResult> {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
  } catch {
    throw new Error('Could not read this file. Is it an ATELIER backup .zip?');
  }
  if (!entries['manifest.json']) throw new Error('This file is not an ATELIER backup (no manifest).');
  let parsed: unknown;
  try {
    parsed = JSON.parse(strFromU8(entries['manifest.json']));
  } catch {
    throw new Error('Backup manifest is unreadable.');
  }
  const m = validateManifest(parsed, Object.keys(entries));

  const imageRecords = m.images.map((meta) => ({
    id: meta.id,
    kind: meta.kind,
    mime: meta.mime,
    width: meta.width,
    height: meta.height,
    createdAt: meta.createdAt,
    blob: new Blob([entries[meta.file] as BlobPart], { type: meta.mime }),
  }));

  const result: RestoreResult = { garments: 0, outfits: 0, scenes: 0, calendarEntries: 0, skipped: 0 };
  await db.transaction('rw', [db.garments, db.images, db.outfits, db.scenes, db.calendarEntries, db.settings], async () => {
    if (mode === 'replace') {
      await Promise.all([db.garments.clear(), db.images.clear(), db.outfits.clear(), db.scenes.clear(), db.calendarEntries.clear()]);
    }
    const addMissing = async <T extends { id: string }>(table: { bulkGet(k: string[]): Promise<(T | undefined)[]>; bulkAdd(v: T[]): Promise<unknown> }, rows: T[]) => {
      const existing = await table.bulkGet(rows.map((r) => r.id));
      const fresh = rows.filter((_, i) => !existing[i]);
      result.skipped += rows.length - fresh.length;
      if (fresh.length) await table.bulkAdd(fresh);
      return fresh.length;
    };
    await addMissing(db.images, imageRecords);
    result.garments = await addMissing(db.garments, m.garments);
    result.outfits = await addMissing(db.outfits, m.outfits);
    result.scenes = await addMissing(db.scenes, m.scenes);
    result.calendarEntries = await addMissing(db.calendarEntries, m.calendarEntries);
    if (mode === 'replace' && m.settings) await db.settings.put({ key: 'app', value: m.settings });
  });
  return result;
}
