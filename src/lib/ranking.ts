/**
 * Motore dei gusti di Boomscroll.
 *
 * Impara solo da segnali espliciti (mi piace, non mi piace, salva, "meno di…"),
 * mai dal tempo passato su un contenuto. Ogni segnale sposta i pesi di
 * categoria (c:), fonte (s:) e argomenti (t:). I pesi si attenuano col tempo,
 * così i gusti possono cambiare.
 */
import { categoryMeta } from '../../shared/categories';
import type { Item } from '../../shared/types';
import { seeded } from './dates';

export type Signal = 'like' | 'dislike' | 'save' | 'less-source' | 'less-topic' | 'more-topic';

const DELTAS: Record<Signal, { c: number; s: number; t: number }> = {
  like: { c: 0.5, s: 0.4, t: 0.3 },
  dislike: { c: -0.6, s: -0.5, t: -0.35 },
  save: { c: 0.8, s: 0.6, t: 0.45 },
  'less-source': { c: 0, s: -2.5, t: 0 },
  'less-topic': { c: -2, s: 0, t: -0.5 },
  'more-topic': { c: 1, s: 0, t: 0 },
};

export const MAX_W = 5;
const clamp = (x: number) => Math.max(-MAX_W, Math.min(MAX_W, x));
export const MUTED = -3;

export const keyC = (c: string) => `c:${c}`;
export const keyS = (s: string) => `s:${s}`;
export const keyT = (t: string) => `t:${t}`;

/** Applica (sign = 1) o annulla (sign = -1) un segnale. */
export function applySignal(weights: Record<string, number>, item: Item, signal: Signal, sign = 1): Record<string, number> {
  const d = DELTAS[signal];
  const w = { ...weights };
  const add = (k: string, v: number) => {
    if (!v) return;
    const next = clamp((w[k] ?? 0) + v * sign);
    if (Math.abs(next) < 0.01) delete w[k];
    else w[k] = Math.round(next * 1000) / 1000;
  };
  add(keyC(item.category), d.c);
  add(keyS(item.sourceId), d.s);
  for (const t of item.tags) add(keyT(t), d.t);
  return w;
}

/** Attenua i pesi del 1,5% al giorno: i gusti di mesi fa contano meno. */
export function decay(weights: Record<string, number>, days: number): Record<string, number> {
  if (days <= 0) return weights;
  const f = Math.pow(0.985, days);
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(weights)) {
    const nv = v * f;
    if (Math.abs(nv) >= 0.02) out[k] = Math.round(nv * 1000) / 1000;
  }
  return out;
}

const squash = (x: number) => Math.tanh(x / 2);

export interface Score {
  total: number;
  base: number;
  cat: number;
  src: number;
  tag: number;
}

export function scoreItem(item: Item, w: Record<string, number>): Score {
  const base = 0.6 * item.quality + 0.4 * ((item.interest ?? 3) / 5);
  const cat = 1.2 * squash(w[keyC(item.category)] ?? 0);
  const src = 0.7 * squash(w[keyS(item.sourceId)] ?? 0);
  const tagVals = item.tags.map((t) => squash(w[keyT(t)] ?? 0));
  const tag = tagVals.length ? (0.6 * tagVals.reduce((a, b) => a + b, 0)) / Math.sqrt(tagVals.length) : 0;
  return { total: base + cat + src + tag, base, cat, src, tag };
}

export const isMuted = (item: Item, w: Record<string, number>) =>
  (w[keyS(item.sourceId)] ?? 0) <= MUTED || (w[keyC(item.category)] ?? 0) <= MUTED;

/**
 * Compone l'ordine dell'edizione:
 * - i contenuti con il punteggio più alto, con un po' di casualità stabile per la giornata;
 * - mai più di 2 card di fila della stessa categoria, al massimo ~25% per categoria;
 * - circa 1 card su 7 è "esplorazione": un contenuto di qualità fuori dalle tue abitudini.
 */
export function composeEdition(
  items: Item[],
  w: Record<string, number>,
  size: number,
  seed: string,
  exclude: Set<string> = new Set(),
): { ids: string[]; explore: string[] } {
  const rnd = seeded(seed);
  const pool = items
    .filter((i) => !exclude.has(i.id) && !isMuted(i, w))
    .map((i) => ({ item: i, score: scoreItem(i, w).total + (rnd() - 0.5) * 0.35 }));
  pool.sort((a, b) => b.score - a.score);

  const maxPerCat = Math.max(3, Math.ceil(size * 0.25));
  const counts = new Map<string, number>();
  const picked: Item[] = [];
  const explore: string[] = [];
  const used = new Set<string>();

  const canPlace = (i: Item) => {
    if ((counts.get(i.category) ?? 0) >= maxPerCat) return false;
    const n = picked.length;
    return !(n >= 2 && picked[n - 1].category === i.category && picked[n - 2].category === i.category);
  };
  const place = (i: Item) => {
    picked.push(i);
    used.add(i.id);
    counts.set(i.category, (counts.get(i.category) ?? 0) + 1);
  };

  // Apertura: il miglior contenuto con un'immagine, per partire bene.
  const opener = pool.find((p) => p.item.image && p.item.kind !== 'chess');
  if (opener) place(opener.item);

  let guard = 0;
  while (picked.length < size && guard++ < size * 4) {
    const slot = picked.length;
    let choice: Item | undefined;
    if (slot % 7 === 4) {
      // Esplorazione: categorie poco frequentate ma non rifiutate, scelte per qualità.
      const candidates = pool.filter(
        (p) => !used.has(p.item.id) && canPlace(p.item) && Math.abs(w[keyC(p.item.category)] ?? 0) < 0.6,
      );
      candidates.sort((a, b) => scoreItem(b.item, {}).base - scoreItem(a.item, {}).base);
      choice = candidates[Math.floor(rnd() * Math.min(4, candidates.length))]?.item;
      if (choice) explore.push(choice.id);
    }
    choice ??= pool.find((p) => !used.has(p.item.id) && canPlace(p.item))?.item;
    // Se i vincoli bloccano tutto, li allentiamo piuttosto che chiudere l'edizione in anticipo.
    choice ??= pool.find((p) => !used.has(p.item.id))?.item;
    if (!choice) break;
    place(choice);
  }
  return { ids: picked.map((i) => i.id), explore };
}

/** Le ragioni per cui un contenuto è nel tuo feed, in parole semplici. */
export function explain(item: Item, w: Record<string, number>, explored: boolean): string[] {
  const s = scoreItem(item, w);
  const out: string[] = [];
  const cat = categoryMeta(item.category).label;
  if (explored) out.push(`Esplorazione: un contenuto di qualità fuori dalle tue abitudini (${cat}).`);
  if (s.cat > 0.25) out.push(`Ti interessa ${cat}.`);
  if (s.cat < -0.25) out.push(`Di solito ${cat} ti interessa poco, ma questo ha un buon punteggio di qualità.`);
  if (s.src > 0.2) out.push(`Hai apprezzato altri contenuti di ${item.sourceName}.`);
  const liked = item.tags.filter((t) => (w[keyT(t)] ?? 0) > 0.3);
  if (liked.length) out.push(`Parla di argomenti che ti piacciono: ${liked.join(', ')}.`);
  if (item.quality >= 0.9) out.push(`${item.sourceName} è tra le fonti più affidabili.`);
  if ((item.interest ?? 0) >= 5) out.push('Giudicato di grande interesse in fase di selezione.');
  if (!out.length) out.push('Selezionato per qualità della fonte e varietà dell’edizione.');
  return out;
}
