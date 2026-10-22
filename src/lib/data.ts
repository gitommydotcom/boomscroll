import { editionId, type Edition, type EditionIndex, type Item } from '../../shared/types';

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

export interface RecentItem {
  item: Item;
  edition: string;
}

let recent: { key: string; p: Promise<RecentItem[]> } | null = null;

/**
 * I contenuti delle ultime edizioni (senza doppioni), per Seguiti, Esplora, profili e ricerca.
 * Il più recente prima.
 */
export function loadRecent(editions = 9): Promise<RecentItem[]> {
  const p = fetchIndex().then(async (idx) => {
    const ids = (idx?.editions ?? []).slice(0, editions).map(editionId);
    const key = ids.join(',');
    if (recent?.key === key) return recent.p;
    const list = (async () => {
      const eds = await Promise.all(ids.map((id) => fetchEdition(id)));
      const seen = new Set<string>();
      const out: RecentItem[] = [];
      eds.forEach((e, k) => {
        for (const item of e?.items ?? []) {
          if (seen.has(item.id)) continue;
          seen.add(item.id);
          out.push({ item, edition: ids[k] });
        }
      });
      return out;
    })();
    recent = { key, p: list };
    return list;
  });
  return p;
}
