/** Deterministic seeded random numbers (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Ranked<T> {
  item: T;
  ids: string[];
  score: number;
}

export function sharedRatio(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const set = new Set(a);
  let shared = 0;
  for (const id of b) if (set.has(id)) shared++;
  return shared / Math.max(a.length, b.length);
}

export interface DiversityOptions {
  limit: number;
  /** Outfits sharing more than this ratio of items with an already chosen outfit are skipped. */
  maxSharedItemsRatio: number;
  /** λ in S_final = S_base − λ · similarity (score points at similarity = 1). */
  lambda: number;
}

/**
 * Greedy maximal-marginal-relevance selection:
 *   S_final = S_base − λ · max_similarity_to_selected
 * with a hard cap on shared items that is relaxed only if too few outfits survive.
 */
export function selectDiverseOutfits<T>(ranked: Ranked<T>[], opts: DiversityOptions): T[] {
  const pool = ranked.slice(0, 900);
  const chosen: Ranked<T>[] = [];
  const used = new Set<number>();
  const wantMin = Math.min(opts.limit, 6);
  const thresholds = [opts.maxSharedItemsRatio, Math.min(1, opts.maxSharedItemsRatio + 0.2), 1.01];

  for (const cap of thresholds) {
    while (chosen.length < opts.limit) {
      let bestIdx = -1;
      let bestScore = -Infinity;
      for (let i = 0; i < pool.length; i++) {
        if (used.has(i)) continue;
        let maxSim = 0;
        for (const c of chosen) {
          const s = sharedRatio(c.ids, pool[i].ids);
          if (s > maxSim) maxSim = s;
          if (maxSim > cap) break;
        }
        if (maxSim > cap) continue;
        const s = pool[i].score - opts.lambda * maxSim;
        if (s > bestScore) {
          bestScore = s;
          bestIdx = i;
        }
      }
      if (bestIdx < 0) break;
      used.add(bestIdx);
      chosen.push(pool[bestIdx]);
    }
    if (chosen.length >= wantMin) break;
  }
  return chosen.map((c) => c.item);
}
