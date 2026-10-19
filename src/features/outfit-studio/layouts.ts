import type { Garment, OutfitScene, SceneItem, SceneMode } from '../../types';
import { layerSlot } from '../../engine/compatibility';
import { uid, nowIso } from '../../storage/database';
import { accessorySpot, defaultMannequinFor, MANNEQUINS, type MannequinId } from '../mannequin-studio/mannequins';

export const CANVAS_W = 1000;
export const MANNEQUIN_H = 1500;
export const RATIOS = { '4:5': 1250, '1:1': 1000, '3:4': 1333, '9:16': 1778 } as const;
export type RatioId = keyof typeof RATIOS;
export type FlatPreset = 'classic' | 'editorial' | 'compact' | 'weekend';

export const FLAT_PRESETS: { id: FlatPreset; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'compact', label: 'Compact' },
  { id: 'weekend', label: 'Weekend' },
];

export const BACKGROUNDS = ['#F4F0E8', '#EAE3D5', '#D8C7AB', '#CFC6B6', '#D9DDDF', '#CBD3C0', '#E9D3CF', '#2B2A27', '#171715', '#6F2638'];

export const sceneHeight = (s: Pick<OutfitScene, 'mode' | 'ratio'>): number =>
  s.mode === 'mannequin' ? MANNEQUIN_H : RATIOS[s.ratio as RatioId] ?? RATIOS['4:5'];

const aspect = (g: Garment) => (g.imageWidth || 4) / (g.imageHeight || 5);

function fit(g: Garment, boxW: number, boxH: number): { w: number; h: number } {
  const a = aspect(g);
  const w = Math.min(boxW, boxH * a);
  return { w, h: w / a };
}

const item = (g: Garment, cx: number, cy: number, w: number, h: number, rotation: number, zIndex: number, extra: Partial<SceneItem> = {}): SceneItem => ({
  garmentId: g.id,
  x: cx,
  y: cy,
  width: w,
  height: h,
  rotation,
  zIndex,
  opacity: 1,
  ...extra,
});

interface Box { cx: number; top: number; w: number; h: number; rot: number }
interface FlatParams {
  torso: Box;
  grow: number;
  step: number;
  bottom: Box;
  shoes: Box;
  one: Box;
  acc: { x: number; y: number; s: number; rot: number }[];
}

const column = (x: number, y0: number, dy: number, s: number, rot = 0) => Array.from({ length: 6 }, (_, i) => ({ x, y: y0 + i * dy, s, rot }));

const FLAT: Record<FlatPreset, FlatParams> = {
  classic: {
    torso: { cx: 470, top: 70, w: 520, h: 520, rot: 0 },
    grow: 0.06,
    step: 24,
    bottom: { cx: 470, top: 610, w: 330, h: 420, rot: 0 },
    shoes: { cx: 470, top: 1060, w: 320, h: 120, rot: 0 },
    one: { cx: 470, top: 80, w: 480, h: 1050, rot: 0 },
    acc: column(870, 150, 200, 150),
  },
  editorial: {
    torso: { cx: 380, top: 70, w: 500, h: 560, rot: -3 },
    grow: 0.05,
    step: 30,
    bottom: { cx: 650, top: 560, w: 340, h: 520, rot: 2.5 },
    shoes: { cx: 330, top: 1040, w: 300, h: 150, rot: -5 },
    one: { cx: 480, top: 80, w: 460, h: 1000, rot: -2 },
    acc: [
      { x: 820, y: 140, s: 140, rot: 6 },
      { x: 200, y: 740, s: 130, rot: -8 },
      { x: 860, y: 1040, s: 150, rot: 4 },
      { x: 150, y: 1000, s: 120, rot: -4 },
      { x: 880, y: 330, s: 110, rot: 5 },
      { x: 120, y: 520, s: 110, rot: -6 },
    ],
  },
  compact: {
    torso: { cx: 500, top: 150, w: 440, h: 430, rot: 0 },
    grow: 0.06,
    step: 20,
    bottom: { cx: 500, top: 640, w: 290, h: 380, rot: 0 },
    shoes: { cx: 500, top: 1050, w: 270, h: 110, rot: 0 },
    one: { cx: 500, top: 140, w: 420, h: 880, rot: 0 },
    acc: column(810, 200, 170, 120),
  },
  weekend: {
    torso: { cx: 340, top: 90, w: 470, h: 500, rot: -5 },
    grow: 0.05,
    step: 26,
    bottom: { cx: 680, top: 330, w: 340, h: 520, rot: 4 },
    shoes: { cx: 600, top: 960, w: 290, h: 140, rot: -3 },
    one: { cx: 480, top: 90, w: 470, h: 1000, rot: -3 },
    acc: [
      { x: 200, y: 820, s: 140, rot: -6 },
      { x: 300, y: 1040, s: 130, rot: 5 },
      { x: 880, y: 980, s: 140, rot: 8 },
      { x: 850, y: 130, s: 130, rot: -4 },
      { x: 130, y: 1120, s: 110, rot: 3 },
      { x: 900, y: 1130, s: 110, rot: -5 },
    ],
  },
};

