import type { Garment } from '../../types';

export type MannequinId = 'male-front' | 'female-front';

interface Box {
  cx: number;
  top: number;
  w: number;
  maxH: number;
}

export interface MannequinDef {
  id: MannequinId;
  label: string;
  gender: 'men' | 'women';
  src: string;
  torso: Box;
  bottoms: Box;
  shoes: Box;
  onePiece: Box;
  belt: { cx: number; cy: number; w: number };
  wrist: { cx: number; cy: number; w: number };
}

/** Landmarks in a 1000 × 1500 canvas, matching public/mannequins/*.svg. */
export const MANNEQUINS: Record<MannequinId, MannequinDef> = {
  'male-front': {
    id: 'male-front',
    label: 'Menswear form',
    gender: 'men',
    src: 'mannequins/male-front.svg',
    torso: { cx: 500, top: 282, w: 440, maxH: 500 },
    bottoms: { cx: 500, top: 630, w: 300, maxH: 740 },
    shoes: { cx: 500, top: 1352, w: 310, maxH: 120 },
    onePiece: { cx: 500, top: 282, w: 460, maxH: 1090 },
    belt: { cx: 500, cy: 650, w: 250 },
    wrist: { cx: 280, cy: 735, w: 70 },
  },
  'female-front': {
    id: 'female-front',
    label: 'Womenswear form',
    gender: 'women',
    src: 'mannequins/female-front.svg',
    torso: { cx: 500, top: 286, w: 390, maxH: 480 },
    bottoms: { cx: 500, top: 622, w: 300, maxH: 750 },
    shoes: { cx: 500, top: 1352, w: 300, maxH: 120 },
    onePiece: { cx: 500, top: 286, w: 420, maxH: 1090 },
    belt: { cx: 500, cy: 640, w: 210 },
    wrist: { cx: 300, cy: 730, w: 64 },
  },
};

export const mannequinUrl = (id: MannequinId) => `${import.meta.env.BASE_URL}${MANNEQUINS[id].src}`;

export const defaultMannequinFor = (garments: Garment[]): MannequinId => {
  const women = garments.filter((g) => g.gender === 'women').length;
  const men = garments.filter((g) => g.gender === 'men').length;
  return women > men ? 'female-front' : 'male-front';
};

export interface Spot {
  cx: number;
  cy: number;
  w: number;
  maxH: number;
}

/** Where an accessory sits on the body. */
export function accessorySpot(g: Garment, m: MannequinDef): Spot {
  switch (g.subcategory) {
    case 'Hat':
    case 'Beanie':
      return { cx: 500, cy: 112, w: 210, maxH: 110 };
    case 'Sunglasses':
      return { cx: 500, cy: 172, w: 130, maxH: 60 };
    case 'Earrings':
      return { cx: 500, cy: 205, w: 120, maxH: 80 };
    case 'Scarf':
      return { cx: 500, cy: 345, w: 190, maxH: 280 };
    case 'Necklace':
      return { cx: 500, cy: 335, w: 150, maxH: 140 };
    case 'Tie':
      return { cx: 500, cy: 470, w: 80, maxH: 330 };
    case 'Pocket square':
      return { cx: 572, cy: 430, w: 46, maxH: 46 };
    case 'Belt':
      return { cx: m.belt.cx, cy: m.belt.cy, w: m.belt.w, maxH: 70 };
    case 'Watch':
    case 'Bracelet':
      return { cx: m.wrist.cx, cy: m.wrist.cy, w: m.wrist.w, maxH: 110 };
    case 'Gloves':
    case 'Ring':
      return { cx: m.wrist.cx - 12, cy: m.wrist.cy + 80, w: 90, maxH: 130 };
    case 'Bag':
      return { cx: 770, cy: 800, w: 210, maxH: 240 };
    default:
      return { cx: 800, cy: 500, w: 130, maxH: 130 };
  }
}
