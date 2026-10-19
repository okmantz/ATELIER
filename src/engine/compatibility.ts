import type { Garment } from '../types';
import { colorFamily, hexToHsl, isNeutral } from './color-harmony';

const LOUD = new Set(['striped', 'checked', 'floral', 'graphic']);

export const isCore = (g: Garment) => g.category !== 'accessories';

export function layerSlot(g: Garment): number {
  if (g.category === 'tops' || g.category === 'outerwear' || g.category === 'one-piece') return g.layer || 1;
  return 0;
}

export function layeredItems(items: Garment[]): Garment[] {
  return items.filter((g) => layerSlot(g) > 0).sort((a, b) => layerSlot(a) - layerSlot(b));
}

export function patternScore(items: Garment[]): number {
  const loud = items.filter((g) => isCore(g) && g.category !== 'shoes' && LOUD.has(g.pattern));
  if (loud.length <= 1) return loud.length === 0 ? 1 : 0.95;
  const kinds = new Set(loud.map((g) => g.pattern));
  if (loud.length === 2) return kinds.size === 1 ? 0.7 : 0.55;
  return 0.3;
}

export function formalityOf(items: Garment[]): number {
  const core = items.filter((g) => isCore(g));
  if (!core.length) return 3;
  return core.reduce((a, g) => a + g.formality, 0) / core.length;
}

export function formalityCoherence(items: Garment[]): number {
  const core = items.filter((g) => isCore(g));
  if (core.length < 2) return 1;
  const f = core.map((g) => g.formality);
  const spread = Math.max(...f) - Math.min(...f);
  if (spread <= 1) return 1;
  if (spread === 2) return 0.78;
  if (spread === 3) return 0.42;
  return 0.12;
}

const DRESS_SHOES = ['Oxfords', 'Derbies', 'Pumps', 'Heels'];
const CASUAL_BOTTOMS = ['Shorts', 'Joggers', 'Cargo pants'];
const SMART_OUTER = ['Blazer', 'Overcoat', 'Peacoat', 'Wool coat', 'Trench coat'];
const CASUAL_MID = ['Hoodie', 'Sweatshirt', 'Fleece'];

/** Small hand-written styling rules. Each returns a penalty 0..1 and a note. */
export function ruleScore(items: Garment[]): { score: number; notes: string[] } {
  const sub = (cat: Garment['category']) => items.filter((g) => g.category === cat).map((g) => g.subcategory);
  const shoes = sub('shoes');
  const bottoms = sub('bottoms');
  const outer = items.filter((g) => layerSlot(g) >= 3 && g.category === 'outerwear').map((g) => g.subcategory);
  const mids = items.filter((g) => layerSlot(g) === 2).map((g) => g.subcategory);
  const bases = items.filter((g) => layerSlot(g) === 1).map((g) => g.subcategory);
  const acc = sub('accessories');
  let penalty = 0;
  const notes: string[] = [];
  const hit = (p: number, note: string) => {
    penalty += p;
    notes.push(note);
  };

  if (shoes.some((s) => DRESS_SHOES.includes(s)) && bottoms.some((b) => CASUAL_BOTTOMS.includes(b)))
    hit(0.45, 'Dress shoes with casual bottoms');
  if (acc.includes('Tie') && !bases.includes('Dress shirt')) hit(0.5, 'A tie needs a dress shirt');
  if (mids.some((m) => CASUAL_MID.includes(m)) && outer.some((o) => SMART_OUTER.includes(o)))
    hit(0.5, 'Hoodie layers poorly under tailoring');
  if (bottoms.includes('Shorts') && outer.some((o) => ['Overcoat', 'Wool coat', 'Peacoat', 'Blazer'].includes(o)))
    hit(0.4, 'Shorts with heavy tailoring');
  if (shoes.includes('Sandals') && items.some((g) => g.formality >= 5 && isCore(g) && g.category !== 'shoes'))
    hit(0.4, 'Sandals are too relaxed for this formality');
  if (acc.includes('Scarf') && items.some((g) => g.category === 'bottoms' && g.subcategory === 'Shorts'))
    hit(0.35, 'Scarf with shorts');
  return { score: Math.max(0, 1 - penalty), notes };
}

/** Do stacked layers read well together? Contrast, warmth order. */
export function layeringScore(items: Garment[]): { score: number; notes: string[] } {
  const stack = layeredItems(items);
  if (stack.length <= 1) return { score: 1, notes: [] };
  const notes: string[] = [];
  const parts: number[] = [];
  for (let i = 0; i < stack.length - 1; i++) {
    const inner = stack[i];
    const outer = stack[i + 1];
    const a = hexToHsl(inner.primaryColor);
    const b = hexToHsl(outer.primaryColor);
    const dl = Math.abs(a.l - b.l);
    const sameFamily = colorFamily(inner.primaryColor) === colorFamily(outer.primaryColor);
    let p = 0.85;
    if (sameFamily && dl < 0.07 && Math.max(a.l, b.l) > 0.3) {
      p = 0.5;
      notes.push('Layers blend together — add contrast');
    } else if (dl >= 0.15) p = 1;
    else if (isNeutral(inner.primaryColor) && isNeutral(outer.primaryColor)) p = 0.94;
    if (inner.warmth > outer.warmth + 1) {
      p -= 0.3;
      notes.push('Bulkier layer under a lighter one');
    }
    parts.push(Math.max(0, p));
  }
  return { score: parts.reduce((x, y) => x + y, 0) / parts.length, notes };
}

export function compatibilityScore(items: Garment[]): { score: number; notes: string[] } {
  const rules = ruleScore(items);
  const layers = layeringScore(items);
  const score =
    0.3 * formalityCoherence(items) + 0.2 * patternScore(items) + 0.25 * rules.score + 0.25 * layers.score;
  return { score, notes: [...rules.notes, ...layers.notes] };
}
