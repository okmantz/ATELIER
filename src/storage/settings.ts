import type { AppSettings } from '../types';
import { DEFAULT_WEIGHTS } from '../engine/outfit-scorer';
import { db } from './database';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  genderFocus: 'all',
  includeWorn: true,
  minScore: 40,
  weights: { ...DEFAULT_WEIGHTS },
  discover: { occasion: 'casual', season: 'any', formality: 2, variety: 0.7, layers: 3, maxAccessories: 2 },
};

export function mergeSettings(stored: Partial<AppSettings> | undefined): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...(stored ?? {}),
    weights: { ...DEFAULT_SETTINGS.weights, ...(stored?.weights ?? {}) },
    discover: { ...DEFAULT_SETTINGS.discover, ...(stored?.discover ?? {}) },
  };
}

export async function loadSettings(): Promise<AppSettings> {
  const row = await db.settings.get('app');
  return mergeSettings(row?.value as Partial<AppSettings> | undefined);
}

export async function saveSettings(s: AppSettings): Promise<void> {
  await db.settings.put({ key: 'app', value: s });
  try {
    localStorage.setItem('atelier-theme', s.theme);
  } catch {
    /* private mode */
  }
}
