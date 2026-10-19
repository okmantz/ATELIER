import type { Gender, GarmentCategory, LayerSlot, Occasion, SeasonName } from '../types';

export interface SubDef {
  name: string;
  genders: Gender[];
  layer: LayerSlot;
  warmth: number;
  formality: number;
}

const ALL: Gender[] = ['men', 'women', 'unisex'];
const M: Gender[] = ['men', 'unisex'];
const W: Gender[] = ['women', 'unisex'];

const s = (name: string, genders: Gender[], layer: LayerSlot, warmth: number, formality: number): SubDef => ({
  name,
  genders,
  layer,
  warmth,
  formality,
});

export const SUBCATEGORIES: Record<GarmentCategory, SubDef[]> = {
  tops: [
    s('T-shirt', ALL, 1, 1, 1),
    s('Polo', ALL, 1, 1, 2),
    s('Dress shirt', ALL, 1, 1, 4),
    s('Oxford shirt', ALL, 1, 1, 3),
    s('Henley', M, 1, 2, 1),
    s('Long-sleeve tee', ALL, 1, 2, 1),
    s('Tank', ALL, 1, 1, 1),
    s('Blouse', W, 1, 1, 3),
    s('Camisole', W, 1, 1, 2),
    s('Bodysuit', W, 1, 1, 2),
    s('Crop top', W, 1, 1, 1),
    s('Turtleneck', ALL, 1, 3, 3),
    s('Sweater', ALL, 2, 3, 3),
    s('Cardigan', ALL, 2, 3, 3),
    s('Hoodie', ALL, 2, 3, 1),
    s('Sweatshirt', ALL, 2, 3, 1),
    s('Quarter-zip', ALL, 2, 3, 2),
    s('Waistcoat', ALL, 2, 2, 4),
    s('Fleece', ALL, 2, 4, 1),
  ],
  bottoms: [
    s('Jeans', ALL, 0, 2, 2),
    s('Chinos', ALL, 0, 2, 3),
    s('Dress trousers', ALL, 0, 2, 4),
    s('Wide-leg trousers', W, 0, 2, 4),
    s('Shorts', ALL, 0, 1, 1),
    s('Joggers', ALL, 0, 2, 1),
    s('Cargo pants', ALL, 0, 2, 1),
    s('Skirt', W, 0, 1, 3),
    s('Midi skirt', W, 0, 2, 3),
    s('Leggings', W, 0, 2, 1),
  ],
  outerwear: [
    s('Blazer', ALL, 3, 2, 4),
    s('Denim jacket', ALL, 3, 2, 2),
    s('Leather jacket', ALL, 3, 3, 2),
    s('Bomber', ALL, 3, 3, 2),
    s('Overshirt', ALL, 3, 2, 2),
    s('Trench coat', ALL, 4, 3, 4),
    s('Overcoat', ALL, 4, 4, 5),
    s('Wool coat', ALL, 4, 4, 4),
    s('Peacoat', ALL, 4, 4, 3),
    s('Puffer', ALL, 4, 5, 1),
    s('Parka', ALL, 4, 5, 1),
    s('Raincoat', ALL, 4, 3, 2),
  ],
  shoes: [
    s('Sneakers', ALL, 0, 0, 1),
    s('Loafers', ALL, 0, 0, 3),
    s('Oxfords', ALL, 0, 0, 5),
    s('Derbies', M, 0, 0, 4),
    s('Boots', ALL, 0, 0, 2),
    s('Chelsea boots', ALL, 0, 0, 4),
    s('Ankle boots', W, 0, 0, 3),
    s('Heels', W, 0, 0, 4),
    s('Pumps', W, 0, 0, 5),
    s('Flats', W, 0, 0, 3),
    s('Sandals', ALL, 0, 0, 1),
  ],
  accessories: [
    s('Belt', ALL, 0, 0, 3),
    s('Watch', ALL, 0, 0, 3),
    s('Scarf', ALL, 0, 2, 3),
    s('Hat', ALL, 0, 0, 2),
    s('Beanie', ALL, 0, 1, 1),
    s('Gloves', ALL, 0, 1, 3),
    s('Sunglasses', ALL, 0, 0, 2),
    s('Bag', ALL, 0, 0, 3),
    s('Tie', M, 0, 0, 5),
    s('Pocket square', M, 0, 0, 5),
    s('Necklace', W, 0, 0, 3),
    s('Earrings', W, 0, 0, 3),
    s('Bracelet', ALL, 0, 0, 3),
    s('Ring', ALL, 0, 0, 3),
  ],
  'one-piece': [
    s('Dress', W, 1, 2, 3),
    s('Jumpsuit', W, 1, 2, 3),
    s('Romper', W, 1, 1, 1),
    s('Gown', W, 1, 2, 5),
    s('Suit', ALL, 1, 3, 5),
  ],
};

