import { Chess } from 'chess.js';
import type { Item, ItemKind } from '../shared/types';
import { parseFeed } from './rss';
import type { SourceDef } from './sources';
import { getJson, getText, htmlToText, http, itemId, readingMinutes } from './util';

/** Contenuto grezzo, prima del riassunto. */
export interface RawItem {
  source: SourceDef;
  url: string;
  title: string;
  text: string;
  image?: string;
  imageAlt?: string;
  publishedAt?: Date;
  author?: string;
  kind: ItemKind;
  lang: string;
  /** Campi già pronti (opera d'arte, scacchi, video…). */
  extra?: Partial<Item>;
  /** Il testo è già un riassunto italiano completo: l'IA serve solo per tag e quiz. */
  presummarized?: boolean;
}

export interface FetchContext {
  date: string;
  now: Date;
  rng: () => number;
  seen: Set<string>;
}

const fresh = (src: SourceDef, ctx: FetchContext, d?: Date) =>
  !d || ctx.now.getTime() - d.getTime() <= (src.maxAgeDays ?? 3) * 86_400_000;

const matches = (src: SourceDef, text: string) => (src.match ?? []).every((re) => re.test(text));

async function fetchRss(src: SourceDef, ctx: FetchContext): Promise<RawItem[]> {
  const xml = await getText(src.url!, { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' });
  const entries = parseFeed(xml);
  if (!entries.length) throw new Error('feed vuoto o non riconosciuto');
  return entries
    .filter((e) => e.title && fresh(src, ctx, e.publishedAt))
    .filter((e) => !e.url.includes('/shorts/'))
    .filter((e) => matches(src, `${e.title}\n${e.text}`))
    .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
    .map((e): RawItem => {
      const words = e.text.split(/\s+/).length;
      const kind = src.kind ?? (src.type === 'youtube' ? 'video' : 'article');
      return {
        source: src,
        url: e.url,
        title: e.title,
        text: e.text,
        image: e.youtubeId ? `https://i.ytimg.com/vi/${e.youtubeId}/hqdefault.jpg` : e.image,
        publishedAt: e.publishedAt,
        author: e.author,
        kind,
        lang: src.lang,
        extra: {
          ...(e.youtubeId ? { youtubeId: e.youtubeId } : {}),
          ...(kind === 'article' && words > 400 ? { readingMinutes: readingMinutes(words) } : {}),
        },
      };
    });
}

async function fetchHN(src: SourceDef): Promise<RawItem[]> {
  const data = await getJson<{ hits: any[] }>('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=60');
  return data.hits
    .filter((h) => h.url && h.points >= 200 && !/^(Ask|Show|Tell) HN/i.test(h.title))
    .sort((a, b) => b.points - a.points)
    .map((h) => ({
      source: src,
      url: h.url,
      title: h.title,
      text: '',
      publishedAt: new Date(h.created_at),
      kind: 'article' as const,
      lang: 'en',
    }));
}

async function fetchHFPapers(src: SourceDef): Promise<RawItem[]> {
  const data = await getJson<any[]>('https://huggingface.co/api/daily_papers?limit=50');
  return data
    .filter((d) => d.paper?.id && d.paper?.summary)
    .sort((a, b) => (b.paper.upvotes ?? 0) - (a.paper.upvotes ?? 0))
    .map((d) => ({
      source: src,
      url: `https://huggingface.co/papers/${d.paper.id}`,
      title: d.paper.title ?? d.title,
      text: d.paper.summary,
      image: d.thumbnail || undefined,
      publishedAt: d.publishedAt ? new Date(d.publishedAt) : undefined,
      author: (d.paper.authors ?? []).slice(0, 3).map((a: any) => a.name).join(', ') || undefined,
      kind: 'paper' as const,
      lang: 'en',
    }));
}

async function fetchApod(src: SourceDef, ctx: FetchContext): Promise<RawItem[]> {
  const key = process.env.NASA_API_KEY || 'DEMO_KEY';
  try {
    const d = await getJson<any>(`https://api.nasa.gov/planetary/apod?api_key=${key}&thumbs=true`);
    const ymd = String(d.date).slice(2).replaceAll('-', '');
    const image = d.media_type === 'image' ? d.url : d.thumbnail_url;
    if (!image) return [];
    return [
      {
        source: src,
        url: `https://apod.nasa.gov/apod/ap${ymd}.html`,
        title: d.title,
        text: d.explanation,
        image,
        imageAlt: d.title,
        publishedAt: new Date(d.date),
        author: d.copyright?.trim(),
        kind: 'image',
        lang: 'en',
      },
    ];
  } catch {
    const items = await fetchRss({ ...src, url: 'https://apod.nasa.gov/apod.rss', maxAgeDays: 2 }, ctx);
    return items.slice(0, 1).map((i) => ({ ...i, kind: 'image' }));
  }
}

async function fetchMet(src: SourceDef, ctx: FetchContext): Promise<RawItem[]> {
  const base = 'https://collectionapi.metmuseum.org/public/collection/v1';
  const search = await getJson<{ objectIDs: number[] }>(`${base}/search?isHighlight=true&hasImages=true&q=*`);
  const ids = search.objectIDs ?? [];
  for (let attempt = 0; attempt < 10 && ids.length; attempt++) {
    const id = ids[Math.floor(ctx.rng() * ids.length)];
    const url = `https://www.metmuseum.org/art/collection/search/${id}`;
    if (ctx.seen.has(itemId(url))) continue;
    const o = await getJson<any>(`${base}/objects/${id}`).catch(() => null);
    if (!o?.isPublicDomain || !o.primaryImageSmall) continue;
    const meta = [o.artistDisplayName, o.artistDisplayBio, o.objectDate, o.medium, o.culture, o.department]
      .filter(Boolean)
      .join(' · ');
    return [
      {
        source: src,
        url,
        title: o.title,
        text: `${o.title}. ${meta}.`,
        image: o.primaryImageSmall,
        imageAlt: o.title,
        kind: 'artwork',
        lang: 'en',
        extra: { art: { artist: o.artistDisplayName || undefined, date: o.objectDate || undefined, medium: o.medium || undefined, museum: 'The Metropolitan Museum of Art, New York' } },
      },
    ];
  }
  return [];
}

async function fetchAic(src: SourceDef, ctx: FetchContext): Promise<RawItem[]> {
  const body = {
    query: {
      bool: {
        must: [{ term: { is_public_domain: true } }, { term: { is_boosted: true } }, { exists: { field: 'image_id' } }],
      },
    },
    fields: ['id', 'title', 'artist_display', 'artist_title', 'date_display', 'medium_display', 'image_id', 'thumbnail', 'short_description', 'description'],
    limit: 20,
    from: Math.floor(ctx.rng() * 40) * 20,
  };
  const res = await http('https://api.artic.edu/api/v1/artworks/search', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', 'AIC-User-Agent': 'Boomscroll (personal feed)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as any;
  const iiif = data.config?.iiif_url ?? 'https://www.artic.edu/iiif/2';
  const candidates = (data.data ?? []).filter((a: any) => a.image_id && !ctx.seen.has(itemId(`https://www.artic.edu/artworks/${a.id}`)));
  if (!candidates.length) return [];
  const a = candidates[Math.floor(ctx.rng() * candidates.length)];
  const desc = htmlToText(a.short_description || a.description || '');
  return [
    {
      source: src,
      url: `https://www.artic.edu/artworks/${a.id}`,
      title: a.title,
      text: `${a.title}. ${a.artist_display ?? ''}. ${a.date_display ?? ''}. ${a.medium_display ?? ''}. ${desc}`,
      image: `${iiif}/${a.image_id}/full/843,/0/default.jpg`,
      imageAlt: a.thumbnail?.alt_text ?? a.title,
      kind: 'artwork',
      lang: 'en',
      extra: { art: { artist: a.artist_title || undefined, date: a.date_display || undefined, medium: a.medium_display || undefined, museum: 'Art Institute of Chicago' } },
    },
  ];
}

async function wikiFeed(lang: string, date: string): Promise<any> {
  const [y, m, d] = date.split('-');
  try {
    return await getJson(`https://${lang}.wikipedia.org/api/rest_v1/feed/featured/${y}/${m}/${d}`);
  } catch {
    return getJson(`https://api.wikimedia.org/feed/v1/wikipedia/${lang}/featured/${y}/${m}/${d}`);
  }
}

async function fetchWikipedia(src: SourceDef, ctx: FetchContext): Promise<RawItem[]> {
  const out: RawItem[] = [];
  const [it, en] = await Promise.all([wikiFeed('it', ctx.date).catch(() => null), wikiFeed('en', ctx.date).catch(() => null)]);
  if (!it && !en) throw new Error('feed Wikipedia non disponibile');

  const tfa = it?.tfa ?? en?.tfa;
  if (tfa?.extract) {
    out.push({
      source: src,
      url: tfa.content_urls?.desktop?.page,
      title: tfa.titles?.normalized ?? tfa.title,
      text: tfa.extract,
      image: tfa.originalimage?.source ?? tfa.thumbnail?.source,
      imageAlt: tfa.titles?.normalized,
      kind: 'article',
      lang: it?.tfa ? 'it' : 'en',
    });
  }

  const events: any[] = (it?.onthisday ?? en?.onthisday ?? []).filter((e: any) => e.pages?.some((p: any) => p.thumbnail && p.extract));
  if (events.length) {
    const ev = events[Math.floor(ctx.rng() * events.length)];
    const page = ev.pages.find((p: any) => p.thumbnail && p.extract);
    out.push({
      source: { ...src, name: it?.onthisday ? 'Wikipedia · Accadde oggi' : 'Wikipedia · On this day' },
      url: page.content_urls?.desktop?.page,
      title: `${ev.year}: ${ev.text}`,
      text: `${ev.text}\n${page.extract}`,
      image: page.originalimage?.source ?? page.thumbnail?.source,
      imageAlt: page.titles?.normalized,
      kind: 'article',
      lang: it?.onthisday ? 'it' : 'en',
    });
  }

  const potd = en?.image;
  if (potd?.thumbnail?.source) {
    out.push({
      source: { ...src, name: 'Wikimedia Commons · Foto del giorno' },
      url: potd.file_page,
      title: htmlToText(potd.description?.text ?? potd.title).split('\n')[0].slice(0, 140) || potd.title,
      text: htmlToText(potd.description?.html ?? potd.description?.text ?? ''),
      image: potd.image?.width > 2000 ? potd.thumbnail.source : (potd.image?.source ?? potd.thumbnail.source),
      imageAlt: htmlToText(potd.description?.text ?? ''),
      author: htmlToText(potd.artist?.text ?? '') || undefined,
      kind: 'image',
      lang: 'en',
    });
  }
  return out.filter((x) => x.url);
}

async function fetchXkcd(src: SourceDef): Promise<RawItem[]> {
  const c = await getJson<any>('https://xkcd.com/info.0.json');
  return [
    {
      source: src,
      url: `https://xkcd.com/${c.num}/`,
      title: c.safe_title,
      text: c.alt,
      image: c.img,
      imageAlt: c.alt,
      publishedAt: new Date(Number(c.year), Number(c.month) - 1, Number(c.day)),
      kind: 'comic',
      lang: 'en',
    },
  ];
}

/** Ricostruisce la posizione iniziale del puzzle e verifica che la soluzione sia legale. */
export function puzzlePosition(pgn: string, initialPly: number, firstMove: string): string | null {
  const moves = pgn.trim().split(/\s+/).filter((m) => !/^\d+\.+$/.test(m));
  const tryAt = (n: number) => {
    const chess = new Chess();
    try {
      for (const m of moves.slice(0, n)) chess.move(m);
      const fen = chess.fen();
      chess.move({ from: firstMove.slice(0, 2), to: firstMove.slice(2, 4), promotion: firstMove[4] });
      return fen;
    } catch {
      return null;
    }
  };
  for (const n of [moves.length, initialPly + 1, initialPly]) {
    if (n < 0 || n > moves.length) continue;
    const fen = tryAt(n);
    if (fen) return fen;
  }
  return null;
}

async function fetchLichess(src: SourceDef): Promise<RawItem[]> {
  const d = await getJson<any>('https://lichess.org/api/puzzle/daily');
  const solution: string[] = d.puzzle?.solution ?? [];
  if (!solution.length) return [];
  const fen = puzzlePosition(d.game?.pgn ?? '', d.puzzle.initialPly ?? 0, solution[0]);
  if (!fen) throw new Error('posizione del puzzle non ricostruibile');
  const side = fen.split(' ')[1] === 'w' ? 'il Bianco' : 'il Nero';
  const userMoves = Math.ceil(solution.length / 2);
  return [
    {
      source: src,
      url: `https://lichess.org/training/${d.puzzle.id}`,
      title: `Puzzle di scacchi del giorno · ${d.puzzle.rating}`,
      text: `Muove ${side}. Trova la mossa migliore: ${userMoves === 1 ? 'basta una mossa' : `servono ${userMoves} mosse`}. Puoi risolverlo direttamente qui.`,
      kind: 'chess',
      lang: 'it',
      presummarized: true,
      extra: { chess: { fen, solution, rating: d.puzzle.rating, themes: d.puzzle.themes ?? [] } },
    },
  ];
}

export async function fetchSource(src: SourceDef, ctx: FetchContext): Promise<RawItem[]> {
  let items: RawItem[];
  switch (src.type) {
    case 'rss':
    case 'youtube':
      items = await fetchRss(src, ctx);
      break;
    case 'hn':
      items = await fetchHN(src);
      break;
    case 'hfpapers':
      items = await fetchHFPapers(src);
      break;
    case 'apod':
      items = await fetchApod(src, ctx);
      break;
    case 'met':
      items = await fetchMet(src, ctx);
      break;
    case 'aic':
      items = await fetchAic(src, ctx);
      break;
    case 'wikipedia':
      items = await fetchWikipedia(src, ctx);
      break;
    case 'xkcd':
      items = await fetchXkcd(src);
      break;
    case 'lichess':
      items = await fetchLichess(src);
      break;
  }
  return items
    .map((i) => ({ ...i, text: (i.text ?? '').slice(0, 2500) }))
    .filter((i) => !ctx.seen.has(itemId(i.url)))
    .slice(0, src.max);
}
