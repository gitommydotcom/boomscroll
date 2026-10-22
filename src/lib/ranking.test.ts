import { describe, expect, it } from 'vitest';
import type { CategoryId, Item } from '../../shared/types';
import { applySignal, composeEdition, decay, explain, isMuted, keyC, keyS, scoreItem } from './ranking';

let n = 0;
const item = (over: Partial<Item> = {}): Item => ({
  id: `id${++n}`,
  kind: 'article',
  category: 'scienza',
  sourceId: 'quanta',
  sourceName: 'Quanta',
  url: `https://ex.org/${n}`,
  title: `Contenuto ${n}`,
  summary: 'Riassunto',
  lang: 'en',
  publishedAt: '2026-10-22T08:00:00Z',
  tags: ['fisica'],
  quality: 0.8,
  ai: true,
  ...over,
});

describe('segnali', () => {
  it('mi piace e salva aumentano i pesi, annullare li riporta a zero', () => {
    const it1 = item();
    let w = applySignal({}, it1, 'like');
    expect(w[keyC('scienza')]).toBeGreaterThan(0);
    expect(w['t:fisica']).toBeGreaterThan(0);
    w = applySignal(w, it1, 'like', -1);
    expect(w).toEqual({});
  });

  it('"meno di questa fonte" la silenzia', () => {
    const it1 = item({ sourceId: 'rumore' });
    const w = applySignal(applySignal({}, it1, 'less-source'), it1, 'less-source');
    expect(w[keyS('rumore')]).toBeLessThanOrEqual(-3);
    expect(isMuted(it1, w)).toBe(true);
  });

  it('i pesi si attenuano col tempo', () => {
    const w = decay({ 'c:arte': 2, 'c:tech': 0.01 }, 30);
    expect(w['c:arte']).toBeLessThan(2);
    expect(w['c:arte']).toBeGreaterThan(1);
    expect(w['c:tech']).toBeUndefined();
  });

  it('il punteggio cresce con i gusti', () => {
    const it1 = item({ category: 'arte' });
    expect(scoreItem(it1, { 'c:arte': 3 }).total).toBeGreaterThan(scoreItem(it1, {}).total);
  });
});

describe('composeEdition', () => {
  const cats: CategoryId[] = ['scienza', 'arte', 'tech', 'poesia', 'notizie', 'design'];
  const pool = Array.from({ length: 60 }, (_, i) => item({ category: cats[i % cats.length], sourceId: `s${i % 9}`, image: i % 2 ? 'x.jpg' : undefined }));

  it('rispetta la dimensione ed è stabile nella giornata', () => {
    const a = composeEdition(pool, {}, 20, '2026-10-22');
    const b = composeEdition(pool, {}, 20, '2026-10-22');
    expect(a.ids).toHaveLength(20);
    expect(a).toEqual(b);
    expect(new Set(a.ids).size).toBe(20);
  });

  it('non mette più di due card di fila della stessa categoria', () => {
    const w = { 'c:scienza': 5 };
    const { ids } = composeEdition(pool, w, 24, 'x');
    const byId = new Map(pool.map((p) => [p.id, p]));
    const seq = ids.map((id) => byId.get(id)!.category);
    for (let i = 2; i < seq.length; i++) expect(seq[i] === seq[i - 1] && seq[i] === seq[i - 2]).toBe(false);
  });

  it('privilegia i gusti ma lascia spazio all’esplorazione', () => {
    const w = { 'c:arte': 5, 'c:design': 4 };
    const { ids, explore } = composeEdition(pool, w, 21, 'y');
    const byId = new Map(pool.map((p) => [p.id, p]));
    const liked = ids.filter((id) => ['arte', 'design'].includes(byId.get(id)!.category)).length;
    expect(liked).toBeGreaterThanOrEqual(8);
    expect(explore.length).toBeGreaterThan(0);
    for (const id of explore) expect(['arte', 'design']).not.toContain(byId.get(id)!.category);
  });

  it('esclude le fonti silenziate e i contenuti già visti', () => {
    const muted = { [keyS('s0')]: -4 };
    const seen = new Set([pool[1].id]);
    const { ids } = composeEdition(pool, muted, 30, 'z', seen);
    const byId = new Map(pool.map((p) => [p.id, p]));
    expect(ids.some((id) => byId.get(id)!.sourceId === 's0')).toBe(false);
    expect(ids).not.toContain(pool[1].id);
  });

  it('spiega le sue scelte', () => {
    const reasons = explain(item({ category: 'arte', quality: 0.95 }), { 'c:arte': 3 }, false);
    expect(reasons.join(' ')).toContain('Ti interessa Arte');
  });
});
