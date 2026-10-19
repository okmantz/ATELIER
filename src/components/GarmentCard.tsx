import type { Garment } from '../types';
import { LAYER_LABELS } from '../data/taxonomy';
import { Icon } from './Icons';
import { ColorDot } from './ui';
import { useImageUrl } from './useImageUrl';

export function GarmentThumb({ garment, className = '' }: { garment: Garment; className?: string }) {
  const url = useImageUrl(garment.thumbnailId);
  return (
    <div className={`gthumb ${className}`}>
      {url ? <img src={url} alt={garment.name} loading="lazy" draggable={false} /> : <div className="gthumb-ph" style={{ background: garment.primaryColor }} />}
    </div>
  );
}

export function GarmentCard({ garment, onClick, selected, index = 0 }: { garment: Garment; onClick?: () => void; selected?: boolean; index?: number }) {
  const dim = garment.status === 'laundry' || garment.status === 'archived';
  return (
    <button type="button" className={`gcard${selected ? ' selected' : ''}${dim ? ' dim' : ''}`} onClick={onClick} style={{ animationDelay: `${Math.min(index, 12) * 28}ms` }}>
      <div className="gcard-media">
        <GarmentThumb garment={garment} />
        {garment.favorite && (
          <span className="gcard-fav" aria-label="Favourite">
            <Icon name="heart" size={15} filled />
          </span>
        )}
        {garment.status !== 'clean' && <span className={`badge ${garment.status}`}>{garment.status === 'laundry' ? 'Laundry' : garment.status === 'worn' ? 'Worn' : 'Archived'}</span>}
        {garment.layer > 0 && garment.category !== 'one-piece' && <span className="badge layer">{LAYER_LABELS[garment.layer]}</span>}
        {selected && (
          <span className="gcard-check">
            <Icon name="check" size={16} />
          </span>
        )}
      </div>
      <div className="gcard-meta">
        <div className="gcard-name">{garment.name}</div>
        <div className="gcard-sub">
          <ColorDot hex={garment.primaryColor} size={9} ring />
          <span>
            {garment.subcategory}
            {garment.brand ? ` · ${garment.brand}` : ''}
          </span>
        </div>
      </div>
    </button>
  );
}
