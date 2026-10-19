import { useMemo, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { useCalendar, useGarments, useOutfits, useScenes } from '../../storage/useLive';
import { clearEntry, markEntryWorn, setNote, setPlan } from '../../storage/calendar';
import { todayKey } from '../../storage/database';
import type { CalendarEntry, Garment } from '../../types';
import { Sheet } from '../../components/Sheet';
import { Icon } from '../../components/Icons';
import { LayoutPreview } from '../../components/LayoutPreview';
import { GarmentThumb } from '../../components/GarmentCard';
import { IconButton } from '../../components/ui';
import { GarmentPicker } from '../outfit-studio/GarmentPicker';
import { layoutFlatlay } from '../outfit-studio/layouts';

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const key = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

function EntryPreview({ ids, map }: { ids: string[]; map: Map<string, Garment> }) {
  const items = ids.map((i) => map.get(i)).filter((g): g is Garment => !!g);
  const scene = useMemo(() => layoutFlatlay(items, 'classic', '4:5'), [items]);
  if (!items.length) return null;
  return <LayoutPreview items={scene} garments={map} />;
}

export default function CalendarScreen() {
  const { toast } = useApp();
  const entries = useCalendar();
  const garments = useGarments();
  const outfits = useOutfits();
  const scenes = useScenes();
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [day, setDay] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);

  const map = useMemo(() => new Map((garments ?? []).map((g) => [g.id, g])), [garments]);
  const byDate = useMemo(() => new Map((entries ?? []).map((e) => [e.date, e])), [entries]);

  const first = new Date(cursor.y, cursor.m, 1);
  const lead = first.getDay();
  const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const monthLabel = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const today = todayKey();
  const entry: CalendarEntry | undefined = day ? byDate.get(day) : undefined;

  const shift = (n: number) => setCursor((c) => {
    const d = new Date(c.y, c.m + n, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const plan = async (ids: string[], label?: string) => {
    if (!day) return;
    try {
      await setPlan(day, ids, label);
      setPicker(false);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const wear = async () => {
    if (!entry) return;
    await markEntryWorn(entry);
    toast('Marked as worn — wear counts updated.');
  };

  const prettyDay = day ? new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : '';

  return (
    <div className="page">
      <header className="screen-head">
        <div className="eyebrow">The diary</div>
        <h1 className="display">Calendar</h1>
        <p className="lede">Plan what you’ll wear and keep an honest record of what you did.</p>
      </header>

      <div className="month-bar">
        <IconButton icon="left" label="Previous month" onClick={() => shift(-1)} />
        <h2 className="serif">{monthLabel}</h2>
        <IconButton icon="right" label="Next month" onClick={() => shift(1)} />
      </div>

      <div className="cal">
        {WEEK.map((w, i) => (
          <div key={i} className="cal-dow">
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const k = key(cursor.y, cursor.m, d);
          const e = byDate.get(k);
          const firstG = e?.garmentIds.map((id) => map.get(id)).find(Boolean);
          return (
            <button key={i} type="button" className={`cal-day${k === today ? ' today' : ''}${e?.worn ? ' worn' : ''}${e ? ' planned' : ''}`} onClick={() => setDay(k)}>
              <span>{d}</span>
              {firstG ? <GarmentThumb garment={firstG} className="cal-thumb" /> : e?.note ? <i className="dot-note" /> : null}
            </button>
          );
        })}
      </div>

      <p className="hint center">Tap a day to plan an outfit. A gold ring marks outfits already worn.</p>

      <Sheet open={!!day} onClose={() => setDay(null)} eyebrow={day === today ? 'Today' : 'Plan'} title={prettyDay} tall>
        {entry && entry.garmentIds.length > 0 && (
          <div className="day-plan">
            <EntryPreview ids={entry.garmentIds} map={map} />
            <div className="day-actions">
              {entry.worn ? (
                <span className="badge worn static">Worn</span>
              ) : (
                <button type="button" className="btn primary" onClick={wear}>
                  <Icon name="check" size={17} /> Mark as worn
                </button>
              )}
              <button type="button" className="btn ghost" onClick={() => entry && void clearEntry(entry.id)}>
                <Icon name="trash" size={17} /> Clear
              </button>
            </div>
          </div>
        )}

        <div className="eyebrow" style={{ marginTop: 18 }}>
          {entry?.garmentIds.length ? 'Change outfit' : 'Choose an outfit'}
        </div>
        <div className="pick-row">
          {(outfits ?? []).map((o) => (
            <button key={o.id} type="button" className="pick" onClick={() => plan(o.garmentIds, o.name)}>
              <EntryPreview ids={o.garmentIds} map={map} />
              <small>{o.name}</small>
            </button>
          ))}
          {(scenes ?? []).map((s) => (
            <button key={s.id} type="button" className="pick" onClick={() => plan(s.items.map((i) => i.garmentId), s.name)}>
              <EntryPreview ids={s.items.map((i) => i.garmentId)} map={map} />
              <small>{s.name}</small>
            </button>
          ))}
          <button type="button" className="pick add" onClick={() => setPicker(true)}>
            <Icon name="plus" size={24} />
            <small>Pick pieces</small>
          </button>
        </div>
        {!(outfits?.length || scenes?.length) && <p className="hint">Save looks from Discover or Studio to reuse them here.</p>}

        <div className="eyebrow" style={{ marginTop: 18 }}>
          Note
        </div>
        <textarea
          key={day ?? 'none'}
          className="input"
          rows={2}
          placeholder="Dinner at 8, rain forecast…"
          defaultValue={entry?.note ?? ''}
          onBlur={(e) => day && e.target.value !== (entry?.note ?? '') && void setNote(day, e.target.value)}
        />
      </Sheet>

      {picker && garments && <GarmentPicker open onClose={() => setPicker(false)} garments={garments} title="Pieces for this day" confirmLabel="Plan this outfit" onConfirm={(ids) => plan(ids, 'Custom')} />}
    </div>
  );
}
