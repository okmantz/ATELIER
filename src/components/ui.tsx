import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icons';

export function Chip({ active, onClick, children, disabled, title }: { active?: boolean; onClick?: () => void; children: ReactNode; disabled?: boolean; title?: string }) {
  return (
    <button type="button" className={`chip${active ? ' on' : ''}`} onClick={onClick} disabled={disabled} aria-pressed={active} title={title}>
      {children}
    </button>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  small,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  small?: boolean;
}) {
  return (
    <div className={`seg${small ? ' sm' : ''}`} role="group">
      {options.map((o) => (
        <button key={String(o.value)} type="button" className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)} aria-pressed={o.value === value}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, children, right }: { label: string; hint?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="field">
      <div className="field-head">
        <span className="eyebrow">{label}</span>
        {right}
      </div>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export function Range({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label?: string;
}) {
  return (
    <input
      className="range"
      type="range"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ ['--pct' as string]: `${((value - min) / (max - min)) * 100}%` }}
    />
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`toggle${on ? ' on' : ''}`} onClick={() => onChange(!on)}>
      <span />
    </button>
  );
}

export function IconButton({ icon, label, onClick, active, size = 22, className = '' }: { icon: IconName; label: string; onClick?: () => void; active?: boolean; size?: number; className?: string }) {
  return (
    <button type="button" className={`icon-btn${active ? ' on' : ''} ${className}`} onClick={onClick} aria-label={label} title={label}>
      <Icon name={icon} size={size} />
    </button>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <h3 className="serif">{title}</h3>
      {children && <p>{children}</p>}
      {action && <div className="empty-actions">{action}</div>}
    </div>
  );
}

export function ScoreRing({ value, size = 54 }: { value: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  return (
    <div className="ring" style={{ width: size, height: size }} title={`Score ${value.toFixed(0)} / 100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="1.5" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--gold)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="serif">{Math.round(value)}</span>
    </div>
  );
}

export function ColorDot({ hex, size = 14, ring }: { hex: string; size?: number; ring?: boolean }) {
  return <span className={`dot${ring ? ' ring' : ''}`} style={{ background: hex, width: size, height: size }} />;
}
