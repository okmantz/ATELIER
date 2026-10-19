import { hexToRgb } from '../engine/color-harmony';

export interface NamedColor {
  name: string;
  hex: string;
}

export const NAMED_COLORS: NamedColor[] = [
  { name: 'Black', hex: '#141414' },
  { name: 'Charcoal', hex: '#3A3D42' },
  { name: 'Grey', hex: '#8A8D91' },
  { name: 'Silver', hex: '#C3C6CB' },
  { name: 'White', hex: '#F5F3EE' },
  { name: 'Cream', hex: '#EBE0C8' },
  { name: 'Beige', hex: '#D4BFA0' },
  { name: 'Camel', hex: '#B5864F' },
  { name: 'Tan', hex: '#A57C52' },
  { name: 'Brown', hex: '#6B4A32' },
  { name: 'Chocolate', hex: '#3E2B20' },
  { name: 'Navy', hex: '#1F2A44' },
  { name: 'Denim', hex: '#3E5C86' },
  { name: 'Sky', hex: '#9DB9D6' },
  { name: 'Teal', hex: '#2A7F7F' },
  { name: 'Forest', hex: '#2F4A3A' },
  { name: 'Olive', hex: '#6B6F3C' },
  { name: 'Sage', hex: '#A3B18A' },
  { name: 'Burgundy', hex: '#6F2638' },
  { name: 'Red', hex: '#B3262E' },
  { name: 'Rust', hex: '#B05A2C' },
  { name: 'Orange', hex: '#DD7A2B' },
  { name: 'Mustard', hex: '#D1A12E' },
  { name: 'Yellow', hex: '#EBD04B' },
  { name: 'Blush', hex: '#EBCBC6' },
  { name: 'Pink', hex: '#E08FA3' },
  { name: 'Lavender', hex: '#B9A7D6' },
  { name: 'Purple', hex: '#5E3F7E' },
  { name: 'Gold', hex: '#C9A24B' },
];

export function nearestColorName(hex: string): string {
  const c = hexToRgb(hex);
  let best = NAMED_COLORS[0];
  let bestD = Infinity;
  for (const n of NAMED_COLORS) {
    const r = hexToRgb(n.hex);
    const d = (c.r - r.r) ** 2 + (c.g - r.g) ** 2 + (c.b - r.b) ** 2;
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best.name;
}
