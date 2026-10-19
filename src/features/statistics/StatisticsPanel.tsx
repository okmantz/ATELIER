import { useMemo } from 'react';
import type { Garment } from '../../types';
import { CATEGORIES, CATEGORY_LABELS } from '../../data/taxonomy';
import { COLOR_FAMILIES, colorFamily } from '../../engine/color-harmony';

export function computeStats(garments: Garment[]) {
  const active = garments.filter((g) => g.status !== 'archived');
  const byCategory = CATEGORIES.map((c) => ({ id: c, label: CATEGORY_LABELS[c], n: active.filter((g) => g.category === c).length }));
  const byColor = COLOR_FAMILIES.map((f) => ({ ...f, n: active.filter((g) => colorFamily(g.primaryColor) === f.id).length })).filter((f) => f.n > 0).sort((a, b) => b.n - a.n);
  const priced = active.filter((g) => g.purchasePrice && g.purchasePrice > 0);
  const value = priced.reduce((a, g) => a + (g.purchasePrice ?? 0), 0);
  const worn = active.filter((g) => g.wearCount > 0);
  const totalWears = active.reduce((a, g) => a + g.wearCount, 0);
  const mostWorn = [...worn].sort((a, b) => b.wearCount - a.wearCount).slice(0, 5);
  const neverWorn = active.filter((g) => g.wearCount === 0 && g.category !== 'accessories').slice(0, 5);
  const costPerWear = priced.filter((g) => g.wearCount > 0).map((g) => ({ g, v: (g.purchasePrice ?? 0) / g.wearCount })).sort((a, b) => a.v - b.v);
  return {
    total: active.length,
    men: active.filter((g) => g.gender === 'men').length,
    women: active.filter((g) => g.gender === 'women').length,
    unisex: active.filter((g) => g.gender === 'unisex').length,
    layers: [1, 2, 3, 4].map((l) => active.filter((g) => g.layer === l && g.category !== 'one-piece').length),
    byCategory,
    byColor,
    value,
    totalWears,
    mostWorn,
    neverWorn,
    bestValue: costPerWear.slice(0, 3),
  };
}

export function StatisticsPanel({ garments }: { garments: Garment[] }) {
  const s = useMemo(() => computeStats(garments), [garments]);
  if (!s.total) return <p className="hint">Add pieces to see insights about your collection.</p>;
  const maxCat = Math.max(1, ...s.byCategory.map((c) => c.n));
  return (
    <div className="stats">
      <div className="stat-row">
        <div>
          <b className="serif">{s.total}</b>
          <small>pieces</small>
        </div>
        <div>
          <b className="serif">{s.totalWears}</b>
          <small>wears logged</small>
        </div>
        <div>
          <b className="serif">{s.value ? Math.round(s.value).toLocaleString() : '—'}</b>
          <small>invested</small>
        </div>
      </div>

      <div className="eyebrow">By category</div>
      {s.byCategory.map((c) => (
        <div key={c.id} className="bar-row">
          <span>{c.label}</span>
          <div className="bar">
            <i style={{ width: `${(c.n / maxCat) * 100}%` }} />
          </div>
          <em>{c.n}</em>
        </div>
      ))}

      <div className="eyebrow">Palette</div>
      <div className="palette-bar">
        {s.byColor.map((c) => (
          <i key={c.id} style={{ flex: c.n, background: c.swatch }} title={`${c.label}: ${c.n}`} />
        ))}
      </div>

      <div className="eyebrow">Layering depth</div>
      <p className="hint">
        {s.layers[0]} base · {s.layers[1]} mid · {s.layers[2]} outer · {s.layers[3]} coat — {s.men} men’s, {s.women} women’s, {s.unisex} unisex.
      </p>

      {s.mostWorn.length > 0 && (
        <>
          <div className="eyebrow">Most worn</div>
          <p className="hint">{s.mostWorn.map((g) => `${g.name} (${g.wearCount}×)`).join(' · ')}</p>
        </>
      )}
      {s.neverWorn.length > 0 && (
        <>
          <div className="eyebrow">Waiting to be worn</div>
          <p className="hint">{s.neverWorn.map((g) => g.name).join(' · ')}</p>
        </>
      )}
      {s.bestValue.length > 0 && (
        <>
          <div className="eyebrow">Best cost per wear</div>
          <p className="hint">{s.bestValue.map((x) => `${x.g.name} (${x.v.toFixed(2)})`).join(' · ')}</p>
        </>
      )}
    </div>
  );
}
