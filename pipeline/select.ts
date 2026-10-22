import type { CategoryId, Item } from '../shared/types';
import type { RawItem } from './fetchers';
import type { AiResult } from './llm';
import { upgradeImage } from './images';
import { itemId, truncate } from './util';

const tokens = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Elimina doppioni: stesso link o titoli quasi uguali (tiene la fonte migliore). */
export function dedupe(items: RawItem[]): RawItem[] {
  const sorted = [...items].sort((a, b) => b.source.quality - a.source.quality);
  const kept: { item: RawItem; t: Set<string> }[] = [];
  const ids = new Set<string>();
  for (const item of sorted) {
    const id = itemId(item.url);
    if (ids.has(id)) continue;
    ids.add(id);
    const t = tokens(item.title);
    if (kept.some((k) => jaccard(k.t, t) >= 0.6)) continue;
    kept.push({ item, t });
  }
  return kept.map((k) => k.item);
}

const ALWAYS_KEEP = new Set(['chess', 'word', 'artwork', 'comic', 'image', 'poem']);

/** Prima dell'IA: limita il numero di candidati per categoria, privilegiando qualità e freschezza. */
export function preselect(items: RawItem[], now: Date, perCategory = 14, total = 150): RawItem[] {
  const score = (i: RawItem) => {
    const ageH = i.publishedAt ? (now.getTime() - i.publishedAt.getTime()) / 3_600_000 : 24;
    return i.source.quality + Math.max(0, 1 - ageH / 72) * 0.3 + (i.image ? 0.08 : 0) + (i.kind === 'video' ? 0.1 : 0);
  };
  const byCat = new Map<string, RawItem[]>();
  for (const i of [...items].sort((a, b) => score(b) - score(a))) {
    // I video hanno un loro gruppo, così non tolgono spazio agli articoli della stessa categoria.
    const key = i.kind === 'video' ? 'video' : i.source.category;
    const list = byCat.get(key) ?? [];
    if (list.length < (key === 'video' ? 24 : perCategory)) list.push(i);
    byCat.set(key, list);
  }
  return [...byCat.values()].flat().sort((a, b) => score(b) - score(a)).slice(0, total);
}

export function poemExcerpt(text: string, lines = 10): string {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, lines)
    .join('\n');
}

/** Toglie la formattazione Markdown che a volte arriva da feed e IA (*corsivo*, **grassetto**). */
export const plain = (s: string) => s.replace(/(\*\*|__|\*|_)(?=\S)([^*_]+?)(?<=\S)\1/g, '$2').replace(/`/g, '');

export function buildItem(raw: RawItem, ai: AiResult | undefined, now: Date): Item {
  const text = raw.text.trim();
  const fallbackSummary = raw.presummarized ? text : truncate(text || raw.title, 320);
  const excerpt =
    raw.kind === 'poem' ? poemExcerpt(text) : raw.presummarized || text.length < 40 ? undefined : truncate(text, 360);
  const category: CategoryId = ai?.category ?? raw.source.category;
  const item: Item = {
    id: itemId(raw.url),
    kind: raw.kind,
    category,
    sourceId: raw.source.id,
    sourceName: raw.source.name,
    url: raw.url,
    title: plain(raw.title),
    summary: plain(raw.presummarized ? text : (ai?.summary ?? fallbackSummary)),
    lang: raw.lang,
    publishedAt: (raw.publishedAt ?? now).toISOString(),
    tags: ai?.tags ?? [],
    quality: raw.source.quality,
    ai: !!ai && !raw.presummarized,
    ...raw.extra,
  };
  if (ai?.titleIt) item.titleIt = plain(ai.titleIt);
  if (excerpt && excerpt !== item.summary) item.excerpt = excerpt;
  if (ai?.excerptIt) item.excerptIt = ai.excerptIt;
  if (ai?.interest) item.interest = ai.interest;
  if (ai?.quiz) item.quiz = ai.quiz;
  if (raw.author) item.author = truncate(raw.author, 80);
  if (raw.image) item.image = upgradeImage(raw.image);
  if (raw.imageAlt) item.imageAlt = truncate(raw.imageAlt, 200);
  if (ai?.word) item.word = { ...ai.word, lang: raw.lang };
  return item;
}

/** Dopo l'IA: scarta ciò che è poco interessante e limita per categoria. */
export function finalize(items: Item[], perCategory = 14, total = 170): Item[] {
  const good = items.filter((i) => ALWAYS_KEEP.has(i.kind) || i.interest === undefined || i.interest >= 3);
  // Se l'IA è stata troppo severa, recuperiamo i migliori tra gli scartati.
  const pool = good.length >= 70 ? good : [...good, ...items.filter((i) => !good.includes(i)).sort((a, b) => (b.interest ?? 0) - (a.interest ?? 0)).slice(0, 70 - good.length)];
  const rank = (i: Item) => i.quality + (i.interest ?? 3) / 5;
  const counts = new Map<string, number>();
  // Opere, poesie, parole e giochi sono pochi e scelti apposta: entrano sempre.
  // I video, fino a 24, non contano nel limite per categoria.
  const videos = pool.filter((i) => i.kind === 'video').sort((a, b) => rank(b) - rank(a)).slice(0, 24);
  const out: Item[] = [...pool.filter((i) => ALWAYS_KEEP.has(i.kind)), ...videos];
  for (const i of out) if (i.kind !== 'video') counts.set(i.category, (counts.get(i.category) ?? 0) + 1);
  for (const i of pool.filter((i) => !ALWAYS_KEEP.has(i.kind) && !videos.includes(i)).sort((a, b) => rank(b) - rank(a))) {
    const c = counts.get(i.category) ?? 0;
    if (c >= perCategory) continue;
    counts.set(i.category, c + 1);
    out.push(i);
    if (out.length >= total) break;
  }
  return out;
}
