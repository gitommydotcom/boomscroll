/**
 * Il giornale da stampare: un PDF per edizione, impaginato come un quotidiano.
 *   npm run giornale                          → le ultime 9 edizioni in dist/stampa/
 *   npm run giornale -- --only=2026-11-03-sera --out=/tmp/x --html
 *
 * Gira dopo la build del sito (workflow "Pubblica il sito"). I PDF non finiscono nel repository:
 * stanno in una cache tra un'esecuzione e l'altra e vengono pubblicati con il sito.
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, type Browser } from 'playwright';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { editionId, type Edition, type EditionIndex, type Item } from '../shared/types';
import { weatherLabel } from '../src/lib/geo';
import {
  briefHtml,
  colophonHtml,
  eventHtml,
  gamesHtml,
  groupOf,
  LOCAL_GROUP,
  longDate,
  mastheadHtml,
  planPaper,
  score,
  sectionHtml,
  sectionSub,
  sidebarHtml,
  storyHtml,
  teaserHtml,
  VIDEO_GROUP,
  videoHtml,
  GROUPS,
  type Img,
  type Meta,
  type PaperPlan,
  type QrFn,
  type RenderCtx,
} from './paper';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const DATA = join(ROOT, 'public', 'data');
const NM = join(ROOT, 'node_modules');

const args = process.argv.slice(2);
const arg = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const OUT = resolve(arg('out') ?? join(ROOT, 'dist', 'stampa'));
const CACHE = resolve(arg('cache') ?? join(ROOT, '.stampa'));
const HOW_MANY = Number(arg('editions') ?? 9);
const ONLY = arg('only');
const KEEP_HTML = args.includes('--html');
/** Pagine interne al massimo (più la prima e l'ultima). */
const MAX_INNER = 10;

/* ── Font ───────────────────────────────────────────────────────────────── */

const font = (family: string, file: string, weight: string, style = 'normal', range?: string) =>
  `@font-face{font-family:'${family}';src:url('${pathToFileURL(join(NM, file)).href}');font-weight:${weight};font-style:${style};${range ? `unicode-range:${range};` : ''}}`;

const SS = 'source-serif/WOFF2/TTF';
const FONTS = [
  // Corpo: Source Serif 4 di Adobe nel taglio ottico "Small Text" (8–11 pt), con maiuscoletto e cifre old-style.
  font('BS Text', `${SS}/SourceSerif4SmText-Regular.ttf.woff2`, '400'),
  font('BS Text', `${SS}/SourceSerif4SmText-It.ttf.woff2`, '400', 'italic'),
  font('BS Text', `${SS}/SourceSerif4SmText-Semibold.ttf.woff2`, '600'),
  font('BS Text', `${SS}/SourceSerif4SmText-Bold.ttf.woff2`, '700'),
  font('BS Caption', `${SS}/SourceSerif4Caption-Regular.ttf.woff2`, '400'),
  font('BS Caption', `${SS}/SourceSerif4Caption-It.ttf.woff2`, '400', 'italic'),
  font('BS Deck', `${SS}/SourceSerif4-Regular.ttf.woff2`, '400'),
  font('BS Deck', `${SS}/SourceSerif4-It.ttf.woff2`, '400', 'italic'),
  // Titoli: Playfair Display, un bodoniano ad alto contrasto, come i titoli dei quotidiani.
  // Pesi statici: i font variabili finirebbero nel PDF come Type 3, che le tipografie non amano.
  font('BS Head', '@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff2', '700'),
  font('BS Head', '@fontsource/playfair-display/files/playfair-display-latin-800-normal.woff2', '800'),
  font('BS Head', '@fontsource/playfair-display/files/playfair-display-latin-900-normal.woff2', '900'),
  font('BS Head', '@fontsource/playfair-display/files/playfair-display-latin-500-italic.woff2', '500', 'italic'),
  font('BS Head', '@fontsource/playfair-display/files/playfair-display-latin-700-italic.woff2', '700', 'italic'),
  font('BS Head', '@fontsource/playfair-display/files/playfair-display-latin-ext-700-normal.woff2', '700', 'normal', 'U+0100-024F,U+1E00-1EFF'),
  font('BS Head', '@fontsource/playfair-display/files/playfair-display-latin-ext-800-normal.woff2', '800', 'normal', 'U+0100-024F,U+1E00-1EFF'),
  font('BS Head', '@fontsource/playfair-display/files/playfair-display-latin-ext-900-normal.woff2', '900', 'normal', 'U+0100-024F,U+1E00-1EFF'),
  // Testata in gotico, come i grandi quotidiani dell'Ottocento.
  font('BS Black', '@fontsource/unifrakturmaguntia/files/unifrakturmaguntia-latin-400-normal.woff2', '400'),
  font('BS Chess', '@fontsource/noto-sans-symbols-2/files/noto-sans-symbols-2-symbols-400-normal.woff2', '400'),
].join('\n');

