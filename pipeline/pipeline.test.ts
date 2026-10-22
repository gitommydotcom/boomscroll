import { describe, expect, it } from 'vitest';
import { puzzlePosition, type RawItem } from './fetchers';
import { validate } from './llm';
import { parseFeed } from './rss';
import { buildItem, dedupe, finalize, poemExcerpt } from './select';
import type { SourceDef } from './sources';
import { htmlToText, normalizeUrl, truncate } from './util';

const src = (over: Partial<SourceDef> = {}): SourceDef => ({
  id: 'test',
  name: 'Test',
  type: 'rss',
  category: 'scienza',
  lang: 'en',
  quality: 0.8,
  max: 3,
  ...over,
});

const raw = (over: Partial<RawItem> = {}): RawItem => ({
  source: src(),
  url: 'https://example.org/a',
  title: 'Titolo di prova',
  text: 'Testo di prova abbastanza lungo da superare la soglia minima di quaranta caratteri.',
  kind: 'article',
  lang: 'en',
  ...over,
});

describe('parseFeed', () => {
  it('legge RSS 2.0 con CDATA, entità e immagini', () => {
    const xml = `<?xml version="1.0"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
      <channel><title>T</title>
      <item><title><![CDATA[Ciao &amp; benvenuti]]></title><link>https://ex.org/1?utm_source=x</link>
      <pubDate>Wed, 21 Oct 2026 10:00:00 GMT</pubDate>
      <description>&lt;p&gt;Primo &lt;b&gt;paragrafo&lt;/b&gt;&lt;/p&gt;</description>
      <media:content url="https://ex.org/img.jpg" medium="image"/></item>
      <item><title>Secondo</title><link>https://ex.org/2</link>
      <content:encoded><![CDATA[<p>Testo <img src="https://ex.org/b.png"> qui</p>]]></content:encoded></item>
      </channel></rss>`;
    const items = parseFeed(xml);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('Ciao & benvenuti');
    expect(items[0].text).toBe('Primo paragrafo');
    expect(items[0].image).toBe('https://ex.org/img.jpg');
    expect(items[0].publishedAt?.toISOString()).toBe('2026-10-21T10:00:00.000Z');
    expect(items[1].image).toBe('https://ex.org/b.png');
  });

  it('legge Atom e i feed YouTube', () => {
    const xml = `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/">
      <entry><yt:videoId>abc123</yt:videoId><title>Lezione 1</title>
      <link rel="alternate" href="https://www.youtube.com/watch?v=abc123"/>
      <published>2026-10-20T08:00:00+00:00</published>
      <media:group><media:description>Introduzione al corso</media:description>
      <media:thumbnail url="https://i.ytimg.com/vi/abc123/hqdefault.jpg" width="480" height="360"/></media:group></entry>
    </feed>`;
    const [v] = parseFeed(xml);
    expect(v.url).toBe('https://www.youtube.com/watch?v=abc123');
    expect(v.youtubeId).toBe('abc123');
    expect(v.text).toBe('Introduzione al corso');
    expect(v.image).toContain('hqdefault');
  });
});

describe('immagini', () => {
  it('ingrandisce le miniature della BBC', async () => {
    const { upgradeImage } = await import('./images');
    expect(upgradeImage('https://ichef.bbci.co.uk/ace/standard/240/cpsprodpb/x.jpg')).toBe('https://ichef.bbci.co.uk/ace/standard/976/cpsprodpb/x.jpg');
    expect(upgradeImage('https://ex.org/a.jpg')).toBe('https://ex.org/a.jpg');
  });
  it('pulisce le descrizioni dei video', async () => {
    const { cleanVideoText } = await import('./fetchers');
    expect(cleanVideoText('Un video sui buchi neri.\nSponsor: Brilliant https://x.y\n00:00 Intro\nPatreon: …\nAltro testo')).toBe('Un video sui buchi neri.\nAltro testo');
  });
});

describe('util', () => {
  it('normalizza i link togliendo il tracciamento', () => {
    expect(normalizeUrl('http://ex.org/a/?utm_source=x&id=2#top')).toBe('https://ex.org/a/?id=2');
    expect(normalizeUrl('https://ex.org/a/')).toBe('https://ex.org/a');
  });
  it('converte HTML in testo', () => {
    expect(htmlToText('<p>Uno</p><p>Due&nbsp;tre &#8217;</p><script>x()</script>')).toBe('Uno\nDue tre ’');
  });
  it('tronca a fine frase', () => {
    expect(truncate('Prima frase lunga abbastanza. Seconda frase che non ci sta.', 40)).toBe('Prima frase lunga abbastanza.');
  });
});

