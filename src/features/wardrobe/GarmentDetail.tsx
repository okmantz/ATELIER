import { useApp } from '../../app/AppContext';
import { useGarments } from '../../storage/useLive';
import { removeGarment, setStatus, toggleFavorite, logWorn } from '../../storage/garments';
import { Sheet } from '../../components/Sheet';
import { Icon } from '../../components/Icons';
import { ColorDot } from '../../components/ui';
import { useImageUrl } from '../../components/useImageUrl';
import { FORMALITY_LABELS, LAYER_LABELS, CATEGORY_LABELS } from '../../data/taxonomy';
import { nearestColorName } from '../../data/palette';

export default function GarmentDetail() {
  const { detailId, openGarment, navigate, toast, confirm, setAnchorId } = useApp();
  const garments = useGarments();
  const g = garments?.find((x) => x.id === detailId);
  const url = useImageUrl(g?.imageId);
  const close = () => openGarment(undefined);

  if (!detailId) return null;

  const del = async () => {
    if (!g) return;
    const ok = await confirm({
      title: `Delete “${g.name}”?`,
      message: 'This permanently removes the piece and its photos from this device. Saved looks that include it will show a gap. Consider archiving instead.',
      confirmLabel: 'Delete permanently',
      danger: true,
    });
    if (!ok) return;
    await removeGarment(g.id);
    toast('Piece deleted.');
    close();
  };

  const act = async (fn: () => Promise<void>, msg?: string) => {
    try {
      await fn();
      if (msg) toast(msg);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  return (
    <Sheet open onClose={close} tall eyebrow={g ? `${CATEGORY_LABELS[g.category]} · ${g.subcategory}` : undefined} title={g?.name ?? 'Piece'}>
      {!g ? (
        <p className="hint">This piece is no longer available.</p>
      ) : (
        <div className="detail">
          <div className="detail-media">{url ? <img src={url} alt={g.name} /> : <div className="gthumb-ph" style={{ background: g.primaryColor }} />}</div>

          <div className="detail-actions">
            <button type="button" className={`btn ghost${g.favorite ? ' on' : ''}`} onClick={() => act(() => toggleFavorite(g.id))}>
              <Icon name="heart" size={18} filled={g.favorite} /> {g.favorite ? 'Favourited' : 'Favourite'}
            </button>
            <button type="button" className="btn ghost" onClick={() => act(() => logWorn([g.id]), 'Wear logged for today.')}>
              <Icon name="shirt" size={18} /> Wore it today
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setAnchorId(g.id);
                close();
                navigate('/discover');
              }}
            >
              <Icon name="discover" size={18} /> Style around this
            </button>
          </div>

          <dl className="facts">
            <div>
              <dt>Colour</dt>
              <dd>
                <ColorDot hex={g.primaryColor} ring /> {nearestColorName(g.primaryColor)}
                {g.secondaryColors.map((c) => (
                  <ColorDot key={c} hex={c} ring />
                ))}
              </dd>
            </div>
            <div>
              <dt>Layer</dt>
              <dd>{g.layer ? LAYER_LABELS[g.layer] : 'Not a layering piece'}</dd>
            </div>
            <div>
              <dt>Formality</dt>
              <dd>
                {g.formality}/5 · {FORMALITY_LABELS[g.formality]}
              </dd>
            </div>
            <div>
              <dt>Fit for</dt>
              <dd>{g.gender === 'unisex' ? 'Everyone' : g.gender === 'men' ? 'Men' : 'Women'}</dd>
            </div>
            <div>
              <dt>Seasons</dt>
              <dd className="cap">{g.season.length ? g.season.join(', ') : 'Any'}</dd>
            </div>
            <div>
              <dt>Occasions</dt>
              <dd className="cap">{g.occasions.length ? g.occasions.join(', ') : 'Any'}</dd>
            </div>
            <div>
              <dt>Worn</dt>
              <dd>
                {g.wearCount}× {g.lastWorn ? `· last ${g.lastWorn}` : ''}
              </dd>
            </div>
            {g.purchasePrice != null && g.purchasePrice > 0 && (
              <div>
                <dt>Cost per wear</dt>
                <dd>
                  {(g.purchasePrice / Math.max(1, g.wearCount)).toFixed(2)} <small>(paid {g.purchasePrice})</small>
                </dd>
              </div>
            )}
            {(g.brand || g.size) && (
              <div>
                <dt>Label</dt>
                <dd>{[g.brand, g.size && `size ${g.size}`].filter(Boolean).join(' · ')}</dd>
              </div>
            )}
          </dl>

          <div className="eyebrow">Condition</div>
          <div className="chips" style={{ marginBottom: 18 }}>
            {(['clean', 'worn', 'laundry', 'archived'] as const).map((s) => (
              <button key={s} type="button" className={`chip${g.status === s ? ' on' : ''}`} onClick={() => act(() => setStatus([g.id], s), `Marked ${s}.`)}>
                {s === 'laundry' ? 'In laundry' : s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <div className="detail-foot">
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                close();
                navigate(`/garment/${g.id}`);
              }}
            >
              <Icon name="edit" size={18} /> Edit
            </button>
            <button type="button" className="btn ghost danger-text" onClick={del}>
              <Icon name="trash" size={18} /> Delete
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