const bySlot = (a: Garment, b: Garment) => layerSlot(a) - layerSlot(b);

/** Target drop length (in mannequin units) for bottoms that don't run to the ankle. */
const BOTTOM_LENGTH: Record<string, number> = { Shorts: 330, Skirt: 400, 'Midi skirt': 640 };

export function layoutFlatlay(garments: Garment[], preset: FlatPreset, ratio: RatioId): SceneItem[] {
  const P = FLAT[preset];
  const H = RATIOS[ratio];
  const out: SceneItem[] = [];
  const one = garments.find((g) => g.category === 'one-piece');
  const layers = garments.filter((g) => g.category !== 'one-piece' && layerSlot(g) > 0).sort(bySlot);
  const bottoms = garments.find((g) => g.category === 'bottoms');
  const shoes = garments.find((g) => g.category === 'shoes');
  const accessories = garments.filter((g) => g.category === 'accessories');

  if (one) {
    const f = fit(one, P.one.w, P.one.h);
    out.push(item(one, P.one.cx, P.one.top + f.h / 2, f.w, f.h, P.one.rot, 30));
  }
  const hasInner = (i: number) => i > 0 || !!one;
  layers.forEach((g, i) => {
    const slot = layerSlot(g);
    const f = fit(g, P.torso.w * (1 + P.grow * i), P.torso.h * (1 + 0.04 * i));
    const top = (one ? P.one.top : P.torso.top) + i * P.step;
    out.push(item(g, P.torso.cx, top + f.h / 2, f.w, f.h, P.torso.rot, 30 + slot * 10, { open: slot >= 3 && hasInner(i) }));
  });
  if (bottoms) {
    const f = fit(bottoms, P.bottom.w, P.bottom.h);
    out.push(item(bottoms, P.bottom.cx, P.bottom.top + f.h / 2, f.w, f.h, P.bottom.rot, 20));
  }
  if (shoes) {
    const f = fit(shoes, P.shoes.w, P.shoes.h);
    out.push(item(shoes, P.shoes.cx, P.shoes.top + f.h / 2, f.w, f.h, P.shoes.rot, 20));
  }
  accessories.forEach((g, i) => {
    const spot = P.acc[Math.min(i, P.acc.length - 1)];
    const f = fit(g, spot.s, spot.s);
    out.push(item(g, spot.x, spot.y, f.w, f.h, spot.rot, 100 + i));
  });

  // Fit the 1000×1250 reference frame into the chosen canvas.
  const s = Math.min(1, H / 1250);
  const ox = 500 - 500 * s;
  const oy = (H - 1250 * s) / 2;
  return out.map((it) => ({ ...it, x: ox + it.x * s, y: oy + it.y * s, width: it.width * s, height: it.height * s }));
}

