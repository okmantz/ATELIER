import { describe, expect, it } from 'vitest';
import { byName, sampleGarments } from './helpers';
import { generateOutfits, rescoreOutfit, swapCandidates } from '../src/engine/outfit-generator';
import { layerSlot } from '../src/engine/compatibility';
import { scoreOutfit, defaultPreferences } from '../src/engine/outfit-scorer';
import { sharedRatio } from '../src/engine/diversity';

const wardrobe = sampleGarments();
const layerCount = (items: ReturnType<typeof sampleGarments>) => items.filter((g) => layerSlot(g) > 0).length;

describe('outfit generation', () => {
  it('builds complete outfits for menswear only', () => {
    const out = generateOutfits(wardrobe, { genderFocus: 'men', occasion: 'business', formality: 3 });
    expect(out.length).toBeGreaterThanOrEqual(6);
    for (const o of out) {
      expect(o.items.every((g) => g.gender !== 'women')).toBe(true);
      expect(o.items.some((g) => g.category === 'bottoms')).toBe(true);
      expect(o.items.some((g) => g.category === 'shoes')).toBe(true);
      expect(layerCount(o.items)).toBeGreaterThanOrEqual(1);
      expect(o.score.total).toBeGreaterThan(0);
      expect(o.score.total).toBeLessThanOrEqual(100);
    }
  });

  it('supports women’s outfits including one-piece garments', () => {
    const out = generateOutfits(wardrobe, { genderFocus: 'women', occasion: 'date', formality: 3 });
    expect(out.length).toBeGreaterThan(0);
    expect(out.some((o) => o.items.some((g) => g.category === 'one-piece'))).toBe(true);
    for (const o of out) {
      if (o.items.some((g) => g.category === 'one-piece')) expect(o.items.some((g) => g.category === 'bottoms')).toBe(false);
      expect(o.items.every((g) => g.gender !== 'men')).toBe(true);
    }
  });

  it('never mixes men’s-only and women’s-only pieces in one outfit', () => {
    for (const focus of ['all', 'men', 'women'] as const) {
      const out = generateOutfits(wardrobe, { genderFocus: focus, variety: 0.3 });
      expect(out.length).toBeGreaterThan(0);
      for (const o of out) {
        const g = new Set(o.items.map((i) => i.gender));
        expect(g.has('men') && g.has('women')).toBe(false);
      }
    }
  });

  it('stacks multiple layers in winter and respects the layer limit', () => {
    const winter = generateOutfits(wardrobe, { genderFocus: 'men', season: 'winter', occasion: 'business', formality: 3, layers: 4 });
    expect(winter.length).toBeGreaterThan(0);
    expect(Math.max(...winter.map((o) => layerCount(o.items)))).toBeGreaterThanOrEqual(3);
    const single = generateOutfits(wardrobe, { genderFocus: 'men', season: 'winter', layers: 1 });
    expect(single.every((o) => layerCount(o.items) === 1)).toBe(true);
    // layers are always ordered inner → outer and never duplicated
    for (const o of winter) {
      const slots = o.items.filter((g) => layerSlot(g) > 0).map(layerSlot);
      expect([...slots].sort()).toEqual(slots);
      expect(new Set(slots).size).toBe(slots.length);
    }
  });

  it('never uses laundry or archived pieces', () => {
    const tweaked = wardrobe.map((g, i) => (i % 3 === 0 ? { ...g, status: 'laundry' as const } : i % 5 === 0 ? { ...g, status: 'archived' as const } : g));
    const out = generateOutfits(tweaked, {});
    for (const o of out) expect(o.items.every((g) => g.status !== 'laundry' && g.status !== 'archived')).toBe(true);
  });

  it('keeps outfits varied', () => {
    const out = generateOutfits(wardrobe, { genderFocus: 'men', variety: 0.7 });
    expect(new Set(out.map((o) => o.id)).size).toBe(out.length);
    const ids = out.map((o) => o.items.map((g) => g.id));
    let tooSimilar = 0;
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) if (sharedRatio(ids[i], ids[j]) > 0.85) tooSimilar++;
    expect(tooSimilar).toBe(0);
  });

  it('builds around an anchor garment', () => {
    const blazer = byName(wardrobe, 'Navy blazer');
    const out = generateOutfits(wardrobe, { anchorIds: [blazer.id], genderFocus: 'men', occasion: 'business', formality: 3 });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((o) => o.items.some((g) => g.id === blazer.id))).toBe(true);
  });

  it('is deterministic for a seed', () => {
    const a = generateOutfits(wardrobe, { seed: 7, genderFocus: 'men' }).map((o) => o.id);
    const b = generateOutfits(wardrobe, { seed: 7, genderFocus: 'men' }).map((o) => o.id);
    expect(a).toEqual(b);
  });

  it('returns nothing when there is no way to dress', () => {
    expect(generateOutfits(wardrobe.filter((g) => g.category === 'shoes'), {})).toEqual([]);
  });
});

