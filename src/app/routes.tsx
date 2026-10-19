export type RouteName = 'wardrobe' | 'discover' | 'studio' | 'studio-edit' | 'calendar' | 'settings' | 'garment-new' | 'garment-edit';

export interface Match {
  name: RouteName;
  tab: 'wardrobe' | 'discover' | 'studio' | 'calendar' | 'settings';
  fullscreen: boolean;
  param?: string;
}

export function matchRoute(path: string): Match {
  const p = path.split('?')[0].replace(/\/+$/, '') || '/wardrobe';
  if (p === '/discover') return { name: 'discover', tab: 'discover', fullscreen: false };
  if (p === '/studio') return { name: 'studio', tab: 'studio', fullscreen: false };
  if (p === '/studio/edit') return { name: 'studio-edit', tab: 'studio', fullscreen: true };
  if (p === '/calendar') return { name: 'calendar', tab: 'calendar', fullscreen: false };
  if (p === '/settings') return { name: 'settings', tab: 'settings', fullscreen: false };
  if (p === '/garment/new') return { name: 'garment-new', tab: 'wardrobe', fullscreen: true };
  if (p.startsWith('/garment/')) return { name: 'garment-edit', tab: 'wardrobe', fullscreen: true, param: p.slice('/garment/'.length) };
  return { name: 'wardrobe', tab: 'wardrobe', fullscreen: false };
}