/* ── Immagini ───────────────────────────────────────────────────────────── */

const UA = 'Mozilla/5.0 (compatible; Boomscroll/1.0; +https://gitommydotcom.github.io/boomscroll/)';

async function download(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/avif,image/webp,image/*;q=0.8' }, signal: AbortSignal.timeout(20_000) });
    if (!res.ok || !/image/.test(res.headers.get('content-type') ?? 'image/')) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Foto per la carta: scala di grigi, contrasto da stampa, al massimo 1400 px di lato
 * (circa 300 dpi su una colonna, 220 su tutta la pagina), JPEG leggero.
 */
export async function printPhoto(buf: Buffer, opts: { wide?: boolean; line?: boolean } = {}): Promise<Img | null> {
  try {
    let img = sharp(buf, { failOn: 'none' }).rotate();
    const m = await img.metadata();
    if (!m.width || !m.height || m.width < 280) return null;
    if (opts.wide) {
      const w = Math.min(1280, m.width);
      img = img.resize({ width: w, height: Math.round((w * 9) / 16), fit: 'cover' });
    } else img = img.resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true });
    img = img.flatten({ background: '#ffffff' }).grayscale();
    const out = opts.line
      ? await img.png({ palette: true, colours: 16 }).toBuffer({ resolveWithObject: true })
      : await img.normalise({ lower: 1, upper: 99 }).linear(1.04, -4).jpeg({ quality: 72, mozjpeg: true }).toBuffer({ resolveWithObject: true });
    return { src: `data:image/${opts.line ? 'png' : 'jpeg'};base64,${out.data.toString('base64')}`, ar: out.info.width / out.info.height };
  } catch {
    return null;
  }
}

async function imageFor(item: Item): Promise<Img | null> {
  if (item.kind === 'video' && item.youtubeId) {
    for (const size of ['maxresdefault', 'hqdefault']) {
      const buf = await download(`https://i.ytimg.com/vi/${item.youtubeId}/${size}.jpg`);
      const img = buf && (await printPhoto(buf, { wide: true }));
      if (img) return img;
    }
    return null;
  }
  if (!item.image) return null;
  const buf = await download(item.image);
  return buf ? printPhoto(buf, { line: item.kind === 'comic' }) : null;
}

async function mapLimit<T, R>(list: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(list.length);
  let k = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, list.length) }, async () => {
      while (k < list.length) {
        const i = k++;
        out[i] = await fn(list[i]);
      }
    }),
  );
  return out;
}

/* ── QR ─────────────────────────────────────────────────────────────────── */

/** Moduli di almeno 0,4 mm (si leggono con qualunque telefono), lato in righe intere. */
export const qr: QrFn = (url) => {
  const code = QRCode.create(url, { errorCorrectionLevel: 'L' });
  const modules = code.modules.size;
  const pt = Math.max(33, modules * 1.15);
  const lines = Math.ceil(pt / 11);
  const size = modules;
  let path = '';
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (code.modules.get(x, y)) path += `M${x} ${y}h1v1h-1z`;
  return { svg: `<svg viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" aria-hidden="true"><path d="${path}" fill="#000"/></svg>`, lines };
};

/* ── Dati dell'edizione ─────────────────────────────────────────────────── */

