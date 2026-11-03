import { describe, expect, it } from 'vitest';
import { repairTitle } from '../shared/titles';
import type { Edition, Item } from '../shared/types';
import { diagram, solution, task } from './chess';
import { qr } from './giornale';
import { headline, planPaper, sectionSub } from './paper';
import { body, hyphenate, NBSP, quotes, sentenceCase, SHY, title } from './typo';

const item = (over: Partial<Item> = {}): Item => ({
  id: Math.random().toString(36).slice(2),
  kind: 'article',
  category: 'scienza',
  sourceId: 'nature',
  sourceName: 'Nature',
  url: 'https://www.nature.com/articles/x',
  title: 'Titolo',
  summary: 'Un riassunto in italiano abbastanza lungo da essere un articolo.',
  lang: 'it',
  publishedAt: '2026-11-03T10:00:00Z',
  tags: [],
  quality: 0.8,
  ai: true,
  ...over,
});

const edition = (items: Item[]): Edition => ({
  id: '2026-11-03-sera',
  slot: 'sera',
  date: '2026-11-03',
  generatedAt: '2026-11-03T18:00:00Z',
  items,
  local: {},
  sources: [],
  ai: { model: null, calls: 0, failures: 0 },
});

describe('tipografia', () => {
  it('caporali e apostrofi in italiano, virgolette alte in inglese', () => {
    expect(quotes('L\'acqua è "pulita"', 'it')).toBe('L’acqua è «pulita»');
    expect(quotes('It\'s "fine"', 'en')).toBe('It’s “fine”');
    expect(quotes('Ha detto “basta”', 'it')).toBe('Ha detto «basta»');
  });

  it('sillaba in italiano lasciando almeno due lettere prima e tre dopo', () => {
    const h = hyphenate('straordinariamente', 'it');
    const parts = h.split(SHY);
    expect(parts.length).toBeGreaterThan(2);
    expect(parts[0].length).toBeGreaterThanOrEqual(2);
    expect(parts.at(-1)!.length).toBeGreaterThanOrEqual(3);
    // Mai in sigle, numeri e indirizzi.
    expect(hyphenate('NASA-ESA 2026 www.nature.com', 'it')).not.toContain(SHY);
  });

  it('niente parole di una lettera in fondo alla riga, unità attaccate ai numeri', () => {
    expect(body('E poi a casa con 10 km di strada', 'it')).toContain(`a${NBSP}`);
    expect(body('E poi a casa con 10 km di strada', 'it')).toContain('10 km');
  });

  it('i titoli non si sillabano e i trattini diventano lineette', () => {
    const t = title('Elezioni 2020-2026 - il bilancio');
    expect(t).not.toContain(SHY);
    expect(t).toContain('2020–2026 – il');
  });

  it('riporta i titoli "all\'inglese" all\'uso italiano senza toccare i nomi propri', () => {
    const ctx = 'Un nuovo studio di Stanford e del MIT sul cervello.';
    expect(sentenceCase('Netflix Ricrea l’Esperimento di Stanford', ctx)).toBe('Netflix ricrea l’esperimento di Stanford');
    expect(sentenceCase('Tomba dei Giganti in Dorgali, Italia', ctx)).toBe('Tomba dei giganti in Dorgali, Italia');
    // Un titolo già corretto resta com'è.
    expect(sentenceCase('Il MIT presenta un nuovo robot', ctx)).toBe('Il MIT presenta un nuovo robot');
  });
});

describe('titoli tradotti', () => {
  it('toglie gli avanzi della risposta dell’IA', () => {
    expect(repairTitle('Parola del giorno per il 31 ottobre”, 2026')).toBe('Parola del giorno per il 31 ottobre');
    expect(repairTitle('Il GP della Malesia”, (o titolo originale), 2-3 frasi in italiano')).toBe('Il GP della Malesia');
    expect(repairTitle('Campagna elettorale”, “kind”: “article”')).toBe('Campagna elettorale');
    expect(repairTitle('“kind”: “article”')).toBeUndefined();
    // Una citazione vera resta.
    expect(repairTitle('Il giudice parla di "uso come arma", e archivia')).toBe('Il giudice parla di "uso come arma", e archivia');
  });
});

describe('scacchi', () => {
  const data = { fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', solution: ['d1d8'], rating: 900, themes: ['mateIn1'] };
  it('soluzione in notazione italiana e consegna dai temi', () => {
    expect(solution(data)).toBe('1. Td8#');
    expect(task(data)).toBe('Il bianco muove e dà matto in una mossa.');
  });
  it('diagramma con 64 case e i pezzi della posizione', () => {
    const svg = diagram(data.fen);
    expect(svg.match(/<rect x="\d+" y="\d+" width="30" height="30" fill="url\(#hatch\)"\/>/g)).toHaveLength(32);
    expect(svg).toContain('♖');
    expect(svg).toContain('♚');
  });
});

describe('giornale', () => {
  it('niente clip, niente pezzi stranieri senza traduzione; apertura con foto', () => {
    const items = [
      item({ title: 'Apertura', image: 'https://x/a.jpg', quality: 0.9 }),
      item({ title: 'Clip', short: true, kind: 'video', youtubeId: 'x' }),
      item({ title: 'Article en français', lang: 'fr', ai: false, summary: 'Texte en français.' }),
      ...Array.from({ length: 4 }, (_, k) => item({ title: `Notizia ${k}`, category: 'notizie' })),
    ];
    const plan = planPaper(edition(items));
    expect(plan.lead?.title).toBe('Apertura');
    const all = [...plan.groups.flatMap((g) => g.stories), ...plan.fill].map((i) => i.title);
    expect(all).not.toContain('Clip');
    expect(all).not.toContain('Article en français');
    expect(plan.groups.map((g) => g.group.id)).toEqual(['attualita']);
  });

  it('titolo in italiano corrente e sottotitolo di sezione', () => {
    expect(headline(item({ lang: 'en', title: 'Old', titleIt: 'Un Nuovo Studio Sul Sonno', summary: 'Il sonno conta.' })).text).toBe('Un nuovo studio sul sonno');
    expect(sectionSub([item({ sourceName: 'Nature' }), item({ sourceName: 'Quanta' }), item({ sourceName: 'NPR' })])).toBe('Da Nature, Quanta e un’altra fonte');
  });

  it('codici QR leggibili: almeno tre righe di lato', () => {
    const q = qr('https://www.nature.com/articles/d41586-026-01234-5');
    expect(q.lines).toBeGreaterThanOrEqual(3);
    expect(q.svg).toMatch(/^<svg viewBox="0 0 \d+ \d+"/);
  });
});
