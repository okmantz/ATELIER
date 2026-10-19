import { useMemo, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { useGarments, useOutfits, useScenes } from '../../storage/useLive';
import { deleteOutfit, deleteScene, toggleOutfitFavorite } from '../../storage/outfits';
import type { Garment, OutfitScene, SavedOutfit, SceneMode } from '../../types';
import { Icon } from '../../components/Icons';
import { Empty, Segmented } from '../../components/ui';
import { LayoutPreview } from '../../components/LayoutPreview';
import { useImageUrl } from '../../components/useImageUrl';
import { GarmentPicker } from './GarmentPicker';
import { buildScene, layoutFlatlay } from './layouts';

function SceneThumb({ scene, garments }: { scene: OutfitScene; garments: Map<string, Garment> }) {
  const url = useImageUrl(scene.thumbnailId);
  if (url) return <img className="scene-img" src={url} alt={scene.name} style={{ aspectRatio: scene.mode === 'mannequin' ? '2 / 3' : scene.ratio.replace(':', ' / ') }} />;
  return <LayoutPreview items={scene.items} garments={garments} mode={scene.mode} templateId={scene.templateId} ratio={scene.ratio} background={scene.background} />;
}

export default function StudioScreen() {
  const { setDraft, navigate, confirm, toast } = useApp();
  const garments = useGarments();
  const scenes = useScenes();
  const outfits = useOutfits();
  const [picker, setPicker] = useState(false);
  const [mode, setMode] = useState<SceneMode>('flatlay');
  const map = useMemo(() => new Map((garments ?? []).map((g) => [g.id, g])), [garments]);

  const start = (ids: string[]) => {
    const picked = ids.map((id) => map.get(id)).filter((g): g is Garment => !!g);
    setPicker(false);
    setDraft(buildScene(picked, { mode }));
    navigate('/studio/edit');
  };

  const open = (s: OutfitScene) => {
    setDraft(s);
    navigate('/studio/edit');
  };

  const openOutfit = (o: SavedOutfit) => {
    const picked = o.garmentIds.map((id) => map.get(id)).filter((g): g is Garment => !!g);
    if (!picked.length) {
      toast('The pieces in this look are no longer in your wardrobe.', 'error');
      return;
    }
    setDraft(buildScene(picked, { mode, name: o.name }));
    navigate('/studio/edit');
  };

  const delScene = async (s: OutfitScene) => {
    if (await confirm({ title: `Delete “${s.name}”?`, message: 'The composition is removed. Your garments are not affected.', confirmLabel: 'Delete', danger: true })) await deleteScene(s.id);
  };
  const delOutfit = async (o: SavedOutfit) => {
    if (await confirm({ title: `Delete “${o.name}”?`, message: 'The saved look is removed. Your garments are not affected.', confirmLabel: 'Delete', danger: true })) await deleteOutfit(o.id);
  };

  return (
    <div className="page">
      <header className="screen-head">
        <div className="eyebrow">The mockup studio</div>
        <h1 className="display">Studio</h1>
        <p className="lede">Arrange your pieces as a flat-lay board, or dress a form — layer by layer.</p>
        <Segmented<SceneMode>
          value={mode}
          onChange={setMode}
          options={[
            { value: 'flatlay', label: 'Flat-lay' },
            { value: 'mannequin', label: 'Mannequin' },
          ]}
        />
      </header>

      <button type="button" className="btn primary wide" onClick={() => setPicker(true)} disabled={!garments?.length}>
        <Icon name="plus" size={18} /> New {mode === 'flatlay' ? 'flat-lay' : 'mannequin'} composition
      </button>
      {garments && garments.length === 0 && <p className="hint center">Add garments to your wardrobe first.</p>}

      <section>
        <h2 className="section-title serif">Compositions</h2>
        {!scenes || scenes.length === 0 ? (
          <Empty title="Nothing composed yet.">Pick pieces, drag to arrange, stack the layers and export a board.</Empty>
        ) : (
          <div className="grid">
            {scenes.map((s) => (
              <div key={s.id} className="scene-card">
                <button type="button" onClick={() => open(s)}>
                  <SceneThumb scene={s} garments={map} />
                  <div className="gcard-name">{s.name}</div>
                  <div className="gcard-sub">
                    <span>{s.mode === 'mannequin' ? 'Mannequin' : 'Flat-lay'} · {s.items.length} pieces</span>
                  </div>
                </button>
                <button type="button" className="icon-btn sm corner" onClick={() => delScene(s)} aria-label="Delete composition">
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="section-title serif">Saved looks</h2>
        {!outfits || outfits.length === 0 ? (
          <p className="hint">Looks you save in Discover appear here, ready to open in the studio.</p>
        ) : (
          <div className="grid">
            {outfits.map((o) => {
              const items = o.garmentIds.map((id) => map.get(id)).filter((g): g is Garment => !!g);
              return (
                <div key={o.id} className="scene-card">
                  <button type="button" onClick={() => openOutfit(o)}>
                    <LayoutPreview items={layoutFlatlay(items, 'classic', '4:5')} garments={map} />
                    <div className="gcard-name">{o.name}</div>
                    <div className="gcard-sub">
                      <span>Score {Math.round(o.score)} · {o.occasion}</span>
                    </div>
                  </button>
                  <button type="button" className={`icon-btn sm corner${o.favorite ? ' on' : ''}`} onClick={() => toggleOutfitFavorite(o.id)} aria-label="Favourite look">
                    <Icon name="heart" size={16} filled={o.favorite} />
                  </button>
                  <button type="button" className="icon-btn sm corner2" onClick={() => delOutfit(o)} aria-label="Delete look">
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {picker && garments && (
        <GarmentPicker open onClose={() => setPicker(false)} garments={garments} title="Choose pieces" confirmLabel={`Compose ${mode === 'flatlay' ? 'flat-lay' : 'on mannequin'}`} onConfirm={start} />
      )}
    </div>
  );
}