async function weatherOn(date: string): Promise<Meta['weather']> {
  try {
    const url =
      'https://api.open-meteo.com/v1/forecast?latitude=42.3498&longitude=13.3995&timezone=Europe%2FRome' +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&start_date=${date}&end_date=${date}`;
    const d = (await (await fetch(url, { signal: AbortSignal.timeout(10_000) })).json()) as any;
    const code = d.daily?.weather_code?.[0];
    if (code === undefined || code === null) return undefined;
    return {
      label: weatherLabel(code)[0],
      max: Math.round(d.daily.temperature_2m_max[0]),
      min: Math.round(d.daily.temperature_2m_min[0]),
      rain: Math.round(d.daily.precipitation_probability_max?.[0] ?? 0),
    };
  } catch {
    return undefined;
  }
}

const TIME = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });

async function metaFor(edition: Edition, allIds: string[]): Promise<Meta> {
  const id = editionId(edition);
  const first = allIds[0]?.slice(0, 10) ?? edition.date;
  const year = Math.floor((Date.parse(edition.date) - Date.parse(first)) / (365 * 86_400_000)) + 1;
  return {
    number: allIds.indexOf(id) + 1 || allIds.length,
    year,
    weather: await weatherOn(edition.date),
    sources: edition.sources.filter((s) => s.ok).length,
    generated: TIME.format(new Date(edition.generatedAt)).replace(',', ' alle'),
  };
}

/* ── HTML ───────────────────────────────────────────────────────────────── */

export function paperHtml(plan: PaperPlan, meta: Meta, ctx: RenderCtx, css: string): string {
  const e = plan.edition;
  const titles: Record<string, string> = Object.fromEntries([...GROUPS, VIDEO_GROUP, LOCAL_GROUP, { id: 'tempo', title: 'Tempo libero' }].map((g) => [g.id, g.title]));
  const flow = plan.groups
    .map(({ group, stories }) => {
      const blocks = stories.map((s, k) =>
        group.id === VIDEO_GROUP.id ? videoHtml(s, ctx) : group.id === LOCAL_GROUP.id ? eventHtml(s) : storyHtml(s, group.id, k === 0 ? 'lead' : 'story', ctx),
      );
      const sub = group.id === VIDEO_GROUP.id ? 'Inquadra il codice con il telefono per guardarli' : group.id === LOCAL_GROUP.id ? 'Eventi e proposte in città' : sectionSub(stories);
      return sectionHtml(group.id, group.title, sub) + blocks.join('');
    })
    .join('');
  const fill = plan.fill
    .sort((a, b) => score(b) - score(a))
    .map((i) => briefHtml(i, groupOf(i)))
    .join('');
  const teasers = plan.teasers.map((t) => teaserHtml(t, plan.groups.find((g) => g.stories.includes(t))?.group.id ?? '')).join('');
  const pageMeta = { groups: titles, date: longDate(e.date), maxInner: MAX_INNER };
  const title = `Boomscroll · ${longDate(e.date)} · edizione ${editionId(e).split('-').pop()}`;
  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><title>${title}</title>
<style>${FONTS}\n${css}</style></head>
<body>
<script type="application/json" id="meta">${JSON.stringify(pageMeta).replace(/</g, '\\u003c')}</script>
<main id="pages">
<section class="page front" data-n="1">${mastheadHtml(plan, meta)}<div class="front-body"><div class="region r3" id="front-main"></div><aside class="side">${sidebarHtml(plan, meta)}</aside></div></section>
</main>
<template id="t-front-lead">${plan.lead ? storyHtml(plan.lead, groupOf(plan.lead), 'lead', ctx, true) : ''}</template>
<template id="t-teasers">${teasers}</template>
<template id="t-flow">${flow}</template>
<template id="t-fill">${fill}</template>
<template id="t-briefs">${plan.groups
    .filter((g) => g.group.id !== VIDEO_GROUP.id && g.group.id !== LOCAL_GROUP.id)
    .flatMap((g) => g.stories.slice(1).map((s) => briefHtml(s, g.group.id)))
    .join('')}</template>
<template id="t-games">${gamesHtml(plan, ctx)}</template>
<template id="t-colophon">${colophonHtml(plan, meta)}</template>
<script src="${pathToFileURL(join(HERE, 'layout.js')).href}"></script>
</body></html>`;
}

/* ── PDF ────────────────────────────────────────────────────────────────── */

async function render(browser: Browser, edition: Edition, allIds: string[], css: string, workDir: string) {
  const plan = planPaper(edition);
  const want = [plan.lead, ...plan.groups.flatMap((g) => g.stories), plan.comic].filter((i): i is Item => !!i && plan.pictured.has(i.id));
  const imgs = await mapLimit(want, 6, imageFor);
  const images = new Map<string, Img>();
  want.forEach((w, k) => imgs[k] && images.set(w.id, imgs[k]!));
  const meta = await metaFor(edition, allIds);
  const html = paperHtml(plan, meta, { images, qr }, css);
  const id = editionId(edition);
  const file = join(workDir, `${id}.html`);
  await writeFile(file, html);
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
  try {
    await page.emulateMedia({ media: 'print' });
    await page.goto(pathToFileURL(file).href, { waitUntil: 'load', timeout: 120_000 });
    await page.waitForFunction(() => (window as any).__layout, null, { timeout: 240_000 });
    const result = (await page.evaluate(() => (window as any).__layout)) as { pages?: number; unplaced?: number; error?: string };
    if (result.error) throw new Error(result.error);
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true, tagged: true, outline: true });
    console.log(`  📰 ${id}: ${result.pages} pagine, ${images.size}/${want.length} foto, ${(pdf.length / 1024 / 1024).toFixed(1)} MB${result.unplaced ? `, ${result.unplaced} pezzi rimasti fuori` : ''}`);
    return { pdf, pages: result.pages ?? 0 };
  } finally {
    await page.close();
    if (!KEEP_HTML) await rm(file, { force: true });
  }
}

