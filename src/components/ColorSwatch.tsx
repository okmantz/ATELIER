import { readableOn } from '../imaging/color-sampling';
import { Icon } from './Icons';

export function ColorSwatch({ hex, label, selected, onClick, size = 34 }: { hex: string; label?: string; selected?: boolean; onClick?: () => void; size?: number }) {
  return (
    <button
      type="button"
      className={`swatch${selected ? ' on' : ''}`}
      style={{ background: hex, width: size, height: size, color: readableOn(hex) }}
      onClick={onClick}
      aria-label={label ?? hex}
      aria-pressed={selected}
      title={label ?? hex}
    >
      {selected && <Icon name="check" size={size * 0.5} />}
    </button>
  );
}
