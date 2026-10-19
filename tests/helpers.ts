import 'fake-indexeddb/auto';
import type { Garment } from '../src/types';
import { defaultLayerFor, findSub } from '../src/data/taxonomy';
import { SAMPLES } from '../src/samples/sample-wardrobe';

export function sampleGarments(): Garment[] {
  return SAMPLES.map((s, i) => {
    const sub = findSub(s.c, s.s);
    return {
      id: `g${i}`,
      name: s.n,
      gender: s.g,
      category: s.c,
      subcategory: s.s,
      layer: defaultLayerFor(s.c, s.s),
      warmth: sub?.warmth ?? 1,
      imageId: `i${i}`,
      thumbnailId: `t${i}`,
      imageWidth: 400,
      imageHeight: 500,
      hasAlpha: true,
      primaryColor: s.hex,
      secondaryColors: [],
      pattern: s.p ?? 'solid',
      season: s.se ?? ['spring', 'summer', 'autumn', 'winter'],
      occasions: s.oc,
      formality: sub?.formality ?? 3,
      status: 'clean',
      favorite: !!s.fav,
      wearCount: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    } as Garment;
  });
}

export const byName = (list: Garment[], name: string) => {
  const g = list.find((x) => x.name === name);
  if (!g) throw new Error(`no sample named ${name}`);
  return g;
};
