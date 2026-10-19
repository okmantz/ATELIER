import type { GarmentCategory, GarmentFields, Gender, Occasion, Pattern, SeasonName } from '../types';
import { defaultLayerFor, findSub } from '../data/taxonomy';
import { addGarment } from '../storage/garments';
import { encodeCanvas, makeThumbnail } from '../imaging/image-resize';
import { trimToContent } from '../imaging/image-import';
import { renderSilhouette, SHAPE_FOR_SUB } from './silhouettes';

type P = SeasonName;
const ALL4: P[] = ['spring', 'summer', 'autumn', 'winter'];
const WARM: P[] = ['autumn', 'winter'];
const MILD: P[] = ['spring', 'autumn'];
const HOT: P[] = ['spring', 'summer'];

interface Sample {
  n: string;
  g: Gender;
  c: GarmentCategory;
  s: string;
  hex: string;
  oc: Occasion[];
  se?: P[];
  p?: Pattern;
  f?: number;
  fav?: boolean;
  brand?: string;
}

const C: Occasion = 'casual';
const B: Occasion = 'business';
const F: Occasion = 'formal';
const D: Occasion = 'date';

export const SAMPLES: Sample[] = [
  // ---- menswear
  { n: 'White tee', g: 'men', c: 'tops', s: 'T-shirt', hex: '#F2EFE8', oc: [C, D], se: HOT.concat('autumn') },
  { n: 'Black tee', g: 'men', c: 'tops', s: 'T-shirt', hex: '#1A1A1A', oc: [C, D] },
  { n: 'Navy polo', g: 'men', c: 'tops', s: 'Polo', hex: '#22304F', oc: [C, B], se: HOT },
  { n: 'White dress shirt', g: 'men', c: 'tops', s: 'Dress shirt', hex: '#F6F4EF', oc: [B, F, D], fav: true },
  { n: 'Light blue Oxford', g: 'men', c: 'tops', s: 'Oxford shirt', hex: '#A9C1DB', oc: [B, C], se: MILD.concat('summer') },
  { n: 'Grey merino sweater', g: 'men', c: 'tops', s: 'Sweater', hex: '#8B8E93', oc: [C, B, D], se: WARM, fav: true },
  { n: 'Camel cardigan', g: 'men', c: 'tops', s: 'Cardigan', hex: '#B5864F', oc: [C, B], se: WARM },
  { n: 'Charcoal turtleneck', g: 'men', c: 'tops', s: 'Turtleneck', hex: '#3A3D42', oc: [B, D, F], se: WARM },
  { n: 'Navy blazer', g: 'men', c: 'outerwear', s: 'Blazer', hex: '#1F2A44', oc: [B, F, D], se: ALL4, fav: true },
  { n: 'Camel overcoat', g: 'men', c: 'outerwear', s: 'Overcoat', hex: '#B08A5B', oc: [B, F, D, C], se: WARM },
  { n: 'Olive field jacket', g: 'men', c: 'outerwear', s: 'Overshirt', hex: '#6B6F3C', oc: [C], se: MILD },
  { n: 'Black leather jacket', g: 'men', c: 'outerwear', s: 'Leather jacket', hex: '#1C1C1C', oc: [C, D], se: MILD },
  { n: 'Dark indigo jeans', g: 'men', c: 'bottoms', s: 'Jeans', hex: '#232F4A', oc: [C, D, B] },
  { n: 'Stone chinos', g: 'men', c: 'bottoms', s: 'Chinos', hex: '#CDB99A', oc: [C, B], fav: true },
  { n: 'Charcoal trousers', g: 'men', c: 'bottoms', s: 'Dress trousers', hex: '#3C3F44', oc: [B, F, D] },
  { n: 'Khaki shorts', g: 'men', c: 'bottoms', s: 'Shorts', hex: '#C2AD86', oc: [C], se: HOT },
  { n: 'White sneakers', g: 'men', c: 'shoes', s: 'Sneakers', hex: '#F1EFEA', oc: [C, D, B] },
  { n: 'Brown loafers', g: 'men', c: 'shoes', s: 'Loafers', hex: '#5A3B27', oc: [B, D, C] },
  { n: 'Black oxfords', g: 'men', c: 'shoes', s: 'Oxfords', hex: '#161616', oc: [F, B] },
  { n: 'Tan Chelsea boots', g: 'men', c: 'shoes', s: 'Chelsea boots', hex: '#9A6B3E', oc: [C, B, D], se: MILD.concat('winter') },
  { n: 'Steel watch', g: 'men', c: 'accessories', s: 'Watch', hex: '#B9BDC2', oc: [C, B, F, D] },
  { n: 'Brown leather belt', g: 'men', c: 'accessories', s: 'Belt', hex: '#5A3B27', oc: [C, B, D] },
  { n: 'Burgundy tie', g: 'men', c: 'accessories', s: 'Tie', hex: '#6F2638', oc: [B, F] },
  { n: 'Grey wool scarf', g: 'men', c: 'accessories', s: 'Scarf', hex: '#8B8E93', oc: [C, B, D], se: WARM },
  // ---- womenswear
  { n: 'Ivory silk blouse', g: 'women', c: 'tops', s: 'Blouse', hex: '#F1E9DA', oc: [B, D, F], fav: true },
  { n: 'Black camisole', g: 'women', c: 'tops', s: 'Camisole', hex: '#1A1A1A', oc: [D, B, F], se: HOT.concat('autumn') },
  { n: 'Striped boat-neck tee', g: 'women', c: 'tops', s: 'Long-sleeve tee', hex: '#E8E3D8', oc: [C], p: 'striped', se: MILD },
  { n: 'Cream knit sweater', g: 'women', c: 'tops', s: 'Sweater', hex: '#E5D9C2', oc: [C, B, D], se: WARM },
  { n: 'Blush cardigan', g: 'women', c: 'tops', s: 'Cardigan', hex: '#EBCBC6', oc: [C, B, D], se: MILD },
  { n: 'Black blazer', g: 'women', c: 'outerwear', s: 'Blazer', hex: '#1B1B1D', oc: [B, F, D], fav: true },
  { n: 'Beige trench coat', g: 'women', c: 'outerwear', s: 'Trench coat', hex: '#CDB38F', oc: [B, C, D], se: MILD },
  { n: 'Wool coat in oxblood', g: 'women', c: 'outerwear', s: 'Wool coat', hex: '#6F2638', oc: [B, D, F, C], se: WARM },
  { n: 'High-rise jeans', g: 'women', c: 'bottoms', s: 'Jeans', hex: '#3E5C86', oc: [C, D] },
  { n: 'Wide-leg trousers', g: 'women', c: 'bottoms', s: 'Wide-leg trousers', hex: '#2B2B30', oc: [B, F, D] },
  { n: 'Camel midi skirt', g: 'women', c: 'bottoms', s: 'Midi skirt', hex: '#B5864F', oc: [B, D, C], se: MILD.concat('winter') },
  { n: 'Little black dress', g: 'women', c: 'one-piece', s: 'Dress', hex: '#18181A', oc: [D, F, B], fav: true },
  { n: 'Sage midi dress', g: 'women', c: 'one-piece', s: 'Dress', hex: '#A3B18A', oc: [C, D], se: HOT },
  { n: 'White sneakers', g: 'women', c: 'shoes', s: 'Sneakers', hex: '#F4F2EE', oc: [C, D] },
  { n: 'Black pumps', g: 'women', c: 'shoes', s: 'Pumps', hex: '#161616', oc: [F, B, D] },
  { n: 'Nude flats', g: 'women', c: 'shoes', s: 'Flats', hex: '#D9BBA0', oc: [B, C, D] },
  { n: 'Chocolate ankle boots', g: 'women', c: 'shoes', s: 'Ankle boots', hex: '#3E2B20', oc: [C, B, D], se: MILD.concat('winter') },
  { n: 'Gold necklace', g: 'women', c: 'accessories', s: 'Necklace', hex: '#C9A24B', oc: [B, D, F, C] },
  { n: 'Structured tote', g: 'women', c: 'accessories', s: 'Bag', hex: '#6B4A32', oc: [B, C] },
  { n: 'Silk scarf', g: 'women', c: 'accessories', s: 'Scarf', hex: '#6F2638', oc: [B, D, C], se: MILD.concat('winter') },
];

