import { useMemo, useState } from 'react';
import type { Garment } from '../../types';
import type { GeneratedOutfit } from '../../engine/outfit-generator';
import { layerSlot } from '../../engine/compatibility';
import { LAYER_LABELS } from '../../data/taxonomy';
import { LayoutPreview } from '../../components/LayoutPreview';
import { GarmentThumb } from '../../components/GarmentCard';
import { Icon } from '../../components/Icons';
import { ScoreRing } from '../../components/ui';
import { layoutFlatlay } from '../outfit-studio/layouts';

const FACTORS: { key: 'color' | 'occasion' | 'compatibility' | 'season' | 'preference' | 'underused'; label: string }[] = [
  { key: 'color', label: 'Colour harmony' },
  { key: 'occasion', label: 'Occasion & formality' },
  { key: 'compatibility', label: 'Compatibility' },
  { key: 'season', label: 'Season' },
  { key: 'preference', label: 'Your favourites' },
  { key: 'underused', label: 'Fresh rotation' },
];

export function OutfitCard({
  outfit,
  garments,
  saved,
  index,
  onSwap,
  onRemove,
  onSave,
  onStudio,
  onWear,
}: {
  outfit: GeneratedOutfit;
  garments: Map<string, Garment>;
  saved: boolean;
  index: number;
  onSwap: (g: Garment) => void;
  onRemove: (g: Garment) => void;
  onSave: () => void;
  onStudio: () => void;
  onWear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const items = useMemo(() => layoutFlatlay(outfit.items, 'classic', '4:5'), [outfit.items]);
  const layerCount = outfit.items.filter((g) => layerSlot(g) > 0).length;
  const hasSlot1 = outfit.items.some((g) => layerSlot(g) === 1);

  const removable = (g: Garment) => g.category === 'accessories' || layerSlot(g) >= 3 || (layerSlot(g) === 2 && hasSlot1);

  return (
    <article className="look" style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}>
      <div className="look-media">
        <LayoutPreview items={items} garments={garments} />
        <div className="look-score">
          <ScoreRing value={outfit.score.total} />
        </div>
      </div>
      <div className="look-body">
        <div className="look-top">
          <div>
            <div className="eyebrow">{outfit.score.harmony}</div>
            <h3 className="serif">
              {layerCount > 1 ? `${layerCount}-layer look` : 'Single-layer look'}
            </h3>
          </div>
          <button type="button" className="link" onClick={() => setOpen((o) => !o)}>
            {open ? 'Hide' : 'Why this works'}
          </button>
        </div>

        <ul className="look-items">
          {outfit.items.map((g) => (
            <li key={g.id}>
              <GarmentThumb garment={g} className="mini" />
              <div className="look-item-text">
                <span>{g.name}</span>
                <small>{layerSlot(g) > 0 && g.category !== 'one-piece' ? LAYER_LABELS[layerSlot(g)] + ' layer' : g.subcategory}</small>
              </div>
              <button type="button" className="icon-btn sm" onClick={() => onSwap(g)} aria-label={`Swap ${g.name}`} title="Swap">
                <Icon name="swap" size={17} />
              </button>
              {removable(g) && (
                <button type="button" className="icon-btn sm" onClick={() => onRemove(g)} aria-label={`Remove ${g.name}`} title="Remove">
                  <Icon name="close" size={17} />
                </button>
              )}
            </li>
          ))}
        </ul>

        {open && (
          <div className="why">
            {FACTORS.map((f) => (
              <div key={f.key} className="bar-row">
                <span>{f.label}</span>
                <div className="bar">
                  <i style={{ width: `${Math.round(outfit.score[f.key] * 100)}%` }} />
                </div>
              </div>
            ))}
            {outfit.score.notes.length > 0 && (
              <ul className="notes">
                {[...new Set(outfit.score.notes)].map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="look-actions">
          <button type="button" className={`btn ghost${saved ? ' on' : ''}`} onClick={onSave} disabled={saved}>
            <Icon name="heart" size={17} filled={saved} /> {saved ? 'Saved' : 'Save'}
          </button>
          <button type="button" className="btn ghost" onClick={onWear}>
            <Icon name="shirt" size={17} /> Wear today
          </button>
          <button type="button" className="btn primary" onClick={onStudio}>
            <Icon name="studio" size={17} /> Studio
          </button>
        </div>
      </div>
    </article>
  );
}
