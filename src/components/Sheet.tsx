import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icons';

export function Sheet({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  tall,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  tall?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className={`sheet${tall ? ' tall' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grab" />
        <header className="sheet-head">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {title && <h2 className="serif">{title}</h2>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </header>
        <div className="sheet-body">{children}</div>
        {footer && <footer className="sheet-foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
