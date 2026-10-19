import { NAV_ITEMS } from '../app/navigation';
import type { Match } from '../app/routes';
import { Icon } from './Icons';

export function BottomNavigation({ active, onNavigate }: { active: Match['tab']; onNavigate: (path: string) => void }) {
  return (
    <nav className="nav" aria-label="Primary">
      {NAV_ITEMS.map((n) => (
        <button key={n.tab} type="button" className={`nav-item${active === n.tab ? ' on' : ''}`} onClick={() => onNavigate(n.path)} aria-current={active === n.tab ? 'page' : undefined}>
          <Icon name={n.icon} size={22} />
          <span>{n.label}</span>
        </button>
      ))}
    </nav>
  );
}
