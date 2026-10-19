import { liveQuery } from 'dexie';
import { useEffect, useRef, useState } from 'react';
import { db } from './database';
import type { CalendarEntry, Garment, OutfitScene, SavedOutfit } from '../types';

/** Subscribe to an IndexedDB query; re-renders whenever the underlying tables change. */
export function useLive<T>(querier: () => Promise<T> | T, deps: unknown[] = []): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);
  const q = useRef(querier);
  q.current = querier;
  useEffect(() => {
    const sub = liveQuery(() => q.current()).subscribe({
      next: (v) => setValue(v),
      error: (e) => console.error('liveQuery failed', e),
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}

export const useGarments = (): Garment[] | undefined => useLive(() => db.garments.orderBy('createdAt').reverse().toArray());
export const useOutfits = (): SavedOutfit[] | undefined => useLive(() => db.outfits.orderBy('createdAt').reverse().toArray());
export const useScenes = (): OutfitScene[] | undefined => useLive(() => db.scenes.orderBy('updatedAt').reverse().toArray());
export const useCalendar = (): CalendarEntry[] | undefined => useLive(() => db.calendarEntries.toArray());
