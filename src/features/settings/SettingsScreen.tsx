import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useApp } from '../../app/AppContext';
import { useGarments } from '../../storage/useLive';
import { estimateStorage, requestPersistence, todayKey } from '../../storage/database';
import { exportWardrobe, restoreWardrobe } from '../../storage/backup';
import { removeSampleGarments } from '../../storage/garments';
import { DEFAULT_SETTINGS } from '../../storage/settings';
import { loadSampleWardrobe, SAMPLES } from '../../samples/sample-wardrobe';
import { downloadBlob } from '../../imaging/export-board';
import { DEFAULT_WEIGHTS } from '../../engine/outfit-scorer';
import type { GenderFocus, Weights } from '../../types';
import { Sheet } from '../../components/Sheet';
import { Icon } from '../../components/Icons';
import { Field, Range, Segmented, Toggle } from '../../components/ui';
import { StatisticsPanel } from '../statistics/StatisticsPanel';

const fmtBytes = (n: number) => (n > 1e9 ? `${(n / 1e9).toFixed(2)} GB` : n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`);

function Section({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <section className="settings-section">
      <div className="eyebrow">{eyebrow}</div>
      <h2 className="serif">{title}</h2>
      {children}
    </section>
  );
}

const WEIGHT_LABELS: Record<keyof Weights, string> = {
  color: 'Colour harmony',
  occasion: 'Occasion & formality',
  compatibility: 'Garment compatibility',
  season: 'Seasonal suitability',
  preference: 'Personal favourites',
  underused: 'Under-used bonus',
};

export default function SettingsScreen() {
  const { settings, updateSettings, toast, confirm } = useApp();
  const garments = useGarments();
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refreshStorage = () => {
    void estimateStorage().then(setStorage);
    void navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
  };
  useEffect(refreshStorage, [garments?.length]);

  const wrap = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const doExport = () =>
    wrap('Preparing backup…', async () => {
      const blob = await exportWardrobe();
      downloadBlob(blob, `ATELIER-backup-${todayKey()}.zip`);
      toast('Backup downloaded. Keep it somewhere safe.');
    });

  const doRestore = (mode: 'merge' | 'replace') =>
    wrap('Restoring…', async () => {
      if (!restoreFile) return;
      if (mode === 'replace') {
        const ok = await confirm({
          title: 'Replace everything?',
          message: 'Your current wardrobe, looks and calendar will be replaced by the backup. A safety backup of what you have now will download first.',
          confirmLabel: 'Back up & replace',
          danger: true,
        });
        if (!ok) return;
        downloadBlob(await exportWardrobe(), `ATELIER-before-restore-${todayKey()}.zip`);
      }
      const r = await restoreWardrobe(restoreFile, mode);
      setRestoreFile(null);
      toast(`Restored ${r.garments} pieces, ${r.outfits} looks, ${r.scenes} compositions${r.skipped ? ` (${r.skipped} already present)` : ''}.`);
      refreshStorage();
    });

  const sampleCount = garments?.filter((g) => g.sample).length ?? 0;
  const weights = settings.weights;
  const pct = storage && storage.quota ? (storage.usage / storage.quota) * 100 : 0;

  return (
    <div className="page">
      <header className="screen-head">
        <div className="eyebrow">Preferences</div>
        <h1 className="display">Settings</h1>
      </header>

      <Section eyebrow="Your collection" title="Insights">
        <StatisticsPanel garments={garments ?? []} />
      </Section>

      <Section eyebrow="Appearance" title="Atmosphere">
        <Field label="Theme">
          <Segmented
            value={settings.theme}
            onChange={(v) => void updateSettings({ theme: v })}
            options={[
              { value: 'system', label: 'Automatic' },
              { value: 'light', label: 'Ivory' },
              { value: 'dark', label: 'Obsidian' },
            ]}
          />
        </Field>
        <Field label="Style focus" hint="Filters your wardrobe view and the outfits composed in Discover. Unisex pieces always appear.">
          <Segmented<GenderFocus>
            value={settings.genderFocus}
            onChange={(v) => void updateSettings({ genderFocus: v })}
            options={[
              { value: 'all', label: 'Everything' },
              { value: 'women', label: 'Women' },
              { value: 'men', label: 'Men' },
            ]}
          />
        </Field>
      </Section>

      <Section eyebrow="Outfit engine" title="Rules & weights">
        <p className="hint">Starting weights for scoring each look out of 100. These are adjustable preferences, not claims about objectively perfect fashion.</p>
        {(Object.keys(WEIGHT_LABELS) as (keyof Weights)[]).map((k) => (
          <Field key={k} label={WEIGHT_LABELS[k]} right={<span className="hint inline">{weights[k]}</span>}>
            <Range label={WEIGHT_LABELS[k]} min={0} max={50} value={weights[k]} onChange={(v) => void updateSettings({ weights: { ...weights, [k]: v } })} />
          </Field>
        ))}
        <Field label="Minimum score" right={<span className="hint inline">{settings.minScore}</span>} hint="Looks scoring below this are hidden.">
          <Range label="Minimum score" min={0} max={80} value={settings.minScore} onChange={(v) => void updateSettings({ minScore: v })} />
        </Field>
        <div className="row-between">
          <span className="eyebrow">Include recently worn pieces</span>
          <Toggle on={settings.includeWorn} onChange={(v) => void updateSettings({ includeWorn: v })} label="Include recently worn" />
        </div>
        <button type="button" className="btn ghost sm" onClick={() => void updateSettings({ weights: { ...DEFAULT_WEIGHTS }, minScore: DEFAULT_SETTINGS.minScore })}>
          Reset engine defaults
        </button>
      </Section>

      <Section eyebrow="Your data" title="Storage & backup">
        <p className="hint">Everything lives in this browser on this device — no account, no cloud. Clearing site data or uninstalling the browser can erase it, so export a backup regularly.</p>
        {storage && (
          <div className="storage">
            <div className="bar">
              <i style={{ width: `${Math.max(1, Math.min(100, pct))}%`, background: pct > 80 ? 'var(--oxblood-ui)' : undefined }} />
            </div>
            <small>
              {fmtBytes(storage.usage)} of ~{fmtBytes(storage.quota)} used{pct > 80 ? ' — running low, export a backup and free space.' : '.'}
            </small>
          </div>
        )}
        <div className="row-between">
          <span className="eyebrow">Protected from automatic clean-up: {persisted == null ? 'unknown' : persisted ? 'yes' : 'not yet'}</span>
          {!persisted && (
            <button type="button" className="link" onClick={() => void requestPersistence().then((ok) => { setPersisted(ok); toast(ok ? 'Storage protected.' : 'The browser declined — installing the app to your home screen usually helps.'); })}>
              Request
            </button>
          )}
        </div>
        <div className="btn-stack">
          <button type="button" className="btn primary" onClick={doExport} disabled={!!busy}>
            <Icon name="download" size={18} /> {busy === 'Preparing backup…' ? busy : 'Export wardrobe (.zip)'}
          </button>
          <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()} disabled={!!busy}>
            <Icon name="upload" size={18} /> Restore from backup…
          </button>
          <input ref={fileRef} type="file" accept=".zip,application/zip" hidden onChange={(e) => { setRestoreFile(e.target.files?.[0] ?? null); e.target.value = ''; }} />
        </div>
      </Section>

      <Section eyebrow="Try it out" title="Sample wardrobe">
        <p className="hint">{SAMPLES.length} illustrated placeholder pieces for men and women, so you can explore Discover and the Studio before photographing your own. They’re marked “Sample”.</p>
        <div className="btn-stack">
          <button
            type="button"
            className="btn ghost"
            disabled={!!busy}
            onClick={() => wrap('Adding…', async () => { await loadSampleWardrobe(); toast('Sample pieces added.'); })}
          >
            {busy === 'Adding…' ? 'Adding pieces…' : 'Add sample pieces'}
          </button>
          {sampleCount > 0 && (
            <button
              type="button"
              className="btn ghost danger-text"
              onClick={async () => {
                if (await confirm({ title: 'Remove sample pieces?', message: `This deletes the ${sampleCount} sample pieces only. Your own garments stay.`, confirmLabel: 'Remove samples', danger: true })) {
                  const n = await removeSampleGarments();
                  toast(`Removed ${n} sample pieces.`);
                }
              }}
            >
              Remove {sampleCount} sample pieces
            </button>
          )}
        </div>
      </Section>

      <Section eyebrow="Install" title="Add to your home screen">
        <ol className="steps">
          <li>Open this page in <b>Chrome</b> on your Android phone (use the https address).</li>
          <li>Tap the <b>⋮</b> menu, then <b>Install app</b> or <b>Add to Home screen</b>.</li>
          <li>Launch <b>ATELIER</b> from your home screen — it opens like a native app.</li>
          <li>Open it once online so it can cache itself, then try airplane mode: your wardrobe and outfit engine keep working.</li>
        </ol>
      </Section>

      <p className="hint center foot">ATELIER 1.0 · A wardrobe, composed.</p>

      <Sheet
        open={!!restoreFile}
        onClose={() => setRestoreFile(null)}
        eyebrow="Restore"
        title={restoreFile?.name ?? ''}
      >
        <p className="hint">Choose how to bring this backup in.</p>
        <div className="btn-stack">
          <button type="button" className="btn primary" disabled={!!busy} onClick={() => void doRestore('merge')}>
            Merge — keep what I have, add what’s missing
          </button>
          <button type="button" className="btn ghost danger-text" disabled={!!busy} onClick={() => void doRestore('replace')}>
            Replace everything with this backup
          </button>
        </div>
        <p className="hint">Merge never overwrites existing items. Replace downloads a safety backup of your current data first.</p>
      </Sheet>
    </div>
  );
}
