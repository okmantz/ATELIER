import { lazy, Suspense } from 'react';
import { AppProvider, useApp } from './AppContext';
import { matchRoute } from './routes';
import { BottomNavigation } from '../components/BottomNavigation';
import WardrobeScreen from '../features/wardrobe/WardrobeScreen';
import GarmentDetail from '../features/wardrobe/GarmentDetail';
import GarmentEditor from '../features/garment-editor/GarmentEditor';
import DiscoverScreen from '../features/outfit-discovery/DiscoverScreen';
import StudioScreen from '../features/outfit-studio/StudioScreen';
import CalendarScreen from '../features/calendar/CalendarScreen';
import SettingsScreen from '../features/settings/SettingsScreen';

const StudioEditor = lazy(() => import('../features/outfit-studio/StudioEditor'));

function Shell() {
  const { route, navigate } = useApp();
  const m = matchRoute(route);

  return (
    <div className="app">
      <main className="screen" key={m.name === 'garment-edit' ? `edit-${m.param}` : m.name}>
        {m.name === 'wardrobe' && <WardrobeScreen />}
        {m.name === 'discover' && <DiscoverScreen />}
        {m.name === 'studio' && <StudioScreen />}
        {m.name === 'studio-edit' && (
          <Suspense fallback={<div className="boot"><span className="serif">Preparing the studio…</span></div>}>
            <StudioEditor />
          </Suspense>
        )}
        {m.name === 'calendar' && <CalendarScreen />}
        {m.name === 'settings' && <SettingsScreen />}
        {m.name === 'garment-new' && <GarmentEditor />}
        {m.name === 'garment-edit' && <GarmentEditor id={m.param} />}
      </main>
      {!m.fullscreen && <BottomNavigation active={m.tab} onNavigate={navigate} />}
      <GarmentDetail />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