async function main() {
  const index = JSON.parse(await readFile(join(DATA, 'index.json'), 'utf8')) as EditionIndex;
  const allIds = (await readdir(join(DATA, 'editions'))).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();
  const targets = ONLY ? index.editions.filter((e) => editionId(e) === ONLY) : index.editions.slice(0, HOW_MANY);
  const css = await readFile(join(HERE, 'giornale.css'), 'utf8');
  // La cache vale finché non cambiano l'edizione o il codice del giornale.
  const version = createHash('sha1')
    .update(css + (await readFile(join(HERE, 'layout.js'), 'utf8')) + (await readFile(join(HERE, 'paper.ts'), 'utf8')) + (await readFile(join(HERE, 'typo.ts'), 'utf8')))
    .digest('hex')
    .slice(0, 10);
  await mkdir(OUT, { recursive: true });
  await mkdir(CACHE, { recursive: true });
  const manifest: { id: string; date: string; slot?: string; file: string; pages: number; bytes: number }[] = [];
  const keep = new Set<string>();
  let browser: Browser | null = null;
  console.log(`🗞️  Giornale: ${targets.length} edizioni → ${OUT}`);
  for (const entry of targets) {
    const id = editionId(entry);
    const key = `${id}__${createHash('sha1').update(entry.generatedAt ?? '').digest('hex').slice(0, 8)}__${version}`;
    keep.add(key);
    const cached = join(CACHE, `${key}.pdf`);
    let pages: number;
    if (existsSync(cached)) {
      pages = JSON.parse(await readFile(join(CACHE, `${key}.json`), 'utf8')).pages;
      console.log(`  ♻️  ${id}: dalla cache`);
    } else {
      const edition = JSON.parse(await readFile(join(DATA, 'editions', `${id}.json`), 'utf8')) as Edition;
      browser ??= await chromium.launch();
      try {
        const r = await render(browser, edition, allIds, css, OUT);
        await writeFile(cached, r.pdf);
        await writeFile(join(CACHE, `${key}.json`), JSON.stringify({ pages: r.pages }));
        pages = r.pages;
      } catch (e) {
        console.log(`  ⚠️  ${id}: giornale non creato (${(e as Error).message.split('\n')[0]})`);
        continue;
      }
    }
    await copyFile(cached, join(OUT, `${id}.pdf`));
    const bytes = (await readFile(cached)).length;
    manifest.push({ id, date: entry.date, slot: entry.slot, file: `${id}.pdf`, pages, bytes });
  }
  await browser?.close();
  if (!ONLY) {
    for (const f of await readdir(CACHE)) if (!keep.has(f.replace(/\.(pdf|json)$/, ''))) await rm(join(CACHE, f), { force: true });
    await writeFile(join(OUT, 'index.json'), JSON.stringify({ updatedAt: new Date().toISOString(), editions: manifest }, null, 1));
  }
  console.log(`✅ ${manifest.length} giornali pronti`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
