import { useMemo, useState } from 'react';
import type { Garment, GarmentCategory } from '../../types';
import { CATEGORIES, CATEGORY_LABELS } from '../../data/taxonomy';
import { Sheet } from '../../components/Sheet';
import { GarmentCard } from '../../components/GarmentCard';
import { Chip } from '../../components/ui';

export function GarmentPicker({
  open,
  onClose,
  garments,
  initial = [],
  disabledIds = [],
  single,
  title,
  category,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  garments: Garment[];
  initial?: string[];
  disabledIds?: string[];
  single?: boolean;
  title: string;
  category?: GarmentCategory;
  confirmLabel?: string;
  onConfirm: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(initial);
  const [cat, setCat] = useState<GarmentCategory | 'all'>(category ?? 'all');
  const [q, setQ] = useState('');
  const disabled = useMemo(() => new Set(disabledIds), [disabledIds]);

  const list = useMemo(
    () =>
      garments.filter((g) => g.status !== 'archived' && !disabled.has(g.id) && (cat === 'all' || g.category === cat) && (!q || `${g.name} ${g.subcategory}`.toLowerCase().includes(q.toLowerCase()))),
    [garments, cat, q, disabled],
  );

  const toggle = (id: string) => {
    if (single) {
      onConfirm([id]);
      return;
    }
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      tall
      eyebrow={single ? 'Choose a piece' : `${selected.length} selected`}
      title={title}
      footer={
        single ? undefined : (
          <button type="button" className="btn primary wide" disabled={!selected.length} onClick={() => onConfirm(selected)}>
            {confirmLabel ?? 'Use selected pieces'}
          </button>
        )
      }
    >
      <input className="input" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
      {!category && (
        <div className="tabs inline">
          <Chip active={cat === 'all'} onClick={() => setCat('all')}>
            All
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
              {CATEGORY_LABELS[c]}
            </Chip>
          ))}
        </div>
      )}
      {list.length === 0 ? (
        <p className="hint center">No pieces here yet.</p>
      ) : (
        <div className="grid small">
          {list.map((g, i) => (
            <GarmentCard key={g.id} garment={g} index={i} selected={selected.includes(g.id)} onClick={() => toggle(g.id)} />
          ))}
        </div>
      )}
    </Sheet>
  );
}
