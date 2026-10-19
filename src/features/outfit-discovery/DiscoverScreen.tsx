import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { useGarments } from '../../storage/useLive';
import type { Garment, Occasion, Season } from '../../types';
import { OCCASIONS, SEASONS, FORMALITY_LABELS } from '../../data/taxonomy';
import { generateOutfits, rescoreOutfit, swapCandidates, type GeneratedOutfit } from '../../engine/outfit-generator';
import { occasionFormality } from '../../engine/outfit-scorer';
import { layerSlot } from '../../engine/compatibility';
import { saveOutfit } from '../../storage/outfits';
import { setPlan, markEntryWorn } from '../../storage/calendar';
import { todayKey } from '../../storage/database';
import { Chip, Empty, Field, Range, Segmented, Toggle } from '../../components/ui';
import { Sheet } from '../../components/Sheet';
import { GarmentThumb } from '../../components/GarmentCard';
import { Icon } from '../../components/Icons';
import { buildScene } from '../outfit-studio/layouts';
import { OutfitCard } from './OutfitCard';

export default function DiscoverScreen() {
  const { settings, updateSettings, anchorId, setAnchorId, setDraft, navigate, toast } = useApp();
  const garments = useGarments();
  const d = settings.discover;
  const [results, setResults] = useState<GeneratedOutfit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [swap, setSwap] = useState<{ outfitId: string; garment: Garment } | null>(null);
  const seed = useRef(Math.floor(Math.random() * 90000) + 1);

  const map = useMemo(() => new Map((garments ?? []).map((g) => [g.id, g])), [garments]);
  const anchor = anchorId ? map.get(anchorId) : undefined;

  const prefs = useMemo(
    () => ({
      occasion: d.occasion,
      season: d.season,
      formality: d.formality,
      variety: d.variety,
      layers: d.layers,
      maxAccessories: d.maxAccessories,
      genderFocus: settings.genderFocus,
      includeWorn: settings.includeWorn,
      minScore: settings.minScore,
      weights: settings.weights,
      anchorIds: anchorId ? [anchorId] : [],
    }),
    [d, settings.genderFocus, settings.includeWorn, settings.minScore, settings.weights, anchorId],
  );

  const setD = (patch: Partial<typeof d>) => void updateSettings({ discover: { ...d, ...patch } });

  const compose = () => {
    if (!garments) return;
    setBusy(true);
    seed.current += 1;
    // Let the spinner paint before the (synchronous) engine runs.
    setTimeout(() => {
      try {
        const out = generateOutfits(garments, { ...prefs, seed: seed.current });
        setResults(out);
        setSaved(new Set());
        if (out.length) setControlsOpen(false);
      } catch (e) {
        toast((e as Error).message, 'error');
      } finally {
        setBusy(false);
      }
    }, 30);
  };

  // Compose once automatically when arriving with an anchor piece.
  useEffect(() => {
    if (anchorId && garments && garments.length) compose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorId, !!garments]);

  const replaceItems = (outfitId: string, items: Garment[]) => {
    setResults((list) => (list ?? []).map((o) => (o.id === outfitId ? { ...rescoreOutfit(items, prefs), id: o.id } : o)));
    setSaved((s) => {
      const n = new Set(s);
      n.delete(outfitId);
      return n;
    });
  };

  const swapOptions = useMemo(() => {
    if (!swap || !garments || !results) return [];
    const o = results.find((x) => x.id === swap.outfitId);
    if (!o) return [];
    const base = o.score.total;
    return swapCandidates(o.items, swap.garment.id, garments, prefs).map((c) => ({ ...c, delta: c.score.total - base }));
  }, [swap, garments, results, prefs]);

  const doSave = async (o: GeneratedOutfit) => {
    await saveOutfit({ name: `${o.items.filter((g) => layerSlot(g) > 0).pop()?.name ?? 'Saved'} look`, garmentIds: o.items.map((g) => g.id), score: o.score.total, occasion: d.occasion, season: d.season });
    setSaved((s) => new Set(s).add(o.id));
    toast('Saved to your looks.');
  };

  const doWear = async (o: GeneratedOutfit) => {
    const entry = await setPlan(todayKey(), o.items.map((g) => g.id), 'Today’s look');
    await markEntryWorn(entry);
    toast('Logged as today’s outfit.');
  };

  const toStudio = (o: GeneratedOutfit) => {
    setDraft(buildScene(o.items, { mode: 'flatlay' }));
    navigate('/studio/edit');
  };

  const lowWardrobe = garments && garments.length < 4;

  return (
    <div className="page">
      <header className="screen-head">
        <div className="eyebrow">The outfit atelier</div>
        <h1 className="display">Discover</h1>
        <p className="lede">Looks composed from what you own — colour theory, formality and layering, by transparent rules.</p>
      </header>

      {anchor && (
        <div className="anchor">
          <GarmentThumb garment={anchor} className="mini" />
          <span>
            Styling around <strong>{anchor.name}</strong>
          </span>
          <button type="button" className="icon-btn sm" aria-label="Clear" onClick={() => setAnchorId(undefined)}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      <section className="panel">
        <button type="button" className="panel-head" onClick={() => setControlsOpen((o) => !o)}>
          <span className="eyebrow">
            {OCCASIONS.find((o) => o.id === d.occasion)?.label} · {d.season === 'any' ? 'Any season' : d.season} · formality {d.formality}/5
          </span>
          <Icon name={controlsOpen ? 'up' : 'down'} size={18} />
        </button>
        {controlsOpen && (
          <div className="panel-body">
            <Field label="Occasion">
              <div className="chips">
                {OCCASIONS.map((o) => (
                  <Chip key={o.id} active={d.occasion === o.id} onClick={() => setD({ occasion: o.id as Occasion, formality: occasionFormality(o.id) })}>
                    {o.label}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Season">
              <div className="chips">
                <Chip active={d.season === 'any'} onClick={() => setD({ season: 'any' })}>
                  Any season
                </Chip>
                {SEASONS.map((s) => (
                  <Chip key={s.id} active={d.season === s.id} onClick={() => setD({ season: s.id as Season })}>
                    {s.label}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Desired formality" right={<span className="hint inline">{d.formality}/5 · {FORMALITY_LABELS[d.formality]}</span>}>
              <Range label="Formality" min={1} max={5} value={d.formality} onChange={(v) => setD({ formality: v })} />
            </Field>
            <Field label="Outfit variety" right={<span className="hint inline">{Math.round(d.variety * 100)}%</span>} hint="Higher variety avoids returning near-identical combinations.">
              <Range label="Variety" min={0} max={100} step={5} value={Math.round(d.variety * 100)} onChange={(v) => setD({ variety: v / 100 })} />
            </Field>
            <Field label="Layering" hint="The most stacked pieces per look, counting the base layer.">
              <Segmented<number>
                value={d.layers}
                onChange={(v) => setD({ layers: v as 1 | 2 | 3 | 4 })}
                options={[
                  { value: 1, label: 'Single' },
                  { value: 2, label: 'Two' },
                  { value: 3, label: 'Three' },
                  { value: 4, label: 'Full' },
                ]}
              />
            </Field>
            <Field label="Accessories">
              <Segmented<number>
                value={d.maxAccessories}
                onChange={(v) => setD({ maxAccessories: v as 0 | 1 | 2 | 3 })}
                options={[0, 1, 2, 3].map((n) => ({ value: n, label: n === 0 ? 'None' : `Up to ${n}` }))}
              />
            </Field>
            <div className="row-between">
              <span className="eyebrow">Include recently worn pieces</span>
              <Toggle on={settings.includeWorn} onChange={(v) => void updateSettings({ includeWorn: v })} label="Include recently worn" />
            </div>
          </div>
        )}
      </section>

      <button type="button" className="btn primary wide" onClick={compose} disabled={busy || !garments?.length}>
        <Icon name="discover" size={18} /> {busy ? 'Composing…' : results ? 'Compose again' : 'Compose looks'}
      </button>

      {lowWardrobe && <p className="hint center">Add a few more pieces — a top, bottoms and shoes (or a dress) — for richer results.</p>}

      {results && results.length === 0 && (
        <Empty title="No complete looks yet.">
          Nothing qualifies with these settings. Try “Any season”, a lower layering limit, or include recently worn pieces. A look needs a top (or a one-piece) and, unless it’s a dress, bottoms.
        </Empty>
      )}

      <div className="looks">
        {results?.map((o, i) => (
          <OutfitCard
            key={o.id}
            outfit={o}
            garments={map}
            index={i}
            saved={saved.has(o.id)}
            onSwap={(g) => setSwap({ outfitId: o.id, garment: g })}
            onRemove={(g) => replaceItems(o.id, o.items.filter((x) => x.id !== g.id))}
            onSave={() => void doSave(o)}
            onStudio={() => toStudio(o)}
            onWear={() => void doWear(o)}
          />
        ))}
      </div>

      <Sheet open={!!swap} onClose={() => setSwap(null)} eyebrow="Swap" title={swap ? `Replace ${swap.garment.name}` : ''} tall>
        {swapOptions.length === 0 ? (
          <p className="hint">No other available pieces of this type.</p>
        ) : (
          <ul className="swap-list">
            {swapOptions.map((c) => (
              <li key={c.garment.id}>
                <button
                  type="button"
                  onClick={() => {
                    const o = results?.find((x) => x.id === swap!.outfitId);
                    if (o) replaceItems(o.id, o.items.map((i) => (i.id === swap!.garment.id ? c.garment : i)));
                    setSwap(null);
                  }}
                >
                  <GarmentThumb garment={c.garment} className="mini" />
                  <span className="swap-name">
                    {c.garment.name}
                    <small>{c.garment.subcategory}</small>
                  </span>
                  <span className={`delta ${c.delta >= 0 ? 'up' : 'down'}`}>
                    {c.delta >= 0 ? '+' : ''}
                    {c.delta.toFixed(1)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </div>
  );
}
