import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { useGarments } from '../../storage/useLive';
import { addGarment, getImageBlob, updateGarment } from '../../storage/garments';
import type { Gender, GarmentCategory, GarmentFields, LayerSlot, Occasion, Pattern, SeasonName } from '../../types';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  FORMALITY_LABELS,
  LAYER_LABELS,
  OCCASIONS,
  SEASONS,
  defaultSeasonsFor,
  findSub,
  subOptions,
} from '../../data/taxonomy';
import { NAMED_COLORS, nearestColorName } from '../../data/palette';
import { encodeCanvas, hasTransparency, loadImageCanvas, makeThumbnail, resizeCanvas } from '../../imaging/image-resize';
import { cropFractions, removeBackground, rotateQuarter, trimToContent, type CropFractions } from '../../imaging/image-import';
import { dominantColor } from '../../imaging/color-sampling';
import { Icon } from '../../components/Icons';
import { ColorSwatch } from '../../components/ColorSwatch';
import { Chip, Field, Range, Segmented, Toggle } from '../../components/ui';

const NO_CROP: CropFractions = { top: 0, left: 0, right: 0, bottom: 0 };
const PATTERNS: Pattern[] = ['solid', 'striped', 'checked', 'floral', 'graphic', 'other'];

export default function GarmentEditor({ id }: { id?: string }) {
  const { navigate, back, toast } = useApp();
  const garments = useGarments();
  const existing = id ? garments?.find((g) => g.id === id) : undefined;

  // --- image pipeline ------------------------------------------------------------------------
  const [source, setSource] = useState<HTMLCanvasElement | null>(null);
  const [turns, setTurns] = useState(0);
  const [crop, setCrop] = useState<CropFractions>(NO_CROP);
  const [showCrop, setShowCrop] = useState(false);
  const [bgOn, setBgOn] = useState(false);
  const [bgStrength, setBgStrength] = useState(30);
  const [bgWarn, setBgWarn] = useState(false);
  const [processed, setProcessed] = useState<HTMLCanvasElement | null>(null);
  const [imageDirty, setImageDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const preview = useRef<HTMLCanvasElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);

  // --- form -----------------------------------------------------------------------------------
  const [gender, setGender] = useState<Gender>('unisex');
  const [category, setCategory] = useState<GarmentCategory>('tops');
  const [subcategory, setSubcategory] = useState('T-shirt');
  const [layer, setLayer] = useState<LayerSlot>(1);
  const [warmth, setWarmth] = useState(1);
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [primary, setPrimary] = useState('#8A8D91');
  const [colorTouched, setColorTouched] = useState(false);
  const [secondary, setSecondary] = useState<string[]>([]);
  const [pattern, setPattern] = useState<Pattern>('solid');
  const [seasons, setSeasons] = useState<SeasonName[]>(['spring', 'summer', 'autumn', 'winter']);
  const [occasions, setOccasions] = useState<Occasion[]>(['casual']);
  const [formality, setFormality] = useState(2);
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState('');
  const [price, setPrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [favorite, setFavorite] = useState(false);
  const loadedFor = useRef<string | undefined>();

  // Load an existing garment into the form once.
  useEffect(() => {
    if (!existing || loadedFor.current === existing.id) return;
    loadedFor.current = existing.id;
    setGender(existing.gender);
    setCategory(existing.category);
    setSubcategory(existing.subcategory);
    setLayer(existing.layer);
    setWarmth(existing.warmth);
    setName(existing.name);
    setNameTouched(true);
    setPrimary(existing.primaryColor);
    setColorTouched(true);
    setSecondary(existing.secondaryColors);
    setPattern(existing.pattern);
    setSeasons(existing.season);
    setOccasions(existing.occasions);
    setFormality(existing.formality);
    setBrand(existing.brand ?? '');
    setSize(existing.size ?? '');
    setPrice(existing.purchasePrice != null ? String(existing.purchasePrice) : '');
    setPurchaseDate(existing.purchaseDate ?? '');
    setNotes(existing.notes ?? '');
    setFavorite(existing.favorite);
    getImageBlob(existing.imageId)
      .then((b) => (b ? loadImageCanvas(b, 1600) : null))
      .then((c) => c && setSource(c))
      .catch(() => toast('Could not open the saved photo.', 'error'));
  }, [existing, toast]);

  // Run the image pipeline whenever an edit control changes.
  useEffect(() => {
    if (!source) return;
    const t = setTimeout(() => {
      let c = rotateQuarter(source, turns);
      c = cropFractions(c, crop);
      let warn = false;
      if (bgOn) {
        const r = removeBackground(c, bgStrength);
        if (r) c = trimToContent(r, 18);
        else warn = true;
      }
      setBgWarn(warn);
      setProcessed(c);
    }, 120);
    return () => clearTimeout(t);
  }, [source, turns, crop, bgOn, bgStrength]);

  // Paint the preview and suggest a colour.
  useEffect(() => {
    if (!processed || !preview.current) return;
    const el = preview.current;
    el.width = processed.width;
    el.height = processed.height;
    el.getContext('2d')?.drawImage(processed, 0, 0);
    if (!colorTouched) setPrimary(dominantColor(processed));
  }, [processed, colorTouched]);

  const colorName = useMemo(() => nearestColorName(primary), [primary]);
  useEffect(() => {
    if (!nameTouched && source) setName(`${colorName} ${subcategory.toLowerCase()}`.replace(/^./, (c) => c.toUpperCase()));
  }, [colorName, subcategory, nameTouched, source]);

  const subs = useMemo(() => subOptions(category, gender), [category, gender]);
  const layerable = category === 'tops' || category === 'outerwear' || category === 'one-piece';

  const applySub = (cat: GarmentCategory, sub: string) => {
    const def = findSub(cat, sub);
    setSubcategory(sub);
    if (!def) return;
    setLayer(def.layer);
    setWarmth(def.warmth || 1);
    setFormality(def.formality);
    setSeasons(defaultSeasonsFor(def.warmth, cat));
  };
  const pickCategory = (c: GarmentCategory) => {
    setCategory(c);
    const first = subOptions(c, gender)[0];
    if (first) applySub(c, first.name);
  };
  const pickGender = (g: Gender) => {
    setGender(g);
    const list = subOptions(category, g);
    if (list.length && !list.some((s) => s.name === subcategory)) applySub(category, list[0].name);
  };

  const onFile = async (file?: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const c = await loadImageCanvas(file, 1600);
      setSource(c);
      setTurns(0);
      setCrop(NO_CROP);
      setImageDirty(true);
    } catch {
      toast('That image could not be opened. Try a JPEG or PNG.', 'error');
    } finally {
      setBusy(false);
      if (camera.current) camera.current.value = '';
      if (gallery.current) gallery.current.value = '';
    }
  };

  const toggleIn = <T,>(list: T[], v: T, set: (l: T[]) => void) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const save = async (another: boolean) => {
    const canvas = processed ?? source;
    if (!existing && !canvas) {
      toast('Add a photo first.', 'error');
      return;
    }
    setBusy(true);
    try {
      const fields: GarmentFields = {
        name: name.trim() || `${colorName} ${subcategory}`,
        gender,
        category,
        subcategory,
        layer: layerable ? layer : 0,
        warmth,
        primaryColor: primary,
        secondaryColors: secondary,
        pattern,
        season: seasons,
        occasions,
        formality,
        brand: brand.trim() || undefined,
        size: size.trim() || undefined,
        purchasePrice: price ? Number(price) : undefined,
        purchaseDate: purchaseDate || undefined,
        notes: notes.trim() || undefined,
        status: existing?.status ?? 'clean',
        favorite,
        sample: existing?.sample,
      };
      let images: { full: Awaited<ReturnType<typeof encodeCanvas>>; thumb: Awaited<ReturnType<typeof encodeCanvas>>; hasAlpha: boolean } | undefined;
      if (canvas && (imageDirty || !existing)) {
        const alpha = hasTransparency(canvas);
        images = { full: await encodeCanvas(resizeCanvas(canvas, 1600), alpha), thumb: await makeThumbnail(canvas, 360), hasAlpha: alpha };
      }
      if (existing) {
        await updateGarment(existing.id, fields, images);
        toast('Saved.');
        back('/wardrobe');
      } else if (images) {
        await addGarment({ fields, full: images.full, thumb: images.thumb, hasAlpha: images.hasAlpha });
        toast('Added to your wardrobe.');
        if (another) {
          setSource(null);
          setProcessed(null);
          setImageDirty(false);
          setNameTouched(false);
          setColorTouched(false);
          setBgOn(false);
          setTurns(0);
          setCrop(NO_CROP);
          window.scrollTo(0, 0);
        } else navigate('/wardrobe');
      }
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (id && garments && !existing) {
    return (
      <div className="page">
        <p className="hint">This piece no longer exists.</p>
        <button className="btn ghost" onClick={() => navigate('/wardrobe')}>
          Back to wardrobe
        </button>
      </div>
    );
  }

  return (
    <div className="page editor">
      <header className="editor-bar">
        <button type="button" className="icon-btn" onClick={() => back('/wardrobe')} aria-label="Cancel">
          <Icon name="close" />
        </button>
        <div>
          <div className="eyebrow">{existing ? 'Edit piece' : 'New piece'}</div>
        </div>
        <span style={{ width: 44 }} />
      </header>

      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <input ref={gallery} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />

      {!source ? (
        <section className="capture">
          <h1 className="display">{busy ? 'Opening photo…' : 'Photograph the piece.'}</h1>
          <p className="lede">Lay it flat on a plain, well-lit surface. You can erase the background in the next step.</p>
          <div className="capture-actions">
            <button type="button" className="btn primary big" onClick={() => camera.current?.click()} disabled={busy}>
              <Icon name="camera" size={20} /> Take photo
            </button>
            <button type="button" className="btn ghost big" onClick={() => gallery.current?.click()} disabled={busy}>
              <Icon name="image" size={20} /> Import from gallery
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="workspace">
            <div className="checker">
              <canvas ref={preview} className="workspace-canvas" />
            </div>
            <div className="tools">
              <button type="button" className="tool" onClick={() => { setTurns((t) => t - 1); setImageDirty(true); }}>
                <Icon name="rotateL" size={18} /> Rotate
              </button>
              <button type="button" className="tool" onClick={() => { setTurns((t) => t + 1); setImageDirty(true); }}>
                <Icon name="rotateR" size={18} /> Rotate
              </button>
              <button type="button" className={`tool${showCrop ? ' on' : ''}`} onClick={() => setShowCrop((s) => !s)}>
                <Icon name="grid" size={18} /> Crop
              </button>
              <button
                type="button"
                className={`tool${bgOn ? ' on' : ''}`}
                onClick={() => { setBgOn((b) => !b); setImageDirty(true); }}
              >
                <Icon name="sparkle" size={18} /> Erase backdrop
              </button>
              <button type="button" className="tool" onClick={() => gallery.current?.click()}>
                <Icon name="image" size={18} /> Replace
              </button>
            </div>
            {showCrop && (
              <div className="crop-panel">
                {(['top', 'bottom', 'left', 'right'] as const).map((k) => (
                  <label key={k}>
                    <span className="eyebrow">{k}</span>
                    <Range
                      label={`Crop ${k}`}
                      value={Math.round(crop[k] * 100)}
                      min={0}
                      max={45}
                      onChange={(v) => { setCrop((c) => ({ ...c, [k]: v / 100 })); setImageDirty(true); }}
                    />
                  </label>
                ))}
              </div>
            )}
            {bgOn && (
              <div className="crop-panel">
                <label>
                  <span className="eyebrow">Backdrop strength</span>
                  <Range label="Backdrop strength" value={bgStrength} min={4} max={80} onChange={(v) => { setBgStrength(v); setImageDirty(true); }} />
                </label>
                <p className="hint">
                  {bgWarn
                    ? 'That would erase almost the whole photo. Lower the strength, or use a contrasting backdrop.'
                    : 'Works best on a plain backdrop that differs from the garment. Raise the strength to remove shadows.'}
                </p>
              </div>
            )}
          </section>

          <section className="form">
            <Field label="Name">
              <input className="input" value={name} onChange={(e) => { setName(e.target.value); setNameTouched(true); }} placeholder="e.g. Navy wool blazer" />
            </Field>

            <Field label="For">
              <Segmented<Gender>
                value={gender}
                onChange={pickGender}
                options={[
                  { value: 'women', label: 'Women' },
                  { value: 'men', label: 'Men' },
                  { value: 'unisex', label: 'Unisex' },
                ]}
              />
            </Field>

            <Field label="Category">
              <div className="chips">
                {CATEGORIES.map((c) => (
                  <Chip key={c} active={category === c} onClick={() => pickCategory(c)}>
                    {CATEGORY_LABELS[c]}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Type">
              <div className="chips">
                {subs.map((s) => (
                  <Chip key={s.name} active={subcategory === s.name} onClick={() => applySub(category, s.name)}>
                    {s.name}
                  </Chip>
                ))}
              </div>
            </Field>

            {layerable && (
              <Field label="Layering position" hint="Sets where this piece sits when outfits are stacked: against the skin, over a base, or outermost.">
                <Segmented<number>
                  value={layer}
                  onChange={(v) => setLayer(v as LayerSlot)}
                  options={[1, 2, 3, 4].map((n) => ({ value: n, label: LAYER_LABELS[n] }))}
                />
              </Field>
            )}

            <Field label="Colour" right={<span className="hint inline">{colorName}</span>}>
              <div className="swatches">
                {NAMED_COLORS.map((c) => (
                  <ColorSwatch key={c.hex} hex={c.hex} label={c.name} selected={primary.toLowerCase() === c.hex.toLowerCase()} onClick={() => { setPrimary(c.hex); setColorTouched(true); }} />
                ))}
                <label className="swatch custom" title="Pick any colour" style={{ background: primary }}>
                  <input type="color" value={primary} onChange={(e) => { setPrimary(e.target.value); setColorTouched(true); }} aria-label="Custom colour" />
                  <Icon name="edit" size={14} />
                </label>
              </div>
              {source && (
                <button type="button" className="link" onClick={() => { setColorTouched(false); if (processed) setPrimary(dominantColor(processed)); }}>
                  Suggest from photo
                </button>
              )}
            </Field>

            <Field label="Accent colours" hint="Optional — up to two.">
              <div className="swatches">
                {NAMED_COLORS.slice(0, 29).map((c) => (
                  <ColorSwatch
                    key={c.hex}
                    hex={c.hex}
                    size={26}
                    label={c.name}
                    selected={secondary.includes(c.hex)}
                    onClick={() => setSecondary((s) => (s.includes(c.hex) ? s.filter((x) => x !== c.hex) : s.length < 2 ? [...s, c.hex] : s))}
                  />
                ))}
              </div>
            </Field>

            <Field label="Pattern">
              <div className="chips">
                {PATTERNS.map((p) => (
                  <Chip key={p} active={pattern === p} onClick={() => setPattern(p)}>
                    {p[0].toUpperCase() + p.slice(1)}
                  </Chip>
                ))}
              </div>
            </Field>

            <Field label="Seasons">
              <div className="chips">
                {SEASONS.map((s) => (
                  <Chip key={s.id} active={seasons.includes(s.id)} onClick={() => toggleIn(seasons, s.id, setSeasons)}>
                    {s.label}
                  </Chip>
                ))}
              </div>
            </Field>

            <Field label="Occasions">
              <div className="chips">
                {OCCASIONS.map((o) => (
                  <Chip key={o.id} active={occasions.includes(o.id)} onClick={() => toggleIn(occasions, o.id, setOccasions)}>
                    {o.label}
                  </Chip>
                ))}
              </div>
            </Field>

            <Field label="Formality" right={<span className="hint inline">{formality}/5 · {FORMALITY_LABELS[formality]}</span>}>
              <Range label="Formality" value={formality} min={1} max={5} onChange={setFormality} />
            </Field>

            {layerable && (
              <Field label="Warmth" right={<span className="hint inline">{warmth}/5</span>} hint="How insulating is it? Used to balance layers against the season.">
                <Range label="Warmth" value={warmth} min={1} max={5} onChange={setWarmth} />
              </Field>
            )}

            <div className="two">
              <Field label="Brand">
                <input className="input" value={brand} onChange={(e) => setBrand(e.target.value)} />
              </Field>
              <Field label="Size">
                <input className="input" value={size} onChange={(e) => setSize(e.target.value)} />
              </Field>
              <Field label="Price paid">
                <input className="input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} />
              </Field>
              <Field label="Purchased">
                <input className="input" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
              </Field>
            </div>
            <Field label="Notes">
              <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <div className="row-between">
              <span className="eyebrow">Mark as favourite</span>
              <Toggle on={favorite} onChange={setFavorite} label="Favourite" />
            </div>
          </section>

          <footer className="editor-foot">
            {!existing && (
              <button type="button" className="btn ghost" disabled={busy} onClick={() => save(true)}>
                Save &amp; add another
              </button>
            )}
            <button type="button" className="btn primary" disabled={busy} onClick={() => save(false)}>
              {busy ? 'Saving…' : existing ? 'Save changes' : 'Save to wardrobe'}
            </button>
          </footer>
        </>
      )}
    </div>
  );
}
