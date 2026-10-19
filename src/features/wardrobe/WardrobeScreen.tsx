import { useMemo, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { useGarments } from '../../storage/useLive';
import type { Garment, GarmentCategory, GenderFocus } from '../../types';
import { CATEGORIES, CATEGORY_LABELS } from '../../data/taxonomy';
import { colorFamily, hexToHsl } from '../../engine/color-harmony';
import { GarmentCard } from '../../components/GarmentCard';
import { DEFAULT_FILTERS, FilterDrawer, countFilters, type Filters } from '../../components/FilterDrawer';
import { Icon } from '../../components/Icons';
import { Chip, Empty, Segmented } from '../../components/ui';
import { loadSampleWardrobe } from '../../samples/sample-wardrobe';

function applyFilters(list: Garment[], cat: GarmentCategory | 'all', q: string, f: Filters, focus: GenderFocus): Garment[] {
  const query = q.trim().toLowerCase();
  let out = list.filter((g) => {
    if (cat !== 'all' && g.category !== cat) return false;
    if (focus !== 'all' && g.gender !== 'unisex' && g.gender !== focus) return false;
    if (f.status === 'active' ? g.status === 'archived' : f.status !== 'all' && g.status !== f.status) return false;
    if (f.favorites && !g.favorite) return false;
    if (f.season !== 'any' && g.season.length && !g.season.includes(f.season)) return false;
    if (f.families.length && !f.families.includes(colorFamily(g.primaryColor))) return false;
    if (f.layer !== 'any' && g.layer !== f.layer) return false;
    if (query) {
      const hay = `${g.name} ${g.subcategory} ${g.brand ?? ''} ${g.category}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
  out = [...out];
  switch (f.sort) {
    case 'most-worn':
      out.sort((a, b) => b.wearCount - a.wearCount);
      break;
    case 'least-worn':
      out.sort((a, b) => a.wearCount - b.wearCount);
      break;
    case 'name':
      out.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'color':
      out.sort((a, b) => hexToHsl(a.primaryColor).h - hexToHsl(b.primaryColor).h);
      break;
    default:
      break;
  }
  return out;
}

export default function WardrobeScreen() {
  const { settings, updateSettings, navigate, openGarment, toast } = useApp();
  const garments = useGarments();
  const [cat, setCat] = useState<GarmentCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [drawer, setDrawer] = useState(false);
  const [loadingSample, setLoadingSample] = useState<string | null>(null);

  const visible = useMemo(() => applyFilters(garments ?? [], cat, query, filters, settings.genderFocus), [garments, cat, query, filters, settings.genderFocus]);
  const counts = useMemo(() => {
    const m: Record<string, number> = { all: 0 };
    for (const g of garments ?? []) {
      if (g.status === 'archived') continue;
      if (settings.genderFocus !== 'all' && g.gender !== 'unisex' && g.gender !== settings.genderFocus) continue;
      m.all++;
      m[g.category] = (m[g.category] ?? 0) + 1;
    }
    return m;
  }, [garments, settings.genderFocus]);

  const loadSamples = async () => {
    try {
      setLoadingSample('Preparing sample pieces…');
      await loadSampleWardrobe((d, t) => setLoadingSample(`Preparing sample pieces… ${d}/${t}`));
      toast('Sample wardrobe added — remove it any time in Settings.');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setLoadingSample(null);
    }
  };

  const empty = garments && garments.length === 0;
  const nFilters = countFilters(filters);

  return (
    <div className="page">
      <header className="screen-head">
        <div className="eyebrow">The archive</div>
        <div className="head-row">
          <h1 className="display">Wardrobe</h1>
          <div className="head-actions">
            <button type="button" className={`icon-btn${searching ? ' on' : ''}`} aria-label="Search" onClick={() => setSearching((s) => !s)}>
              <Icon name="search" />
            </button>
            <button type="button" className={`icon-btn${nFilters ? ' on' : ''}`} aria-label="Filters" onClick={() => setDrawer(true)}>
              <Icon name="filter" />
              {nFilters > 0 && <span className="pip">{nFilters}</span>}
            </button>
          </div>
        </div>
        <p className="lede">{garments ? `${counts.all} pieces, composed.` : ' '}</p>
        {searching && (
          <input className="input search" autoFocus placeholder="Search name, brand, type…" value={query} onChange={(e) => setQuery(e.target.value)} />
        )}
        <Segmented<GenderFocus>
          small
          value={settings.genderFocus}
          onChange={(v) => void updateSettings({ genderFocus: v })}
          options={[
            { value: 'all', label: 'All' },
            { value: 'women', label: 'Women' },
            { value: 'men', label: 'Men' },
          ]}
        />
      </header>

      {!empty && (
        <div className="tabs" role="tablist">
          <Chip active={cat === 'all'} onClick={() => setCat('all')}>
            All <small>{counts.all}</small>
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
              {CATEGORY_LABELS[c]} <small>{counts[c] ?? 0}</small>
            </Chip>
          ))}
        </div>
      )}

      {empty ? (
        <Empty
          title="Begin your archive."
          action={
            <>
              <button type="button" className="btn primary" onClick={() => navigate('/garment/new')}>
                <Icon name="camera" size={18} /> Photograph a piece
              </button>
              <button type="button" className="btn ghost" onClick={loadSamples} disabled={!!loadingSample}>
                {loadingSample ?? 'Explore with a sample wardrobe'}
              </button>
            </>
          }
        >
          Catalogue each garment with a photo, then let ATELIER compose layered outfits for men and women — entirely on your device, no account, no AI.
        </Empty>
      ) : visible.length === 0 ? (
        <Empty
          title="Nothing matches."
          action={
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setFilters(DEFAULT_FILTERS);
                setCat('all');
                setQuery('');
              }}
            >
              Clear filters
            </button>
          }
        >
          Try a different category or loosen the filters.
        </Empty>
      ) : (
        <div className="grid">
          {visible.map((g, i) => (
            <GarmentCard key={g.id} garment={g} index={i} onClick={() => openGarment(g.id)} />
          ))}
        </div>
      )}

      <button type="button" className="fab" onClick={() => navigate('/garment/new')} aria-label="Add garment">
        <Icon name="plus" size={26} />
      </button>

      <FilterDrawer open={drawer} onClose={() => setDrawer(false)} filters={filters} onChange={setFilters} />
    </div>
  );
}