export function layoutMannequin(garments: Garment[], id: MannequinId): SceneItem[] {
  const M = MANNEQUINS[id];
  const out: SceneItem[] = [];
  const one = garments.find((g) => g.category === 'one-piece');
  const layers = garments.filter((g) => g.category !== 'one-piece' && layerSlot(g) > 0).sort(bySlot);
  const bottoms = garments.find((g) => g.category === 'bottoms');
  const shoes = garments.find((g) => g.category === 'shoes');
  const accessories = garments.filter((g) => g.category === 'accessories');

  if (one) {
    const f = fit(one, M.onePiece.w, M.onePiece.maxH);
    out.push(item(one, M.onePiece.cx, M.onePiece.top + f.h / 2, f.w, f.h, 0, 30));
  }
  layers.forEach((g, i) => {
    const slot = layerSlot(g);
    const f = fit(g, M.torso.w * (1 + 0.065 * i), M.torso.maxH + 70 * i);
    const top = M.torso.top - 5 * i;
    out.push(item(g, M.torso.cx, top + f.h / 2, f.w, f.h, 0, 30 + slot * 10, { open: slot >= 3 && (i > 0 || !!one) }));
  });
  if (bottoms) {
    // Trousers should reach the ankle; shorts and skirts stop shorter.
    const len = BOTTOM_LENGTH[bottoms.subcategory] ?? M.bottoms.maxH;
    const f = fit(bottoms, M.bottoms.w + 80, Math.min(len, M.bottoms.maxH));
    out.push(item(bottoms, M.bottoms.cx, M.bottoms.top + f.h / 2, f.w, f.h, 0, 20));
  }
  if (shoes) {
    const f = fit(shoes, M.shoes.w, M.shoes.maxH);
    out.push(item(shoes, M.shoes.cx, M.shoes.top + f.h / 2, f.w, f.h, 0, 15));
  }
  accessories.forEach((g, i) => {
    const sp = accessorySpot(g, M);
    const f = fit(g, sp.w, sp.maxH);
    out.push(item(g, sp.cx, sp.cy, f.w, f.h, 0, 100 + i));
  });
  return out;
}

export function nameFor(garments: Garment[]): string {
  const main = garments.find((g) => g.category === 'one-piece') ?? [...garments].filter((g) => g.category === 'outerwear' || g.category === 'tops').sort((a, b) => b.layer - a.layer)[0];
  return main ? `${main.name} look` : 'New composition';
}

export interface SceneOptions {
  mode: SceneMode;
  templateId?: string;
  ratio?: RatioId;
  background?: string;
  name?: string;
}

export function buildScene(garments: Garment[], o: SceneOptions): OutfitScene {
  const t = nowIso();
  if (o.mode === 'mannequin') {
    const mid = (o.templateId as MannequinId) || defaultMannequinFor(garments);
    return {
      id: uid(),
      name: o.name ?? nameFor(garments),
      mode: 'mannequin',
      templateId: mid,
      ratio: '2:3',
      background: o.background ?? '#EAE3D5',
      items: layoutMannequin(garments, mid),
      createdAt: t,
      updatedAt: t,
    };
  }
  const preset = (o.templateId as FlatPreset) || 'classic';
  const ratio = o.ratio ?? '4:5';
  return {
    id: uid(),
    name: o.name ?? nameFor(garments),
    mode: 'flatlay',
    templateId: preset,
    ratio,
    background: o.background ?? '#F4F0E8',
    items: layoutFlatlay(garments, preset, ratio),
    createdAt: t,
    updatedAt: t,
  };
}

/** Re-run the automatic layout for the garments already in a scene (keeps id, name, background). */
export function relayout(scene: OutfitScene, garments: Garment[]): OutfitScene {
  const items =
    scene.mode === 'mannequin'
      ? layoutMannequin(garments, scene.templateId as MannequinId)
      : layoutFlatlay(garments, scene.templateId as FlatPreset, scene.ratio as RatioId);
  return { ...scene, items };
}

/** Clip-path (in % of the item box) that hides the centre strip of an open jacket. */
export const OPEN_CLIP = 'polygon(0 0, 36% 0, 36% 100%, 64% 100%, 64% 0, 100% 0, 100% 100%, 0 100%)';
