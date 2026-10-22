import type { Item } from '../shared/types';
import { getJson, mapLimit } from './util';

/** Alcune fonti nei feed danno solo miniature: dove l'indirizzo lo consente chiediamo una versione più grande. */
export function upgradeImage(url: string): string {
  // BBC: /ace/standard/240/… → /ace/standard/976/…
  const bbc = url.replace(/(ichef\.bbci\.co\.uk\/(?:ace|news)\/(?:standard|ws))\/(\d+)\//, (m, base: string, w: string) =>
    Number(w) < 976 ? `${base}/976/` : m,
  );
  return bbc;
}

const SKIP_KINDS = new Set(['chess', 'word', 'poem', 'comic']);

async function wikiImage(lang: string, query: string): Promise<{ src: string; title: string } | null> {
  const url =
    `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&generator=search` +
    `&gsrsearch=${encodeURIComponent(query)}&gsrlimit=3&gsrnamespace=0&prop=pageimages&piprop=thumbnail&pithumbsize=1000&pilicense=free`;
  const data = await getJson<any>(url);
  const pages = Object.values(data.query?.pages ?? {}) as any[];
  const hit = pages.sort((a, b) => a.index - b.index).find((p) => p.thumbnail?.source && !/\.svg/i.test(p.thumbnail.source));
  return hit ? { src: hit.thumbnail.source, title: hit.title } : null;
}

/**
 * Per i contenuti senza immagine cerca un'immagine libera su Wikipedia a partire dagli
 * argomenti (tag dell'IA) o, in mancanza, dal titolo. Viene segnalata come illustrativa.
 */
export async function illustrate(items: Item[]): Promise<number> {
  const todo = items.filter((i) => !i.image && !SKIP_KINDS.has(i.kind));
  let found = 0;
  await mapLimit(todo, 4, async (item) => {
    const queries: [string, string][] = [
      ...item.tags.slice(0, 3).map((t): [string, string] => ['it', t]),
      [item.lang.startsWith('it') ? 'it' : 'en', item.title.split(/[:—–|]/)[0].slice(0, 80)],
    ];
    for (const [lang, q] of queries) {
      try {
        const hit = await wikiImage(lang, q);
        if (hit) {
          item.image = hit.src;
          item.imageAlt = hit.title;
          item.imageNote = `Immagine illustrativa · Wikipedia, “${hit.title}”`;
          found++;
          return;
        }
      } catch {
        // Wikipedia non raggiungibile: la card resta tipografica
      }
    }
  });
  return found;
}
