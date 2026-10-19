import type { IconName } from '../components/Icons';
import type { Match } from './routes';

export const NAV_ITEMS: { tab: Match['tab']; path: string; label: string; icon: IconName }[] = [
  { tab: 'wardrobe', path: '/wardrobe', label: 'Wardrobe', icon: 'wardrobe' },
  { tab: 'discover', path: '/discover', label: 'Discover', icon: 'discover' },
  { tab: 'studio', path: '/studio', label: 'Studio', icon: 'studio' },
  { tab: 'calendar', path: '/calendar', label: 'Calendar', icon: 'calendar' },
  { tab: 'settings', path: '/settings', label: 'Settings', icon: 'settings' },
];
