import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type Konva from 'konva';
import { useApp } from '../../app/AppContext';
import { useGarments } from '../../storage/useLive';
import { saveScene } from '../../storage/outfits';
import type { Garment, OutfitScene, SceneItem, SceneMode } from '../../types';
import { LAYER_LABELS } from '../../data/taxonomy';
import { layerSlot } from '../../engine/compatibility';
import { downloadBlob, shareImage, stageThumbnail, stageToBlob } from '../../imaging/export-board';
import { Icon } from '../../components/Icons';
import { IconButton, Chip, Field, Range, Segmented, Toggle } from '../../components/ui';
import { ColorSwatch } from '../../components/ColorSwatch';
import { GarmentThumb } from '../../components/GarmentCard';
import { MANNEQUINS, type MannequinId, defaultMannequinFor } from '../mannequin-studio/mannequins';
import { BACKGROUNDS, FLAT_PRESETS, RATIOS, sceneHeight, relayout, layoutFlatlay, layoutMannequin, CANVAS_W, type FlatPreset, type RatioId } from './layouts';
import StudioCanvas from './StudioCanvas';
import { GarmentPicker } from './GarmentPicker';

type Tab = 'compose' | 'layers' | 'style';

export default function StudioEditor() {
  const { draft, setDraft, navigate, back, toast, confirm } = useApp();
  const garments = useGarments();
  const [scene, setScene] = useState<OutfitScene | null>(draft);
  const [dirty, setDirty] = useState(false);
  const [selected, setSelected] = useState<string | undefined>();
  const [tab, setTab] = useState<Tab>('compose');
  const [snap, setSnap] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState<null | { mode: 'add' } | { mode: 'replace'; id: string }>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const holder = useRef<HTMLDivElement>(null);
  const [holderW, setHolderW] = useState(360);

  const map = useMemo(() => new Map((garments ?? []).map((g) => [g.id, g])), [garments]);

  useEffect(() => {
    if (!draft) navigate('/studio');
  }, [draft, navigate]);

  useEffect(() => {
    // Make sure the editorial serif is ready before canvas text/exports use it.
    document.fonts?.load('400 26px "Cormorant Garamond"').catch(() => undefined);
  }, []);

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHolderW(el.clientWidth));
    ro.observe(el);
    setHolderW(el.clientWidth);
    return () => ro.disconnect();
  }, [scene !== null]);

  const edit = useCallback((fn: (s: OutfitScene) => OutfitScene) => {
    setScene((s) => (s ? fn(s) : s));
    setDirty(true);
  }, []);

  const sceneGarments = useCallback((s: OutfitScene) => s.items.map((i) => map.get(i.garmentId)).filter((g): g is Garment => !!g), [map]);

  if (!scene) return null;

  const H = sceneHeight(scene);
  // Keep the board comfortably on screen without scrolling the page.
  const maxH = Math.max(300, (typeof window !== 'undefined' ? window.innerHeight : 800) * 0.56);
  const displayW = Math.max(220, Math.min(holderW, (maxH * CANVAS_W) / H));

  const onItem = (id: string, patch: Partial<SceneItem>) => edit((s) => ({ ...s, items: s.items.map((i) => (i.garmentId === id ? { ...i, ...patch } : i)) }));

  const selItem = scene.items.find((i) => i.garmentId === selected);
  const selGarment = selected ? map.get(selected) : undefined;
  const ordered = [...scene.items].sort((a, b) => b.zIndex - a.zIndex);

  // ---- z-order ---------------------------------------------------------------------------------
  const moveZ = (id: string, dir: 1 | -1) =>
    edit((s) => {
      const asc = [...s.items].sort((a, b) => a.zIndex - b.zIndex);
      const idx = asc.findIndex((i) => i.garmentId === id);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= asc.length) return s;
      [asc[idx], asc[j]] = [asc[j], asc[idx]];
      return { ...s, items: asc.map((it, k) => ({ ...it, zIndex: (k + 1) * 10 })) };
    });

  const remove = (id: string) => {
    edit((s) => ({ ...s, items: s.items.filter((i) => i.garmentId !== id) }));
    if (selected === id) setSelected(undefined);
  };

  // ---- layout ------------------------------------------------------------------------------------
  const applyTemplate = (templateId: string, ratio?: string) =>
    edit((s) => relayout({ ...s, templateId, ratio: ratio ?? s.ratio }, sceneGarments(s)));

  const switchMode = (mode: SceneMode) => {
    if (mode === scene.mode) return;
    edit((s) => {
      const gs = sceneGarments(s);
      if (mode === 'mannequin') {
        const id = defaultMannequinFor(gs);
        return { ...s, mode, templateId: id, ratio: '2:3', background: '#EAE3D5', items: layoutMannequin(gs, id) };
      }
      return { ...s, mode, templateId: 'classic', ratio: '4:5', background: '#F4F0E8', items: layoutFlatlay(gs, 'classic', '4:5') };
    });
  };

  const addPieces = (ids: string[]) => {
    setPicker(null);
    edit((s) => {
      const existing = new Set(s.items.map((i) => i.garmentId));
      const all = [...sceneGarments(s), ...ids.filter((id) => !existing.has(id)).map((id) => map.get(id)).filter((g): g is Garment => !!g)];
      const laid = relayout(s, all).items;
      const added = laid.filter((i) => !existing.has(i.garmentId));
      const top = Math.max(0, ...s.items.map((i) => i.zIndex));
      return { ...s, items: [...s.items, ...added.map((a, k) => ({ ...a, zIndex: Math.max(a.zIndex, top + 5 + k) }))] };
    });
  };

  const replacePiece = (oldId: string, newId: string) => {
    setPicker(null);
    const g = map.get(newId);
    if (!g) return;
    edit((s) => ({
      ...s,
      items: s.items.map((i) => {
        if (i.garmentId !== oldId) return i;
        const a = (g.imageWidth || 4) / (g.imageHeight || 5);
        const boxW = i.width;
        const boxH = i.height;
        const w = Math.min(boxW, boxH * a);
        return { ...i, garmentId: newId, width: w, height: w / a };
      }),
    }));
    setSelected(newId);
  };

  // ---- capture, save, export ------------------------------------------------------------------------
  const withClean = async <T,>(fn: () => Promise<T>): Promise<T> => {
    setCapturing(true);
    await new Promise((r) => setTimeout(r, 80));
    try {
      return await fn();
    } finally {
      setCapturing(false);
    }
  };

  const save = async () => {
    if (!stageRef.current) return;
    setBusy(true);
    try {
      const thumb = await withClean(() => stageThumbnail(stageRef.current!, CANVAS_W, 420));
      const saved = await saveScene(scene, thumb);
      setScene(saved);
      setDraft(saved);
      setDirty(false);
      toast('Composition saved.');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const exportPng = async (share: boolean) => {
    if (!stageRef.current) return;
    setBusy(true);
    try {
      const blob = await withClean(() => stageToBlob(stageRef.current!, 1600 / stageRef.current!.width()));
      const file = `${scene.name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'atelier-look'}.png`;
      if (share) {
        const ok = await shareImage(blob, file, scene.name);
        if (!ok) {
          downloadBlob(blob, file);
          toast('Sharing isn’t available here — downloaded instead.');
        }
      } else {
        downloadBlob(blob, file);
        toast('PNG exported.');
      }
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    if (dirty) {
      const ok = await confirm({ title: 'Leave without saving?', message: 'Your changes to this composition will be lost.', confirmLabel: 'Discard changes', cancelLabel: 'Keep editing', danger: true });
      if (!ok) return;
    }
    setDraft(null);
    navigate('/studio');
  };

  const missing = scene.items.filter((i) => !map.has(i.garmentId)).length;

  return (
    <div className="studio">
      <header className="editor-bar">
        <button type="button" className="icon-btn" onClick={leave} aria-label="Close studio">
          <Icon name="left" />
        </button>
        <input
          className="studio-name"
          value={scene.name}
          onChange={(e) => edit((s) => ({ ...s, name: e.target.value }))}
          aria-label="Composition name"
          maxLength={60}
        />
        <button type="button" className="btn primary sm" onClick={save} disabled={busy}>
          {busy ? '…' : dirty || !scene.thumbnailId ? 'Save' : 'Saved'}
        </button>
      </header>

      <div className="stage-floor" ref={holder}>
        <div className="stage-wrap" style={{ width: displayW }}>
          <StudioCanvas
            scene={scene}
            garments={map}
            displayWidth={displayW}
            selectedId={selected}
            snap={snap}
            capturing={capturing}
            stageRef={stageRef}
            onSelect={setSelected}
            onChange={onItem}
          />
        </div>
        {missing > 0 && <p className="hint center">{missing} piece(s) in this composition were deleted from your wardrobe.</p>}
      </div>

      <div className="studio-actions">
        <button type="button" className="btn ghost sm" onClick={() => void exportPng(false)} disabled={busy}>
          <Icon name="download" size={16} /> Export PNG
        </button>
        <button type="button" className="btn ghost sm" onClick={() => void exportPng(true)} disabled={busy}>
          <Icon name="share" size={16} /> Share
        </button>
      </div>

      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'compose', label: 'Compose' },
          { value: 'layers', label: `Layers · ${scene.items.length}` },
          { value: 'style', label: 'Style' },
        ]}
      />

      <div className="studio-panel">
        {tab === 'compose' && (
          <>
            <Field label="Mode">
              <Segmented<SceneMode>
                value={scene.mode}
                onChange={switchMode}
                options={[
                  { value: 'flatlay', label: 'Flat-lay' },
                  { value: 'mannequin', label: 'Mannequin' },
                ]}
              />
            </Field>
            {scene.mode === 'flatlay' ? (
              <>
                <Field label="Arrangement">
                  <div className="chips">
                    {FLAT_PRESETS.map((p) => (
                      <Chip key={p.id} active={scene.templateId === p.id} onClick={() => applyTemplate(p.id)}>
                        {p.label}
                      </Chip>
                    ))}
                  </div>
                </Field>
                <Field label="Canvas ratio">
                  <div className="chips">
                    {(Object.keys(RATIOS) as RatioId[]).map((r) => (
                      <Chip key={r} active={scene.ratio === r} onClick={() => applyTemplate(scene.templateId, r)}>
                        {r}
                      </Chip>
                    ))}
                  </div>
                </Field>
              </>
            ) : (
              <Field label="Form" hint="Garment photos are placed on the form and can be fine-tuned. Cut-out photos (transparent background) look best.">
                <div className="chips">
                  {Object.values(MANNEQUINS).map((m) => (
                    <Chip key={m.id} active={scene.templateId === m.id} onClick={() => applyTemplate(m.id as MannequinId)}>
                      {m.label}
                    </Chip>
                  ))}
                </div>
              </Field>
            )}
            <div className="chips">
              <button type="button" className="btn ghost sm" onClick={() => edit((s) => relayout(s, sceneGarments(s)))}>
                <Icon name="dice" size={16} /> Re-arrange
              </button>
              <button type="button" className="btn ghost sm" onClick={() => setPicker({ mode: 'add' })}>
                <Icon name="plus" size={16} /> Add piece
              </button>
              <button type="button" className={`btn ghost sm${snap ? ' on' : ''}`} onClick={() => setSnap((v) => !v)}>
                <Icon name="grid" size={16} /> Snap to grid
              </button>
            </div>
          </>
        )}

        {tab === 'layers' && (
          <>
            <p className="hint">Top of the list sits in front. Tap a layer to select it on the board.</p>
            <ul className="layer-list">
              {ordered.map((it) => {
                const g = map.get(it.garmentId);
                if (!g) return null;
                return (
                  <li key={it.garmentId} className={selected === it.garmentId ? 'on' : ''}>
                    <button type="button" className="layer-main" onClick={() => setSelected(it.garmentId)}>
                      <GarmentThumb garment={g} className="mini" />
                      <span>
                        {g.name}
                        <small>{layerSlot(g) > 0 && g.category !== 'one-piece' ? `${LAYER_LABELS[layerSlot(g)]} layer` : g.subcategory}</small>
                      </span>
                    </button>
                    <IconButton icon={it.hidden ? 'eyeoff' : 'eye'} label={it.hidden ? 'Show' : 'Hide'} size={18} onClick={() => onItem(it.garmentId, { hidden: !it.hidden })} />
                    <IconButton icon="up" label="Bring forward" size={18} onClick={() => moveZ(it.garmentId, 1)} />
                    <IconButton icon="down" label="Send backward" size={18} onClick={() => moveZ(it.garmentId, -1)} />
                  </li>
                );
              })}
            </ul>

            {selItem && selGarment ? (
              <div className="sel-panel">
                <div className="eyebrow">Selected · {selGarment.name}</div>
                <Field label="Opacity" right={<span className="hint inline">{Math.round(selItem.opacity * 100)}%</span>}>
                  <Range label="Opacity" min={20} max={100} value={Math.round(selItem.opacity * 100)} onChange={(v) => onItem(selItem.garmentId, { opacity: v / 100 })} />
                </Field>
                <Field label="Rotation" right={<span className="hint inline">{Math.round(selItem.rotation)}°</span>}>
                  <Range label="Rotation" min={-180} max={180} value={Math.round(selItem.rotation)} onChange={(v) => onItem(selItem.garmentId, { rotation: v })} />
                </Field>
                <Field label="Size" right={<span className="hint inline">{Math.round(selItem.width)} px</span>}>
                  <Range
                    label="Size"
                    min={40}
                    max={1100}
                    value={Math.round(selItem.width)}
                    onChange={(v) => onItem(selItem.garmentId, { width: v, height: (v * selItem.height) / selItem.width })}
                  />
                </Field>
                {(selGarment.category === 'outerwear' || selGarment.layer >= 3) && (
                  <div className="row-between">
                    <span className="eyebrow">Worn open — reveal the layer beneath</span>
                    <Toggle on={!!selItem.open} onChange={(v) => onItem(selItem.garmentId, { open: v })} label="Worn open" />
                  </div>
                )}
                <div className="chips">
                  <button type="button" className="btn ghost sm" onClick={() => onItem(selItem.garmentId, { flipX: !selItem.flipX })}>
                    Mirror
                  </button>
                  <button type="button" className="btn ghost sm" onClick={() => setPicker({ mode: 'replace', id: selItem.garmentId })}>
                    <Icon name="swap" size={16} /> Replace
                  </button>
                  <button type="button" className="btn ghost sm danger-text" onClick={() => remove(selItem.garmentId)}>
                    <Icon name="trash" size={16} /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <p className="hint">Select a layer to adjust it.</p>
            )}
          </>
        )}

        {tab === 'style' && (
          <>
            <Field label="Backdrop">
              <div className="swatches">
                {BACKGROUNDS.map((c) => (
                  <ColorSwatch key={c} hex={c} selected={scene.background.toLowerCase() === c.toLowerCase()} onClick={() => edit((s) => ({ ...s, background: c }))} />
                ))}
                <label className="swatch custom" style={{ background: scene.background }} title="Custom colour">
                  <input type="color" value={scene.background} onChange={(e) => edit((s) => ({ ...s, background: e.target.value }))} aria-label="Custom backdrop" />
                  <Icon name="edit" size={14} />
                </label>
              </div>
            </Field>
            <div className="row-between">
              <span className="eyebrow">ATELIER signature on exports</span>
              <Toggle on={scene.signature !== false} onChange={(v) => edit((s) => ({ ...s, signature: v }))} label="Signature" />
            </div>
          </>
        )}
      </div>

      {picker && garments && (
        <GarmentPicker
          open
          onClose={() => setPicker(null)}
          garments={garments}
          single={picker.mode === 'replace'}
          disabledIds={scene.items.map((i) => i.garmentId)}
          category={picker.mode === 'replace' ? map.get(picker.id)?.category : undefined}
          title={picker.mode === 'replace' ? 'Replace with…' : 'Add pieces'}
          confirmLabel="Add to board"
          onConfirm={(ids) => (picker.mode === 'replace' ? replacePiece(picker.id, ids[0]) : addPieces(ids))}
        />
      )}
    </div>
  );
}
