import type { RawItem } from './fetchers';
import { decodeEntities, http, mapLimit } from './util';

const SKIP = new Set(['youtube', 'apod', 'cleveland', 'aic', 'wikipedia', 'xkcd', 'lichess', 'poetrydb']);

function meta(html: string, ...names: string[]): string | undefined {
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`,
      'i',
    );
    const m = re.exec(html);
    if (m) return decodeEntities(m[1] ?? m[2]).trim();
  }
  return undefined;
}

/**
 * Per i contenuti senza immagine o con poco testo legge i metadati della pagina
 * originale (og:image, og:description). Solo l'intestazione, niente testo integrale.
 */
export async function enrich(items: RawItem[]): Promise<void> {
  const todo = items.filter((i) => !SKIP.has(i.source.type) && (!i.image || i.text.length < 160));
  await mapLimit(todo, 8, async (item) => {
    try {
      const res = await http(item.url, { timeoutMs: 10_000, headers: { Accept: 'text/html' } });
      if (!res.ok || !(res.headers.get('content-type') ?? '').includes('html')) return;
      const html = (await res.text()).slice(0, 300_000);
      const head = html.split(/<\/head>/i)[0];
      if (!item.image) {
        const img = meta(head, 'og:image', 'og:image:url', 'twitter:image', 'twitter:image:src');
        if (img) item.image = new URL(img, item.url).toString();
        item.imageAlt ??= meta(head, 'og:image:alt', 'twitter:image:alt');
      }
      if (item.text.length < 160) {
        const desc = meta(head, 'og:description', 'description', 'twitter:description');
        if (desc && desc.length > item.text.length) item.text = desc;
      }
    } catch {
      // pagina irraggiungibile: teniamo quello che abbiamo
    }
  });
}
