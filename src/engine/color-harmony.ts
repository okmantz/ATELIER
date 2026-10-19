export interface RGB {
  r: number;
  g: number;
  b: number;
}
export interface HSL {
  h: number; // 0..360
  s: number; // 0..1
  l: number; // 0..1
}

export type ColorFamily =
  | 'black'
  | 'white'
  | 'grey'
  | 'earth'
  | 'navy'
  | 'blue'
  | 'green'
  | 'red'
  | 'pink'
  | 'yellow'
  | 'orange'
  | 'purple';

export const COLOR_FAMILIES: { id: ColorFamily; label: string; swatch: string }[] = [
  { id: 'black', label: 'Black', swatch: '#141414' },
  { id: 'white', label: 'White', swatch: '#F5F3EE' },
  { id: 'grey', label: 'Grey', swatch: '#8A8D91' },
  { id: 'earth', label: 'Earth', swatch: '#A57C52' },
  { id: 'navy', label: 'Navy', swatch: '#1F2A44' },
  { id: 'blue', label: 'Blue', swatch: '#3E5C86' },
  { id: 'green', label: 'Green', swatch: '#4C7050' },
  { id: 'red', label: 'Red', swatch: '#8E2433' },
  { id: 'pink', label: 'Pink', swatch: '#E08FA3' },
  { id: 'orange', label: 'Orange', swatch: '#DD7A2B' },
  { id: 'yellow', label: 'Yellow', swatch: '#E0BE3A' },
  { id: 'purple', label: 'Purple', swatch: '#5E3F7E' },
];

export function hexToRgb(hex: string): RGB {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 || Number.isNaN(parseInt(h, 16))) return { r: 128, g: 128, b: 128 };
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: h * 60, s, l };
}

export const hexToHsl = (hex: string): HSL => rgbToHsl(hexToRgb(hex));

export function colorFamily(hex: string): ColorFamily {
  const { h, s, l } = hexToHsl(hex);
  if (l < 0.13) return 'black';
  if (l > 0.92) return 'white';
  if (s < 0.12) return l < 0.22 ? 'black' : l > 0.84 ? 'white' : 'grey';
  // earth tones: beige, camel, tan, brown, olive, cream
  if (h >= 15 && h < 52 && s < 0.62) return l > 0.8 ? 'white' : 'earth';
  if (h >= 52 && h < 85 && s < 0.5 && l < 0.5) return 'earth'; // olive / khaki
  if (h >= 200 && h < 262 && l < 0.3) return 'navy';
  if (h >= 345 || h < 15) return l > 0.74 ? 'pink' : 'red';
  if (h < 42) return 'orange';
  if (h < 70) return 'yellow';
  if (h < 200) return 'green';
  if (h < 262) return 'blue';
  if (h < 320) return 'purple';
  return 'pink';
}

const NEUTRAL: ColorFamily[] = ['black', 'white', 'grey', 'earth', 'navy'];
export const isNeutral = (hex: string): boolean => NEUTRAL.includes(colorFamily(hex));

export function hueDistance(h1: number, h2: number): number {
  const d = Math.abs(h1 - h2) % 360;
  return d > 180 ? 360 - d : d;
}

/** How well two colours sit together, 0..1. Deterministic colour-wheel rules, no AI. */
export function pairScore(a: string, b: string): number {
  const fa = colorFamily(a);
  const fb = colorFamily(b);
  const na = NEUTRAL.includes(fa);
  const nb = NEUTRAL.includes(fb);
  const A = hexToHsl(a);
  const B = hexToHsl(b);

  if (na && nb) {
    const pair = [fa, fb].sort().join('+');
    if (pair === 'black+navy') return 0.62; // the classic near-clash
    if (pair === 'black+earth') return (A.l < 0.35 && fa === 'earth') || (B.l < 0.35 && fb === 'earth') ? 0.6 : 0.88;
    if (pair === 'earth+navy') return 0.98;
    if (pair === 'earth+white') return 0.96;
    if (pair === 'grey+navy' || pair === 'grey+white' || pair === 'black+white' || pair === 'black+grey') return 0.95;
    return 0.9;
  }
  if (na || nb) {
    const c = na ? B : A;
    return c.s < 0.5 ? 0.95 : 0.9; // a neutral carries any colour; softer colours blend most easily
  }
  const d = hueDistance(A.h, B.h);
  const sat = Math.min(A.s, B.s);
  if (d <= 15) return 0.9; // monochromatic / tonal
  if (d <= 45) return 0.84; // analogous
  if (d >= 150) return sat > 0.6 ? 0.6 : 0.78; // complementary (loud when both saturated)
  if (d >= 100 && d <= 140) return sat > 0.55 ? 0.5 : 0.62; // triadic
  return 0.42;
}

export interface ColorInput {
  hex: string;
  weight: number;
}

export type HarmonyLabel = 'Neutral base' | 'Neutral with an accent' | 'Tonal' | 'Analogous' | 'Complementary' | 'Bold mix';

export function classifyHarmony(colors: string[]): HarmonyLabel {
  const chromatic = colors.filter((c) => !isNeutral(c));
  if (chromatic.length === 0) return 'Neutral base';
  const fams = new Set(chromatic.map(colorFamily));
  if (fams.size === 1) return colors.length - chromatic.length > 0 ? 'Neutral with an accent' : 'Tonal';
  if (fams.size === 2) {
    const [x, y] = chromatic.map((c) => hexToHsl(c).h);
    const d = hueDistance(x, y);
    if (d <= 45) return 'Analogous';
    if (d >= 150) return 'Complementary';
  }
  return 'Bold mix';
}

/** Overall colour harmony of an outfit, 0..1. */
export function outfitColorScore(colors: ColorInput[]): number {
  if (colors.length === 0) return 0.5;
  if (colors.length === 1) return 0.85;
  let num = 0;
  let den = 0;
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const w = colors[i].weight * colors[j].weight;
      num += pairScore(colors[i].hex, colors[j].hex) * w;
      den += w;
    }
  }
  let score = den ? num / den : 0.7;
  const chromatic = colors.filter((c) => !isNeutral(c.hex));
  const families = new Set(chromatic.map((c) => colorFamily(c.hex)));
  if (chromatic.length === 0) score += 0.04; // calm neutral palette
  else if (families.size === 1 && chromatic.length < colors.length) score += 0.06; // single accent against neutrals
  else if (families.size >= 3) score -= 0.14 * (families.size - 2);
  return Math.max(0, Math.min(1, score));
}