describe('selezione', () => {
  it('elimina doppioni per link e per titolo simile', () => {
    const items = dedupe([
      raw({ url: 'https://a.org/x', title: 'NASA launches new telescope to study exoplanets' }),
      raw({ url: 'https://a.org/x?utm_source=feed', title: 'Altro' }),
      raw({ url: 'https://b.org/y', title: 'NASA launches a new telescope to study exoplanets', source: src({ quality: 0.9 }) }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].url).toBe('https://b.org/y');
  });

  it('usa l’estratto quando l’IA non c’è', () => {
    const item = buildItem(raw(), undefined, new Date('2026-10-22'));
    expect(item.ai).toBe(false);
    expect(item.summary).toContain('Testo di prova');
    expect(item.category).toBe('scienza');
  });

  it('scarta i contenuti poco interessanti ma tiene sempre arte e giochi', () => {
    const now = new Date();
    const mk = (i: number, interest: number, kind: RawItem['kind'] = 'article') => ({
      ...buildItem(raw({ url: `https://ex.org/${i}`, kind }), undefined, now),
      interest,
    });
    const out = finalize([mk(1, 1), mk(2, 4), mk(3, 1, 'artwork'), ...Array.from({ length: 60 }, (_, i) => mk(100 + i, 3))]);
    const ids = out.map((i) => i.url);
    expect(ids).not.toContain('https://ex.org/1');
    expect(ids).toContain('https://ex.org/3');
  });

  it('toglie il Markdown dai testi', async () => {
    const { plain } = await import('./select');
    expect(plain('Progettazione *de novo* di **catalizzatori** e snake_case')).toBe('Progettazione de novo di catalizzatori e snake_case');
  });

  it('mantiene i versi delle poesie', () => {
    expect(poemExcerpt('Verso uno\n\nVerso due\nVerso tre', 2)).toBe('Verso uno\nVerso due');
  });
});

describe('validate', () => {
  it('accetta una risposta corretta e scarta categorie non ammesse', () => {
    const v = validate(
      { summary: 'Un riassunto chiaro di almeno venti caratteri.', tags: ['Fisica', 'buchi neri'], interest: 4.6, category: 'arte', quiz: { q: 'Cosa?', options: ['a', 'b', 'c'], answer: 2 } },
      raw(),
    );
    expect(v?.tags).toEqual(['fisica', 'buchi neri']);
    expect(v?.interest).toBe(5);
    expect(v?.category).toBeUndefined();
    expect(v?.quiz?.answer).toBe(2);
  });
  it('accetta la categoria per le fonti generaliste', () => {
    const v = validate({ summary: 'Un riassunto chiaro di almeno venti caratteri.', category: 'arte', interest: 3 }, raw({ source: src({ mixed: true }) }));
    expect(v?.category).toBe('arte');
  });
  it('tratta le stringhe vuote dello schema come valori assenti', () => {
    const v = validate(
      { summary: 'Un riassunto chiaro di almeno venti caratteri.', title_it: '', excerpt_it: '', category: '', interest: 3, quiz: { q: '', options: ['', '', ''], answer: 0 } },
      raw({ lang: 'de' }),
    );
    expect(v?.titleIt).toBeUndefined();
    expect(v?.excerptIt).toBeUndefined();
    expect(v?.quiz).toBeUndefined();
  });
  it('rifiuta riassunti vuoti', () => {
    expect(validate({ summary: '' }, raw())).toBeNull();
  });
});

describe('puzzlePosition', () => {
  it('ricostruisce la posizione e verifica la prima mossa', () => {
    const fen = puzzlePosition('e4 e5 Qh5 Nc6 Bc4 Nf6', 5, 'h5f7');
    expect(fen).toBe('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4');
    expect(puzzlePosition('e4 e5', 1, 'a1a8')).toBeNull();
  });
});

describe('eventi locali', () => {
  it('tiene gli eventi e scarta la cronaca', async () => {
    const { LOCAL_SOURCES } = await import('./sources');
    const src = LOCAL_SOURCES[0];
    const ok = (t: string) => (src.match ?? []).every((re) => re.test(t)) && !src.exclude?.test(t);
    expect(ok('Grotte di Stiffe: il 15 novembre torna “Calici in Grotta”, alla scoperta del vino')).toBe(true);
    expect(ok('Street Fitness: è subito tutto esaurito per il ritorno all’Aquila')).toBe(true);
    expect(ok('Al Ridotto del Teatro Comunale la rassegna di musica da camera')).toBe(true);
    expect(ok('Pendolare denuncia principio di incendio su un mezzo, le precisazioni di Tua')).toBe(false);
    expect(ok('Assemblea Upi ad Imperia, Caruso: «Evitare tagli alle Province nella legge di bilancio»')).toBe(false);
  });
});
