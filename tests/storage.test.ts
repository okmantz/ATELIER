import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { db } from '../src/storage/database';
import { addGarment, logWorn, removeGarment, setStatus, updateGarment, toggleFavorite } from '../src/storage/garments';
import { exportWardrobe, restoreWardrobe, validateManifest } from '../src/storage/backup';
import { saveOutfit } from '../src/storage/outfits';
import { setPlan, markEntryWorn } from '../src/storage/calendar';
import { loadSettings, saveSettings, mergeSettings } from '../src/storage/settings';
import type { GarmentFields } from '../src/types';

const fields = (name: string): GarmentFields => ({
  name,
  gender: 'unisex',
  category: 'tops',
  subcategory: 'T-shirt',
  layer: 1,
  warmth: 1,
  primaryColor: '#F5F3EE',
  secondaryColors: [],
  pattern: 'solid',
  season: ['summer'],
  occasions: ['casual'],
  formality: 1,
  status: 'clean',
  favorite: false,
});
const img = (text: string) => ({ blob: new Blob([text], { type: 'image/webp' }), width: 10, height: 12 });
const mk = (name: string) => addGarment({ fields: fields(name), full: img('full-' + name), thumb: img('thumb-' + name), hasAlpha: true });

beforeEach(async () => {
  await Promise.all([db.garments.clear(), db.images.clear(), db.outfits.clear(), db.scenes.clear(), db.calendarEntries.clear(), db.settings.clear()]);
});

describe('garment storage', () => {
  it('stores a garment with separate full and thumbnail images', async () => {
    const g = await mk('Tee');
    expect(await db.garments.count()).toBe(1);
    expect(await db.images.count()).toBe(2);
    expect((await db.images.get(g.thumbnailId))?.kind).toBe('thumb');
    expect((await db.images.get(g.imageId))?.kind).toBe('full');
  });

  it('updates metadata without touching images, and replaces images when asked', async () => {
    const g = await mk('Tee');
    await updateGarment(g.id, { name: 'Renamed', favorite: true });
    const after = await db.garments.get(g.id);
    expect(after?.name).toBe('Renamed');
    expect(after?.imageId).toBe(g.imageId);
    await updateGarment(g.id, {}, { full: img('new'), thumb: img('newthumb'), hasAlpha: false });
    const replaced = await db.garments.get(g.id);
    expect(replaced?.imageId).not.toBe(g.imageId);
    expect(await db.images.get(g.imageId)).toBeUndefined();
    expect(await db.images.count()).toBe(2);
  });

  it('logs wears and statuses', async () => {
    const g = await mk('Tee');
    await logWorn([g.id], '2026-10-01');
    const w = await db.garments.get(g.id);
    expect(w).toMatchObject({ wearCount: 1, lastWorn: '2026-10-01', status: 'worn' });
    await setStatus([g.id], 'laundry');
    expect((await db.garments.get(g.id))?.status).toBe('laundry');
    await toggleFavorite(g.id);
    expect((await db.garments.get(g.id))?.favorite).toBe(true);
  });

  it('removes a garment together with its images', async () => {
    const g = await mk('Tee');
    await removeGarment(g.id);
    expect(await db.garments.count()).toBe(0);
    expect(await db.images.count()).toBe(0);
  });

  it('plans outfits on the calendar and logs wears once', async () => {
    const g = await mk('Tee');
    const entry = await setPlan('2026-10-20', [g.id], 'Look');
    await markEntryWorn(entry);
    const fresh = (await db.calendarEntries.get(entry.id))!;
    await markEntryWorn(fresh);
    expect((await db.garments.get(g.id))?.wearCount).toBe(1);
  });
});

describe('settings', () => {
  it('falls back to defaults and merges nested values', async () => {
    expect((await loadSettings()).discover.layers).toBe(3);
    await saveSettings(mergeSettings({ genderFocus: 'women', discover: { layers: 4 } as never }));
    const s = await loadSettings();
    expect(s.genderFocus).toBe('women');
    expect(s.discover.layers).toBe(4);
    expect(s.discover.occasion).toBe('casual');
  });
});

describe('backup & restore', () => {
  it('round-trips the wardrobe through a zip', async () => {
    const a = await mk('Alpha');
    await mk('Beta');
    await saveOutfit({ name: 'Look', garmentIds: [a.id], score: 80, occasion: 'casual', season: 'any' });
    const zip = await exportWardrobe();
    expect(zip.size).toBeGreaterThan(100);

    await Promise.all([db.garments.clear(), db.images.clear(), db.outfits.clear()]);
    const res = await restoreWardrobe(zip, 'merge');
    expect(res.garments).toBe(2);
    expect(await db.images.count()).toBe(4);
    expect(await db.outfits.count()).toBe(1);
    const restored = await db.garments.get(a.id);
    expect(restored?.name).toBe('Alpha');
    expect(await (await db.images.get(a.imageId))!.blob.text()).toBe('full-Alpha');
  });

  it('merge never overwrites existing items; replace swaps everything', async () => {
    const a = await mk('Alpha');
    const zip = await exportWardrobe();
    await updateGarment(a.id, { name: 'Edited later' });
    const merged = await restoreWardrobe(zip, 'merge');
    expect(merged.garments).toBe(0);
    expect(merged.skipped).toBeGreaterThan(0);
    expect((await db.garments.get(a.id))?.name).toBe('Edited later');
    await mk('Extra');
    await restoreWardrobe(zip, 'replace');
    expect(await db.garments.count()).toBe(1);
    expect((await db.garments.get(a.id))?.name).toBe('Alpha');
  });

  it('rejects files that are not valid backups', async () => {
    await expect(restoreWardrobe(new Blob(['nope']), 'merge')).rejects.toThrow();
    const bad = zipSync({ 'manifest.json': strToU8(JSON.stringify({ app: 'Other' })) });
    await expect(restoreWardrobe(new Blob([bad as BlobPart]), 'merge')).rejects.toThrow(/not an ATELIER backup/);
    expect(() => validateManifest({ app: 'ATELIER', version: 99, garments: [], outfits: [], scenes: [], calendarEntries: [], images: [] }, [])).toThrow(/newer version/);
    expect(() =>
      validateManifest(
        { app: 'ATELIER', version: 1, garments: [{ id: 'x', imageId: 'a', thumbnailId: 'b' }], outfits: [], scenes: [], calendarEntries: [], images: [] },
        [],
      ),
    ).toThrow(/damaged/);
  });
});
