import type { CalendarEntry } from '../types';
import { db, nowIso, uid } from './database';
import { logWorn } from './garments';

export async function setPlan(date: string, garmentIds: string[], label?: string): Promise<CalendarEntry> {
  const existing = await db.calendarEntries.where('date').equals(date).first();
  if (existing) {
    const next = { ...existing, garmentIds, label, worn: false };
    await db.calendarEntries.put(next);
    return next;
  }
  const entry: CalendarEntry = { id: uid(), date, garmentIds, label, worn: false, createdAt: nowIso() };
  await db.calendarEntries.add(entry);
  return entry;
}

export async function setNote(date: string, note: string): Promise<void> {
  const existing = await db.calendarEntries.where('date').equals(date).first();
  if (existing) await db.calendarEntries.update(existing.id, { note });
  else await db.calendarEntries.add({ id: uid(), date, garmentIds: [], note, worn: false, createdAt: nowIso() });
}

export async function markEntryWorn(entry: CalendarEntry): Promise<void> {
  if (entry.worn || !entry.garmentIds.length) return;
  await logWorn(entry.garmentIds, entry.date);
  await db.calendarEntries.update(entry.id, { worn: true });
}

export async function clearEntry(id: string): Promise<void> {
  await db.calendarEntries.delete(id);
}
