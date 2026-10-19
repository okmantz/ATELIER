export type Gender = 'men' | 'women' | 'unisex';
export type GenderFocus = 'men' | 'women' | 'all';
export type GarmentCategory = 'tops' | 'bottoms' | 'outerwear' | 'shoes' | 'accessories' | 'one-piece';
export type Pattern = 'solid' | 'striped' | 'checked' | 'floral' | 'graphic' | 'other';
export type SeasonName = 'spring' | 'summer' | 'autumn' | 'winter';
export type Season = SeasonName | 'any';
export type Occasion = 'casual' | 'business' | 'formal' | 'date';
export type GarmentStatus = 'clean' | 'worn' | 'laundry' | 'archived';

/**
 * Layering slot. 0 = not a layering piece (bottoms, shoes, accessories).
 * 1 = base (tee, shirt, blouse, dress) · 2 = mid (sweater, cardigan, waistcoat)
 * 3 = outer (blazer, jacket) · 4 = coat (overcoat, parka, trench)
 */
export type LayerSlot = 0 | 1 | 2 | 3 | 4;

export interface Garment {
  id: string;
  name: string;
  gender: Gender;
  category: GarmentCategory;
  subcategory: string;
  layer: LayerSlot;
  warmth: number; // 1 (airy) … 5 (very warm)

  imageId: string;
  thumbnailId: string;
  imageWidth: number;
  imageHeight: number;
  hasAlpha: boolean;

  primaryColor: string; // hex
  secondaryColors: string[];
  pattern: Pattern;

  season: SeasonName[];
  occasions: Occasion[];
  formality: number; // 1 casual … 5 formal

  brand?: string;
  size?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  notes?: string;

  status: GarmentStatus;
  favorite: boolean;
  wearCount: number;
  lastWorn?: string;
  sample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type GarmentFields = Omit<
  Garment,
  'id' | 'imageId' | 'thumbnailId' | 'imageWidth' | 'imageHeight' | 'hasAlpha' | 'wearCount' | 'lastWorn' | 'createdAt' | 'updatedAt'
>;

export interface ImageRecord {
  id: string;
  kind: 'full' | 'thumb' | 'scene';
  blob: Blob;
  mime: string;
  width: number;
  height: number;
  createdAt: string;
}

export interface Weights {
  color: number;
  occasion: number;
  compatibility: number;
  season: number;
  preference: number;
  underused: number;
}

export interface OutfitPreferences {
  occasion: Occasion;
  season: Season;
  formality: number; // desired 1..5
  variety: number; // 0..1
  layers: 1 | 2 | 3 | 4; // maximum number of stacked top layers
  maxAccessories: 0 | 1 | 2 | 3;
  genderFocus: GenderFocus;
  includeWorn: boolean;
  minScore: number;
  limit: number;
  anchorIds: string[];
  excludeIds: string[];
  seed: number;
  weights: Weights;
}

export interface SavedOutfit {
  id: string;
  name: string;
  garmentIds: string[];
  score: number;
  occasion: Occasion;
  season: Season;
  favorite: boolean;
  createdAt: string;
}

/** x / y are the CENTRE of the item in scene units (canvas is 1000 units wide). */
export interface SceneItem {
  garmentId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  opacity: number;
  hidden?: boolean;
  open?: boolean; // outerwear worn open so inner layers show
  flipX?: boolean;
}

export type SceneMode = 'flatlay' | 'mannequin';

export interface OutfitScene {
  id: string;
  name: string;
  mode: SceneMode;
  templateId: string; // flat-lay preset id or mannequin id
  ratio: string;
  background: string;
  items: SceneItem[];
  signature?: boolean; // small ATELIER mark on exports (default on)
  thumbnailId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEntry {
  id: string;
  date: string; // YYYY-MM-DD
  garmentIds: string[];
  label?: string;
  note?: string;
  worn: boolean;
  createdAt: string;
}

export interface AppSettings {
  theme: 'system' | 'light' | 'dark';
  genderFocus: GenderFocus;
  includeWorn: boolean;
  minScore: number;
  weights: Weights;
  discover: {
    occasion: Occasion;
    season: Season;
    formality: number;
    variety: number;
    layers: 1 | 2 | 3 | 4;
    maxAccessories: 0 | 1 | 2 | 3;
  };
}
