import { useMemo } from 'react';
import type { Garment, SceneItem, SceneMode } from '../types';
import { useImageUrl } from './useImageUrl';
import { mannequinUrl, type MannequinId } from '../features/mannequin-studio/mannequins';
import { OPEN_CLIP, MANNEQUIN_H, RATIOS, type RatioId } from '../features/outfit-studio/layouts';

function PreviewImg({ garment, it, H, full }: { garment: Garment; it: SceneItem; H: number; full?: boolean }) {
  const url = useImageUrl(full ? garment.imageId : garment.thumbnailId);
  if (!url) return null;
  return (
    <img
      src={url}
      alt={garment.name}
      draggable={false}
      loading="lazy"
      style={{
        position: 'absolute',
        left: `${((it.x - it.width / 2) / 1000) * 100}%`,
        top: `${((it.y - it.height / 2) / H) * 100}%`,
        width: `${(it.width / 1000) * 100}%`,
        height: `${(it.height / H) * 100}%`,
        transform: `rotate(${it.rotation}deg)${it.flipX ? ' scaleX(-1)' : ''}`,
        opacity: it.opacity,
        clipPath: it.open ? OPEN_CLIP : undefined,
        filter: 'drop-shadow(0 6px 8px rgba(0,0,0,.16))',
        pointerEvents: 'none',
      }}
    />
  );
}

/** Lightweight CSS rendering of a scene (used in cards, lists, calendar). */
export function LayoutPreview({
  items,
  garments,
  mode = 'flatlay',
  templateId,
  ratio = '4:5',
  background = '#F4F0E8',
  full,
  className = '',
}: {
  items: SceneItem[];
  garments: Map<string, Garment>;
  mode?: SceneMode;
  templateId?: string;
  ratio?: string;
  background?: string;
  full?: boolean;
  className?: string;
}) {
  const H = mode === 'mannequin' ? MANNEQUIN_H : RATIOS[ratio as RatioId] ?? 1250;
  const sorted = useMemo(() => [...items].filter((i) => !i.hidden).sort((a, b) => a.zIndex - b.zIndex), [items]);
  return (
    <div className={`preview ${className}`} style={{ aspectRatio: `1000 / ${H}`, background }}>
      {mode === 'mannequin' && templateId && <img className="preview-mannequin" src={mannequinUrl(templateId as MannequinId)} alt="" draggable={false} />}
      {sorted.map((it) => {
        const g = garments.get(it.garmentId);
        return g ? <PreviewImg key={it.garmentId} garment={g} it={it} H={H} full={full} /> : null;
      })}
    </div>
  );
}
