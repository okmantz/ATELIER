import type { SeasonName, LayerSlot } from '../types';
import { COLOR_FAMILIES, type ColorFamily } from '../engine/color-harmony';
import { SEASONS } from '../data/taxonomy';
import { Sheet } from './Sheet';
import { Chip, Field, Segmented } from './ui';
import { ColorSwatch } from './ColorSwatch';

export interface Filters {
  status: 'active' | 'all' | 'clean' | 'worn' | 'laundry' | 'archived';
  favorites: boolean;
  season: SeasonName | 'any';
  families: ColorFamily[];
  layer: LayerSlot | 'any';
  sort: 'newest' | 'most-worn' | 'least-worn' | 'name' | 'color';
}

export const DEFAULT_FILTERS: Filters = { status: 'active', favorites: false, season: 'any', families: [], layer: 'any', sort: 'newest' };

export const countFilters = (f: Filters) =>
  (f.status !== 'active' ? 1 : 0) + (f.favorites ? 1 : 0) + (f.season !== 'any' ? 1 : 0) + (f.families.length ? 1 : 0) + (f.layer !== 'any' ? 1 : 0) + (f.sort !== 'newest' ? 1 : 0);

export function FilterDrawer({ open, onClose, filters, onChange }: { open: boolean; onClose: () => void; filters: Filters; onChange: (f: Filters) => void }) {
  const set = (p: Partial<Filters>) => onChange({ ...filters, ...p });
  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow="Refine"
      title="Filters"
      footer={
        <>
          <button type="button" className="btn ghost" onClick={() => onChange(DEFAULT_FILTERS)}>
            Reset
          </button>
          <button type="button" className="btn primary" onClick={onClose}>
            Show pieces
          </button>
        </>
      }
    >
      <Field label="Condition">
        <div className="chips">
          {(['active', 'clean', 'worn', 'laundry', 'archived', 'all'] as const).map((s) => (
            <Chip key={s} active={filters.status === s} onClick={() => set({ status: s })}>
              {s === 'active' ? 'In rotation' : s === 'all' ? 'Everything' : s[0].toUpperCase() + s.slice(1)}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Favourites">
        <Segmented
          options={[
            { value: 'no', label: 'All pieces' },
            { value: 'yes', label: 'Favourites only' },
          ]}
          value={filters.favorites ? 'yes' : 'no'}
          onChange={(v) => set({ favorites: v === 'yes' })}
        />
      </Field>
      <Field label="Season">
        <div className="chips">
          <Chip active={filters.season === 'any'} onClick={() => set({ season: 'any' })}>
            Any
          </Chip>
          {SEASONS.map((s) => (
            <Chip key={s.id} active={filters.season === s.id} onClick={() => set({ season: s.id })}>
              {s.label}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Layer" hint="Base sits against the skin, then mid, outer and coat layers.">
        <div className="chips">
          {([['any', 'Any'], [1, 'Base'], [2, 'Mid'], [3, 'Outer'], [4, 'Coat']] as const).map(([v, l]) => (
            <Chip key={String(v)} active={filters.layer === v} onClick={() => set({ layer: v as Filters['layer'] })}>
              {l}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Colour">
        <div className="swatches">
          {COLOR_FAMILIES.map((c) => (
            <ColorSwatch
              key={c.id}
              hex={c.swatch}
              label={c.label}
              selected={filters.families.includes(c.id)}
              onClick={() => set({ families: filters.families.includes(c.id) ? filters.families.filter((x) => x !== c.id) : [...filters.families, c.id] })}
            />
          ))}
        </div>
      </Field>
      <Field label="Sort by">
        <div className="chips">
          {(
            [
              ['newest', 'Newest'],
              ['most-worn', 'Most worn'],
              ['least-worn', 'Least worn'],
              ['name', 'Name'],
              ['color', 'Colour'],
            ] as const
          ).map(([v, l]) => (
            <Chip key={v} active={filters.sort === v} onClick={() => set({ sort: v })}>
              {l}
            </Chip>
          ))}
        </div>
      </Field>
    </Sheet>
  );
}
