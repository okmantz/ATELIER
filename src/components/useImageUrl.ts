import { useEffect, useState } from 'react';
import { db } from '../storage/database';

interface Entry {
  url?: string;
  refs: number;
  promise: Promise<string | undefined>;
}
const cache = new Map<string, Entry>();

function acquire(id: string): Entry {
  let e = cache.get(id);
  if (!e) {
    const entry: Entry = {
      refs: 0,
      promise: db.images.get(id).then((rec) => {
        if (!rec) return undefined;
        entry.url = URL.createObjectURL(rec.blob);
        return entry.url;
      }),
    };
    cache.set(id, entry);
    e = entry;
  }
  e.refs++;
  return e;
}

function release(id: string) {
  const e = cache.get(id);
  if (!e) return;
  e.refs--;
  if (e.refs <= 0) {
    // Keep decoded blobs around briefly so scrolling back and forth stays instant.
    setTimeout(() => {
      if (e.refs <= 0 && cache.get(id) === e) {
        cache.delete(id);
        if (e.url) URL.revokeObjectURL(e.url);
      }
    }, 45000);
  }
}

/** Object URL for an image stored in IndexedDB. Reference counted and cached. */
export function useImageUrl(id?: string): string | undefined {
  const [url, setUrl] = useState<string | undefined>(() => (id ? cache.get(id)?.url : undefined));
  useEffect(() => {
    if (!id) {
      setUrl(undefined);
      return;
    }
    let alive = true;
    const entry = acquire(id);
    if (entry.url) setUrl(entry.url);
    else
      entry.promise.then((u) => {
        if (alive) setUrl(u);
      });
    return () => {
      alive = false;
      release(id);
    };
  }, [id]);
  return url;
}

/** Load an image element for canvas use. */
export function useHtmlImage(url?: string): HTMLImageElement | undefined {
  const [img, setImg] = useState<HTMLImageElement>();
  useEffect(() => {
    if (!url) {
      setImg(undefined);
      return;
    }
    let alive = true;
    const el = new Image();
    el.decoding = 'async';
    el.onload = () => alive && setImg(el);
    el.src = url;
    return () => {
      alive = false;
    };
  }, [url]);
  return img;
}
