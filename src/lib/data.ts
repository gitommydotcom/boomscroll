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

/** `fresh`: ignora la copia già caricata in questa sessione (edizione rigenerata). */
export function fetchEdition(id: string, fresh = false): Promise<Edition | null> {
  if (fresh) cache.delete(id);
  const date = id;
  let p = cache.get(date);
  if (!p) {
    p = fetch(`${BASE}data/editions/${date}.json`, fresh ? { cache: 'no-cache' } : undefined)
      .then((r) => (r.ok ? (r.json() as Promise<Edition>) : null))
      .catch(() => null);
    cache.set(date, p);
    p.then((e) => {
      if (!e) cache.delete(date);
    });
  }
  return p;
}
