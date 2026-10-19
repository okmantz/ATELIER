import type { Garment, GenderFocus, OutfitPreferences } from '../types';
import { ACCESSORY_ZONE } from '../data/taxonomy';
import { layerSlot } from './compatibility';
import { mulberry32, selectDiverseOutfits, type Ranked } from './diversity';
import { defaultPreferences, occasionFormality, scoreOutfit, type ScoreBreakdown } from './outfit-scorer';

export interface GeneratedOutfit {
  id: string;
  items: Garment[]; // ordered: layers (inner→outer), bottoms, shoes, accessories
  score: ScoreBreakdown;
}

const hash = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

export const outfitKey = (items: Garment[]) =>
  hash(
    items
      .map((i) => i.id)
      .sort()
      .join('|'),
  );

export function genderOk(g: Garment, focus: GenderFocus): boolean {
  return focus === 'all' || g.gender === 'unisex' || g.gender === focus;
}

/** Step A — drop everything that can't be worn right now. */
export function filterAvailable(wardrobe: Garment[], prefs: OutfitPreferences): Garment[] {
  const target = prefs.formality;
  const anchors = new Set(prefs.anchorIds);
  const excluded = new Set(prefs.excludeIds);
  return wardrobe.filter((g) => {
    if (anchors.has(g.id)) return true;
    if (excluded.has(g.id)) return false;
    if (g.status === 'archived' || g.status === 'laundry') return false;
    if (g.status === 'worn' && !prefs.includeWorn) return false;
    if (!genderOk(g, prefs.genderFocus)) return false;
    if (g.occasions.length && !g.occasions.includes(prefs.occasion) && Math.abs(g.formality - target) > 1) return false;
    if (prefs.season !== 'any' && g.season.length && !g.season.includes(prefs.season)) return false;
    return true;
  });
}

/** A single outfit never mixes men's-only and women's-only pieces (unisex goes with either). */
export function genderCoherent(items: Garment[]): boolean {
  let men = false;
  let women = false;
  for (const g of items) {
    if (g.gender === 'men') men = true;
    else if (g.gender === 'women') women = true;
  }
  return !(men && women);
}

function combos<T>(lists: T[][]): T[][] {
  let out: T[][] = [[]];
  for (const list of lists) {
    const next: T[][] = [];
    for (const prefix of out) for (const item of list) next.push([...prefix, item]);
    out = next;
  }
  return out;
}

const SLOT_CAP: Record<number, number> = { 1: 8, 2: 6, 3: 6, 4: 5 };

