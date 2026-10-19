import type { Garment, Occasion, OutfitPreferences, Weights } from '../types';
import { OCCASIONS } from '../data/taxonomy';
import { classifyHarmony, outfitColorScore, type HarmonyLabel } from './color-harmony';
import { compatibilityScore, formalityOf, isCore, layerSlot, layeredItems } from './compatibility';

export const DEFAULT_WEIGHTS: Weights = {
  color: 30,
  occasion: 25,
  compatibility: 20,
  season: 10,
  preference: 10,
  underused: 5,
};

export function defaultPreferences(partial: Partial<OutfitPreferences> = {}): OutfitPreferences {
  return {
    occasion: 'casual',
    season: 'any',
    formality: 2,
    variety: 0.7,
    layers: 3,
    maxAccessories: 2,
    genderFocus: 'all',
    includeWorn: true,
    minScore: 40,
    limit: 30,
    anchorIds: [],
    excludeIds: [],
    seed: 1,
    ...partial,
    weights: { ...DEFAULT_WEIGHTS, ...(partial.weights ?? {}) },
  };
}

export function occasionFormality(o: Occasion): number {
  return OCCASIONS.find((x) => x.id === o)?.formality ?? 3;
}

export interface ScoreBreakdown {
  color: number; // each component 0..1
  occasion: number;
  compatibility: number;
  season: number;
  preference: number;
  underused: number;
  total: number; // 0..100
  harmony: HarmonyLabel;
  notes: string[];
}

const WARMTH_TARGET: Record<string, [number, number]> = {
  summer: [1, 3],
  spring: [3, 6],
  autumn: [5, 9],
  winter: [8, 14],
};

export function outfitWarmth(items: Garment[]): number {
  let w = 0;
  for (const g of items) {
    if (g.category === 'tops' || g.category === 'outerwear' || g.category === 'one-piece') w += g.warmth;
    else if (g.category === 'bottoms') w += g.warmth * 0.5;
    else if (g.category === 'accessories') w += g.warmth * 0.5;
  }
  return w;
}

const DAY = 86400000;

export function scoreOutfit(items: Garment[], prefs: OutfitPreferences, now = Date.now()): ScoreBreakdown {
  const core = items.filter(isCore);
  const layers = layeredItems(items);
  const outermost = layers[layers.length - 1];

  // --- colour -------------------------------------------------------------
  const color = outfitColorScore(
    items.map((g) => ({
      hex: g.primaryColor,
      weight: g.category === 'accessories' ? 0.4 : g === outermost ? 1.2 : g.category === 'shoes' ? 0.8 : 1,
    })),
  );

  // --- occasion & formality ------------------------------------------------
  const target = prefs.formality;
  const f = formalityOf(items);
  const formalityFit = Math.max(0, 1 - Math.abs(f - target) / 3);
  const tagged = core.length
    ? core.reduce((a, g) => a + (g.occasions.length === 0 ? 0.6 : g.occasions.includes(prefs.occasion) ? 1 : 0.2), 0) /
      core.length
    : 0.5;
  const occasion = 0.65 * formalityFit + 0.35 * tagged;

  // --- compatibility ---------------------------------------------------------
  const compat = compatibilityScore(items);

  // --- season ---------------------------------------------------------------
  let season = 0.85;
  if (prefs.season !== 'any') {
    const tag = core.length
      ? core.reduce((a, g) => a + (g.season.length === 0 || g.season.includes(prefs.season as never) ? 1 : 0.15), 0) /
        core.length
      : 1;
    const [lo, hi] = WARMTH_TARGET[prefs.season];
    const w = outfitWarmth(items);
    const dist = w < lo ? lo - w : w > hi ? w - hi : 0;
    season = 0.5 * tag + 0.5 * Math.max(0, 1 - dist / 4);
  }

  // --- personal preference ---------------------------------------------------
  const favRatio = core.length ? core.filter((g) => g.favorite).length / core.length : 0;
  const preference = 0.3 + 0.7 * Math.min(1, favRatio * 1.6);

  // --- under-used bonus --------------------------------------------------------
  const under = core.length
    ? core.reduce((a, g) => {
        const base = 1 / (1 + g.wearCount);
        const rested = g.lastWorn ? Math.min(1, (now - Date.parse(g.lastWorn)) / (30 * DAY)) : 1;
        return a + 0.6 * base + 0.4 * rested;
      }, 0) / core.length
    : 0;

  const w = prefs.weights;
  const sum = w.color + w.occasion + w.compatibility + w.season + w.preference + w.underused || 1;
  const total =
    ((w.color * color +
      w.occasion * occasion +
      w.compatibility * compat.score +
      w.season * season +
      w.preference * preference +
      w.underused * under) /
      sum) *
    100;

  return {
    color,
    occasion,
    compatibility: compat.score,
    season,
    preference,
    underused: under,
    total: Math.round(total * 10) / 10,
    harmony: classifyHarmony(items.map((g) => g.primaryColor)),
    notes: compat.notes,
  };
}

export { layerSlot };