describe('scoring', () => {
  const prefsFormal = defaultPreferences({ occasion: 'formal', formality: 5 });
  it('prefers formal pieces for a formal occasion', () => {
    const formal = [byName(wardrobe, 'White dress shirt'), byName(wardrobe, 'Charcoal trousers'), byName(wardrobe, 'Black oxfords')];
    const casual = [byName(wardrobe, 'Black tee'), byName(wardrobe, 'Dark indigo jeans'), byName(wardrobe, 'White sneakers')].map((g) => ({ ...g, id: g.id + 'x' }));
    expect(scoreOutfit(formal, prefsFormal).total).toBeGreaterThan(scoreOutfit(casual, prefsFormal).total + 10);
  });
  it('penalises a tie without a dress shirt and hoodie under tailoring', () => {
    const prefs = defaultPreferences({ occasion: 'business', formality: 3 });
    const good = [byName(wardrobe, 'White dress shirt'), byName(wardrobe, 'Charcoal trousers'), byName(wardrobe, 'Brown loafers'), byName(wardrobe, 'Burgundy tie')];
    const bad = [byName(wardrobe, 'White tee'), byName(wardrobe, 'Charcoal trousers'), byName(wardrobe, 'Brown loafers'), byName(wardrobe, 'Burgundy tie')];
    expect(scoreOutfit(good, prefs).compatibility).toBeGreaterThan(scoreOutfit(bad, prefs).compatibility);
    const hoodie = { ...byName(wardrobe, 'Grey merino sweater'), subcategory: 'Hoodie', id: 'hood' };
    const stack = [byName(wardrobe, 'White tee'), hoodie, byName(wardrobe, 'Navy blazer')];
    const stack2 = [byName(wardrobe, 'White tee'), byName(wardrobe, 'Grey merino sweater'), byName(wardrobe, 'Navy blazer')];
    expect(scoreOutfit(stack, prefs).compatibility).toBeLessThan(scoreOutfit(stack2, prefs).compatibility);
  });
  it('re-scores and offers swaps', () => {
    const items = [byName(wardrobe, 'White dress shirt'), byName(wardrobe, 'Charcoal trousers'), byName(wardrobe, 'Black oxfords')];
    const r = rescoreOutfit(items, { occasion: 'formal', formality: 5 });
    expect(r.score.total).toBeGreaterThan(50);
    const swaps = swapCandidates(items, items[2].id, wardrobe, { genderFocus: 'men', occasion: 'formal', formality: 5 });
    expect(swaps.length).toBeGreaterThan(0);
    expect(swaps.every((s) => s.garment.category === 'shoes' && s.garment.id !== items[2].id)).toBe(true);
    expect(swaps[0].score.total).toBeGreaterThanOrEqual(swaps[swaps.length - 1].score.total);
  });
});
