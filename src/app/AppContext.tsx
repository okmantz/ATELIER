import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppSettings, OutfitScene } from '../types';
import { DEFAULT_SETTINGS, loadSettings, mergeSettings, saveSettings } from '../storage/settings';
import { requestPersistence } from '../storage/database';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'error';
}

interface Ctx {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  route: string;
  navigate: (path: string) => void;
  back: (fallback?: string) => void;
  toast: (text: string, kind?: 'info' | 'error') => void;
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  draft: OutfitScene | null;
  setDraft: (s: OutfitScene | null) => void;
  anchorId: string | undefined;
  setAnchorId: (id: string | undefined) => void;
  detailId: string | undefined;
  openGarment: (id: string | undefined) => void;
}

const AppCtx = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp outside provider');
  return c;
}

const readHash = () => (typeof location !== 'undefined' ? location.hash.replace(/^#/, '') || '/wardrobe' : '/wardrobe');

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const settingsRef = useRef(settings);
  const [ready, setReady] = useState(false);
  const [route, setRoute] = useState(readHash());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<{ o: ConfirmOptions; resolve: (v: boolean) => void } | null>(null);
  const [draft, setDraft] = useState<OutfitScene | null>(null);
  const [anchorId, setAnchorId] = useState<string | undefined>();
  const [detailId, setDetailId] = useState<string | undefined>();

  useEffect(() => {
    loadSettings()
      .then((s) => {
        settingsRef.current = s;
        setSettings(s);
      })
      .finally(() => setReady(true));
    void requestPersistence();
  }, []);

  useEffect(() => {
    const onHash = () => setRoute(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Theme
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && mq.matches);
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#171715' : '#F4F0E8');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [settings.theme]);

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const next = mergeSettings({ ...settingsRef.current, ...patch });
    settingsRef.current = next;
    setSettings(next);
    await saveSettings(next);
  }, []);

  const navigate = useCallback((path: string) => {
    if (readHash() === path) setRoute(path);
    else location.hash = path;
    window.scrollTo(0, 0);
  }, []);

  const back = useCallback((fallback = '/wardrobe') => {
    if (window.history.length > 1) window.history.back();
    else navigate(fallback);
  }, [navigate]);

  const toast = useCallback((text: string, kind: 'info' | 'error' = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 3000);
  }, []);

  const confirm = useCallback(
    (o: ConfirmOptions) => new Promise<boolean>((resolve) => setConfirmState({ o, resolve })),
    [],
  );
  const closeConfirm = (v: boolean) => {
    confirmState?.resolve(v);
    setConfirmState(null);
  };

  const value = useMemo<Ctx>(
    () => ({ settings, updateSettings, route, navigate, back, toast, confirm, draft, setDraft, anchorId, setAnchorId, detailId, openGarment: setDetailId }),
    [settings, updateSettings, route, navigate, back, toast, confirm, draft, anchorId, detailId],
  );

  if (!ready) return <div className="boot"><span className="serif">ATELIER</span></div>;

  return (
    <AppCtx.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.text}
          </div>
        ))}
      </div>
      {confirmState && (
        <div className="sheet-backdrop center" onClick={() => closeConfirm(false)}>
          <div className="dialog" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3 className="serif">{confirmState.o.title}</h3>
            {confirmState.o.message && <p>{confirmState.o.message}</p>}
            <div className="dialog-actions">
              <button type="button" className="btn ghost" onClick={() => closeConfirm(false)}>
                {confirmState.o.cancelLabel ?? 'Cancel'}
              </button>
              <button type="button" className={`btn ${confirmState.o.danger ? 'danger' : 'primary'}`} onClick={() => closeConfirm(true)}>
                {confirmState.o.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppCtx.Provider>
  );
}