export const CATEGORY_LABELS: Record<GarmentCategory, string> = {
  tops: 'Tops',
  bottoms: 'Bottoms',
  outerwear: 'Outerwear',
  shoes: 'Shoes',
  accessories: 'Accessories',
  'one-piece': 'One-piece',
};

export const CATEGORIES: GarmentCategory[] = ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories', 'one-piece'];

export const OCCASIONS: { id: Occasion; label: string; formality: number }[] = [
  { id: 'casual', label: 'Casual', formality: 2 },
  { id: 'business', label: 'Business / smart casual', formality: 3 },
  { id: 'formal', label: 'Formal', formality: 5 },
  { id: 'date', label: 'Date night', formality: 3 },
];

export const SEASONS: { id: SeasonName; label: string }[] = [
  { id: 'spring', label: 'Spring' },
  { id: 'summer', label: 'Summer' },
  { id: 'autumn', label: 'Autumn' },
  { id: 'winter', label: 'Winter' },
];

export const LAYER_LABELS: Record<number, string> = {
  0: '—',
  1: 'Base',
  2: 'Mid',
  3: 'Outer',
  4: 'Coat',
};

export const FORMALITY_LABELS = ['', 'Relaxed', 'Casual', 'Smart', 'Tailored', 'Formal'];

/** Which part of the body an accessory occupies. Used to avoid duplicates and to place it on the mannequin. */
export const ACCESSORY_ZONE: Record<string, string> = {
  Belt: 'waist',
  Watch: 'wrist',
  Bracelet: 'wrist',
  Scarf: 'neck',
  Necklace: 'neck',
  Tie: 'neck',
  'Pocket square': 'chest',
  Hat: 'head',
  Beanie: 'head',
  Sunglasses: 'face',
  Earrings: 'ears',
  Gloves: 'hands',
  Ring: 'hands',
  Bag: 'bag',
};

export function subOptions(category: GarmentCategory, gender: Gender): SubDef[] {
  const list = SUBCATEGORIES[category];
  if (gender === 'unisex') return list;
  return list.filter((d) => d.genders.includes(gender));
}

export function findSub(category: GarmentCategory, name: string): SubDef | undefined {
  return SUBCATEGORIES[category].find((d) => d.name === name);
}

export function defaultLayerFor(category: GarmentCategory, subcategory: string): LayerSlot {
  if (category === 'tops' || category === 'outerwear' || category === 'one-piece') {
    return findSub(category, subcategory)?.layer ?? (category === 'outerwear' ? 3 : 1);
  }
  return 0;
}

export function defaultSeasonsFor(warmth: number, category: GarmentCategory): SeasonName[] {
  if (category === 'shoes' || category === 'accessories') return ['spring', 'summer', 'autumn', 'winter'];
  if (warmth <= 1) return ['spring', 'summer', 'autumn'];
  if (warmth === 2) return ['spring', 'summer', 'autumn'];
  if (warmth === 3) return ['spring', 'autumn', 'winter'];
  return ['autumn', 'winter'];
}