export async function loadSampleWardrobe(onProgress?: (done: number, total: number) => void): Promise<number> {
  let done = 0;
  for (const s of SAMPLES) {
    const sub = findSub(s.c, s.s);
    const warmth = sub?.warmth ?? 1;
    const fields: GarmentFields = {
      name: s.n,
      gender: s.g,
      category: s.c,
      subcategory: s.s,
      layer: defaultLayerFor(s.c, s.s),
      warmth,
      primaryColor: s.hex,
      secondaryColors: [],
      pattern: s.p ?? 'solid',
      season: s.se ?? ALL4,
      occasions: s.oc,
      formality: sub?.formality ?? 3,
      brand: 'Sample',
      status: 'clean',
      favorite: !!s.fav,
      sample: true,
    };
    const canvas = trimToContent(
      renderSilhouette(SHAPE_FOR_SUB[s.s] ?? 'tee', s.hex, s.p === 'striped' ? 'striped' : s.p === 'checked' ? 'checked' : 'solid'),
      14,
    );
    const full = await encodeCanvas(canvas, true);
    const thumb = await makeThumbnail(canvas, 360);
    await addGarment({ fields, full, thumb, hasAlpha: true });
    onProgress?.(++done, SAMPLES.length);
  }
  return SAMPLES.length;
}
