import type { Edition, EditionIndex } from '../../shared/types';

const BASE = import.meta.env.BASE_URL;
const cache = new Map<string, Promise<Edition | null>>();

export async function fetchIndex(): Promise<EditionIndex | null> {
  try {
    const res = await fetch(`${BASE}data/index.json`, { cache: 'no-cache' });
    if (!res.ok) return null;
    return (await res.json()) as EditionIndex;
  } catch {
    return null;
  }
}

export function fetchEdition(date: string): Promise<Edition | null> {
  let p = cache.get(date);
  if (!p) {
    p = fetch(`${BASE}data/editions/${date}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<Edition>) : null))
      .catch(() => null);
    cache.set(date, p);
    p.then((e) => {
      if (!e) cache.delete(date);
    });
  }
  return p;
}