export function generateOutfits(
  wardrobe: Garment[],
  partial: Partial<OutfitPreferences> = {},
  now = Date.now(),
): GeneratedOutfit[] {
  const prefs = defaultPreferences(partial);
  const rng = mulberry32(prefs.seed);
  const available = filterAvailable(wardrobe, prefs);
  const anchorSet = new Set(prefs.anchorIds);
  const anchors = available.filter((g) => anchorSet.has(g.id));

  const fit = (g: Garment) =>
    0.5 * Math.max(0, 1 - Math.abs(g.formality - prefs.formality) / 4) +
    (g.favorite ? 0.2 : 0) +
    0.15 / (1 + g.wearCount) +
    rng() * 0.35;

  const pick = (arr: Garment[], cap: number) => {
    const forced = arr.filter((g) => anchorSet.has(g.id));
    if (forced.length) return forced;
    return arr
      .map((g) => ({ g, f: fit(g) }))
      .sort((a, b) => b.f - a.f)
      .slice(0, cap)
      .map((x) => x.g);
  };

  const hasAnchorBottom = anchors.some((g) => g.category === 'bottoms');
  const hasAnchorOnePiece = anchors.some((g) => g.category === 'one-piece');

  // ---- pools ---------------------------------------------------------------
  const slotPool: Record<number, Garment[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const g of available) {
    const s = layerSlot(g);
    if (s >= 1 && s <= 4) {
      if (g.category === 'one-piece' && hasAnchorBottom) continue;
      slotPool[s].push(g);
    }
  }
  for (const s of [1, 2, 3, 4]) slotPool[s] = pick(slotPool[s], SLOT_CAP[s]);
  const bottoms = hasAnchorOnePiece ? [] : pick(available.filter((g) => g.category === 'bottoms'), 10);
  const shoes = pick(available.filter((g) => g.category === 'shoes'), 8);
  const accessories = pick(available.filter((g) => g.category === 'accessories'), 14);
  const anchorSlots = anchors.map(layerSlot).filter((s) => s >= 1);

  // ---- Stage 1: layer stacks (base, mid, outer, coat in any valid combination) -------------
  const stacks: Garment[][] = [];
  for (let mask = 1; mask < 16; mask++) {
    const slots = [1, 2, 3, 4].filter((s) => mask & (1 << (s - 1)));
    if (slots.length > prefs.layers) continue;
    if (!slots.includes(1) && !slots.includes(2)) continue; // something has to sit against the skin
    if (!anchorSlots.every((s) => slots.includes(s))) continue;
    if (slots.some((s) => slotPool[s].length === 0)) continue;
    for (const c of combos(slots.map((s) => slotPool[s]))) if (genderCoherent(c)) stacks.push(c);
  }
  if (!stacks.length) return [];
  const scoredStacks = stacks
    .map((items) => ({ items, s: scoreOutfit(items, prefs, now).total }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 90);

  // ---- Stage 2: bottoms (or none for one-pieces) -----------------------------------------
  let stage: Garment[][] = [];
  for (const { items } of scoredStacks) {
    if (items.some((g) => g.category === 'one-piece')) stage.push(items);
    else for (const b of bottoms) if (genderCoherent([...items, b])) stage.push([...items, b]);
  }
  stage = topN(stage, prefs, now, 160);

  // ---- Stage 3: shoes ---------------------------------------------------------------------
  if (shoes.length) {
    const withShoes: Garment[][] = [];
    for (const items of stage) for (const sh of shoes) if (genderCoherent([...items, sh])) withShoes.push([...items, sh]);
    stage = topN(withShoes, prefs, now, 420);
  }

  // ---- Stage 4: accessories, added greedily when they help ---------------------------------
  const full: { items: Garment[]; score: ScoreBreakdown }[] = [];
  for (const base of stage.slice(0, 260)) {
    let items = base;
    let score = scoreOutfit(items, prefs, now);
    const used = new Set<string>();
    const forced = accessories.filter((a) => anchorSet.has(a.id));
    for (const a of forced) {
      items = [...items, a];
      used.add(ACCESSORY_ZONE[a.subcategory] ?? a.subcategory);
    }
    if (forced.length) score = scoreOutfit(items, prefs, now);
    for (let n = forced.length; n < prefs.maxAccessories; n++) {
      let best: { a: Garment; s: ScoreBreakdown } | null = null;
      for (const a of accessories) {
        if (items.includes(a)) continue;
        const zone = ACCESSORY_ZONE[a.subcategory] ?? a.subcategory;
        if (used.has(zone)) continue;
        if (!genderCoherent([...items, a])) continue;
        const s = scoreOutfit([...items, a], prefs, now);
        if (!best || s.total > best.s.total) best = { a, s };
      }
      if (!best || best.s.total < score.total - 0.5) break;
      items = [...items, best.a];
      score = best.s;
      used.add(ACCESSORY_ZONE[best.a.subcategory] ?? best.a.subcategory);
    }
    full.push({ items, score });
  }

  const ranked: Ranked<GeneratedOutfit>[] = full
    .filter((f) => f.score.total >= prefs.minScore)
    .sort((a, b) => b.score.total - a.score.total)
    .map((f) => ({
      item: { id: outfitKey(f.items), items: f.items, score: f.score },
      ids: f.items.map((i) => i.id),
      score: f.score.total,
    }));

  return selectDiverseOutfits(ranked, {
    limit: prefs.limit,
    maxSharedItemsRatio: 1 - prefs.variety * 0.57, // 70% variety ⇒ 0.6 shared items max
    lambda: 25 * prefs.variety,
  });
}

function topN(list: Garment[][], prefs: OutfitPreferences, now: number, n: number): Garment[][] {
  return list
    .map((items) => ({ items, s: scoreOutfit(items, prefs, now).total }))
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.items);
}

/** Re-score a hand-edited outfit. */
export function rescoreOutfit(items: Garment[], partial: Partial<OutfitPreferences> = {}, now = Date.now()): GeneratedOutfit {
  const prefs = defaultPreferences(partial);
  return { id: outfitKey(items), items, score: scoreOutfit(items, prefs, now) };
}

/** Alternatives for one garment of an outfit, best first. */
export function swapCandidates(
  items: Garment[],
  targetId: string,
  wardrobe: Garment[],
  partial: Partial<OutfitPreferences> = {},
  now = Date.now(),
): { garment: Garment; score: ScoreBreakdown }[] {
  const prefs = defaultPreferences({ ...partial, anchorIds: [] });
  const target = items.find((i) => i.id === targetId);
  if (!target) return [];
  const inOutfit = new Set(items.map((i) => i.id));
  const slot = layerSlot(target);
  const candidates = wardrobe.filter((g) => {
    if (inOutfit.has(g.id)) return false;
    if (g.status === 'archived' || g.status === 'laundry') return false;
    if (!genderOk(g, prefs.genderFocus)) return false;
    if (g.category !== target.category) return false;
    if (slot > 0 && layerSlot(g) !== slot) return false;
    if (!genderCoherent([...items.filter((i) => i.id !== targetId), g])) return false;
    return true;
  });
  return candidates
    .map((g) => ({ garment: g, score: scoreOutfit(items.map((i) => (i.id === targetId ? g : i)), prefs, now) }))
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, 14);
}

export { occasionFormality };
