/**
 * Il giornale di un'edizione: quali contenuti, in che sezione e con che peso,
 * e l'HTML di ogni blocco. L'impaginazione vera (colonne, pagine, riempimento)
 * la fa layout.js dentro Chromium, misurando il testo composto.
 */
import { categoryMeta } from '../shared/categories';
import { repairTitle } from '../shared/titles';
import { SLOT_LABEL, editionSlot, type CategoryId, type Edition, type Item } from '../shared/types';
import { challengeFor, journalPromptFor } from '../src/lib/exercises';
import { diagram, solution, task } from './chess';
import * as T from './typo';

export interface Img {
  src: string;
  /** Larghezza / altezza. */
  ar: number;
}

export interface Group {
  id: string;
  title: string;
  cats: CategoryId[];
  /** Quanti articoli al massimo (gli altri possono diventare brevi). */
  cap: number;
}

export const GROUPS: Group[] = [
  { id: 'attualita', title: 'Attualità', cats: ['notizie'], cap: 14 },
  { id: 'scienza', title: 'Scienza e natura', cats: ['scienza', 'natura'], cap: 14 },
  { id: 'tecnologia', title: 'Tecnologia e design', cats: ['tech', 'design'], cap: 10 },
  { id: 'cultura', title: 'Cultura', cats: ['arte', 'storia', 'cultura', 'filosofia', 'poesia'], cap: 12 },
  { id: 'idee', title: 'Persone e idee', cats: ['psicologia', 'antropologia', 'produttivita', 'abitudini', 'universita', 'lingue'], cap: 10 },
  { id: 'curiosita', title: 'Curiosità', cats: ['curiosita', 'divertimento'], cap: 8 },
];
export const VIDEO_GROUP = { id: 'video', title: 'Da guardare' };
export const LOCAL_GROUP = { id: 'vicino', title: 'L’Aquila e dintorni' };

const SPECIAL = new Set(['chess', 'word', 'poem', 'comic', 'video', 'event']);

/** Il giornale è in italiano: fuori i pezzi in altre lingue rimasti senza riassunto né traduzione. */
export const readable = (i: Item) => i.lang.startsWith('it') || (i.ai && !!i.summary);

/** Domande del quiz scritte davvero in italiano. */
const italianQuiz = (i: Item) => !!i.quiz && !/[¿¡]|\b(qué|cuál|cómo|los|las|und|der|die|les|des|what|which|the)\b/i.test(`${i.quiz.q} ${i.quiz.options.join(' ')}`);

/** Sezione del giornale di un contenuto (per le brevi). */
export const groupOf = (i: Item) => GROUPS.find((g) => g.cats.includes(i.category))?.id ?? 'curiosita';

/** Sottotitolo della testatina di sezione: quanti pezzi e da dove. */
export function sectionSub(stories: Item[]): string {
  const names = [...new Set(stories.map(sourceName))];
  if (names.length === 1) return `Da ${names[0]}`;
  const head = names.slice(0, 2).join(', ');
  const more = names.length - 2;
  return more > 0 ? `Da ${head} ${more === 1 ? 'e un’altra fonte' : `e altre ${more} fonti`}` : `Da ${names.join(' e ')}`;
}

export const score = (i: Item) => 0.6 * i.quality + 0.4 * ((i.interest ?? 3) / 5) + (i.image ? 0.05 : 0);

export interface PlannedGroup {
  group: { id: string; title: string };
  stories: Item[];
}

export interface PaperPlan {
  edition: Edition;
  lead?: Item;
  groups: PlannedGroup[];
  /** Brevi per riempire le colonne: in ordine di importanza. */
  fill: Item[];
  /** Rimandi in prima pagina: il pezzo migliore di ogni sezione. */
  teasers: Item[];
  /** Contenuti con foto (gli altri solo testo). */
  pictured: Set<string>;
  chess?: Item;
  poem?: Item;
  comic?: Item;
  word?: Item;
  quiz: Item[];
}

/** Sceglie i contenuti del giornale e il loro peso. Nessuna clip breve: sulla carta non si guardano. */
export function planPaper(edition: Edition, city = 'laquila'): PaperPlan {
  const items = edition.items.filter((i) => !i.short && (readable(i) || SPECIAL.has(i.kind)));
  const pictured = new Set<string>();
  const regular = items.filter((i) => !SPECIAL.has(i.kind)).sort((a, b) => score(b) - score(a));
  // Apertura: il miglior articolo con foto (non un'opera d'arte: in prima pagina va una notizia).
  const fit = (i: Item) => i.image && i.kind !== 'artwork' && !i.imageNote && headline(i).text.length <= 95;
  const lead = regular.find(fit) ?? regular.find((i) => i.image && i.kind !== 'artwork') ?? regular.find((i) => i.image);
  if (lead) pictured.add(lead.id);

  const used = new Set(lead ? [lead.id] : []);
  const groups: PlannedGroup[] = [];
  for (const g of GROUPS) {
    const list = regular.filter((i) => g.cats.includes(i.category) && !used.has(i.id));
    // In testa il pezzo con la foto migliore, poi l'ordine di importanza.
    // Apertura: un pezzo con foto e un titolo che non occupi mezza colonna.
    const short = (i: Item) => headline(i).text.length <= 110;
    const head = list.find((i) => i.image && !i.imageNote && short(i)) ?? list.find((i) => i.image && short(i)) ?? list.find((i) => i.image);
    const stories = (head ? [head, ...list.filter((i) => i !== head)] : list).slice(0, g.cap);
    if (!stories.length) continue;
    stories.forEach((s) => used.add(s.id));
    // Foto: il pezzo d'apertura della sezione e altri due.
    stories.filter((s) => s.image).slice(0, 3).forEach((s) => pictured.add(s.id));
    groups.push({ group: g, stories });
  }
  const videos = items.filter((i) => i.kind === 'video' && i.youtubeId).sort((a, b) => score(b) - score(a)).slice(0, 8);
  if (videos.length >= 2) {
    groups.push({ group: VIDEO_GROUP, stories: videos });
    videos.forEach((v) => (used.add(v.id), pictured.add(v.id)));
  }
  const local = (edition.local[city] ?? []).slice(0, 8);
  if (local.length) {
    groups.push({ group: LOCAL_GROUP, stories: local });
    local.forEach((v) => used.add(v.id));
  }
  const fill = regular.filter((i) => !used.has(i.id));
  const teasers = groups.filter((g) => g.group.id !== LOCAL_GROUP.id).map((g) => g.stories[0]);
  const inPaper = groups.flatMap((g) => g.stories);
  const quiz = [...inPaper, ...(lead ? [lead] : [])].filter(italianQuiz).sort((a, b) => score(b) - score(a)).slice(0, 5);
  const comic = items.find((i) => i.kind === 'comic' && i.image);
  if (comic) pictured.add(comic.id);
  return {
    edition,
    lead,
    groups,
    fill,
    teasers,
    pictured,
    chess: items.find((i) => i.kind === 'chess' && i.chess),
    poem: items.find((i) => i.kind === 'poem' && i.excerpt),
    comic,
    word: items.find((i) => i.kind === 'word' && i.word),
    quiz,
  };
}

/* ── Testo ─────────────────────────────────────────────────────────────── */

/** Lingua del testo italiano dell'articolo (il riassunto è in italiano se l'ha scritto l'IA). */
const textLang = (i: Item) => (i.ai || i.lang.startsWith('it') ? 'it' : i.lang);
/** Traduzione del titolo utilizzabile (a volte l'IA restituisce pezzi del suo JSON). */
const titleIt = (i: Item) => repairTitle(i.titleIt);
/** Il titolo come va in pagina, in italiano corrente. */
export const headline = (i: Item) => {
  const t = titleIt(i);
  if (t) return { text: T.sentenceCase(T.clean(t), i.summary), lang: 'it' };
  return { text: i.lang.startsWith('it') ? T.sentenceCase(T.clean(i.title), i.summary) : T.clean(i.title), lang: i.lang };
};
const hed = (i: Item) => {
  const h = headline(i);
  return T.title(h.text, h.lang);
};
/** Classe di corpo del titolo secondo la lunghezza: i titoli lunghi si compongono più piccoli. */
const hedSize = (i: Item, long = 78, xlong = 115) => {
  const n = headline(i).text.length;
  return n > xlong ? ' xl' : n > long ? ' long' : '';
};
const attr = (s: string) => T.escapeHtml(s);

/** Nomi delle fonti in altri alfabeti, detti in italiano (BBC 中文 → BBC in cinese). */
const SCRIPTS: [RegExp, string][] = [
  [/中文/, 'in cinese'],
  [/عربي/, 'in arabo'],
  [/日本語/, 'in giapponese'],
  [/한국어/, 'in coreano'],
  [/Русск\S*/i, 'in russo'],
];
export function sourceName(i: Item): string {
  let n = i.sourceName;
  for (const [re, it] of SCRIPTS) n = n.replace(re, it);
  return n.replace(/[^\p{Script=Latin}\p{N}\p{P}\p{Zs}·&+]/gu, '').replace(/\s{2,}/g, ' ').trim() || 'Fonte';
}

function kicker(i: Item, extra?: string) {
  const tag = i.tags[0];
  return [extra ?? categoryMeta(i.category).label, tag && tag.length < 28 ? tag : null].filter(Boolean).join(' · ');
}

function byline(i: Item) {
  const author = i.author?.replace(/\s+(and|und|y|et)\s+/g, ' e ');
  const who = author && author.length < 50 && !/\bhttps?:|@/.test(author) ? `di ${T.title(author, 'it')} · ` : '';
  return `${who}${T.title(sourceName(i), 'it')}`;
}

function paragraphs(i: Item, lead: boolean): string {
  const ps = [`<p>${T.body(i.summary, textLang(i))}</p>`];
  if (lead) {
    if (i.excerptIt) ps.push(`<p>${T.body(i.excerptIt, 'it')}</p>`);
    else if (i.excerpt && i.excerpt !== i.summary && i.kind !== 'poem') {
      const it = i.lang.startsWith('it');
      const ex = T.body(T.sentences(i.excerpt, 340), i.lang);
      ps.push(it ? `<p>${ex}</p>` : `<p class="orig"><span class="lab">Dall’originale</span> ${ex}</p>`);
    }
  }
  return ps.join('');
}

function figure(i: Item, img: Img | undefined, opts: { span?: boolean; min: number; max: number }) {
  if (!img) return '';
  const credit = i.kind === 'video' ? 'YouTube' : i.imageNote ? 'Wikipedia' : sourceName(i);
  // Didascalia solo se il testo alternativo è in italiano (altrimenti solo il credito).
  const alt = i.imageAlt && i.lang.startsWith('it') && i.imageAlt.length > 18 && i.imageAlt !== i.title ? T.title(T.sentences(i.imageAlt, 160), i.lang) : '';
  return (
    `<figure class="fig${opts.span ? ' span' : ''}">` +
    `<img src="${img.src}" alt="${attr(i.imageAlt ?? '')}" data-ar="${img.ar.toFixed(4)}" data-min="${opts.min}" data-max="${opts.max}">` +
    `<figcaption class="snap">${alt ? `<span class="cap">${alt}</span> ` : ''}<span class="cr">${i.imageNote ? 'Immagine illustrativa · ' : 'Foto · '}${T.title(credit)}</span></figcaption>` +
    `</figure>`
  );
}

export type QrFn = (url: string) => { svg: string; lines: number };

function qrBlock(qr: QrFn, url: string, label: string) {
  const q = qr(url);
  return `<div class="qr snap" style="--q:${q.lines}">${q.svg}<span><b>${label}</b><br><span class="dom">${T.title(T.domain(url))}</span></span></div>`;
}

/* ── Blocchi ───────────────────────────────────────────────────────────── */

export interface RenderCtx {
  images: Map<string, Img>;
  qr: QrFn;
}

/** Un articolo nel flusso delle colonne. */
export function storyHtml(i: Item, group: string, role: 'lead' | 'story', ctx: RenderCtx, front = false): string {
  const img = ctx.images.get(i.id);
  const lead = role === 'lead';
  // L'apertura di sezione occupa tutta la larghezza se la foto è orizzontale.
  const wide = lead && !!img && img.ar >= 1.15;
  const fig = figure(i, img, wide ? { span: true, min: front ? 11 : 12, max: front ? 14 : 18 } : { min: 6, max: lead ? 20 : 15 });
  const head =
    `<div class="hg snap${wide ? ' span' : ''}"><p class="kick">${T.title(kicker(i))}</p>` +
    `<h3 class="hed${lead ? hedSize(i, front ? 70 : 64, front ? 100 : 95) : hedSize(i)}">${hed(i)}</h3>` +
    (titleIt(i) && lead && i.title.length < (front ? 90 : 110) ? `<p class="dek">${T.title(i.title, i.lang)}</p>` : '') +
    `<p class="by">${byline(i)}</p></div>`;
  // Foto e titolo stanno insieme: un blocco unico che non si spezza tra due colonne.
  const order = wide ? head + fig : `<div class="top">${fig}${head}</div>`;
  return (
    `<article class="st ${role}${img ? ' pic' : ''}" data-id="${attr(i.id)}" data-group="${group}">` +
    order +
    `<div class="txt">${paragraphs(i, lead)}</div>` +
    (lead ? qrBlock(ctx.qr, i.url, 'Leggi l’originale') : '') +
    `</article>`
  );
}

/** Un video: miniatura, titolo e codice QR per guardarlo dal telefono. */
export function videoHtml(i: Item, ctx: RenderCtx): string {
  const img = ctx.images.get(i.id);
  const url = `https://youtu.be/${i.youtubeId}`;
  return (
    `<article class="st vid" data-id="${attr(i.id)}" data-group="${VIDEO_GROUP.id}"><div class="top">` +
    figure(i, img, { min: 6, max: 9 }) +
    `<div class="hg snap"><p class="kick">${T.title(`Video · ${categoryMeta(i.category).label}`)}</p><h3 class="hed${hedSize(i)}">${hed(i)}</h3><p class="by">${T.title(sourceName(i))}</p></div></div>` +
    `<div class="txt"><p>${T.body(T.sentences(i.summary, 300), textLang(i))}</p></div>` +
    qrBlock(ctx.qr, url, 'Guarda il video') +
    `</article>`
  );
}

/** Evento locale: titolo, quando e dove, due righe. */
export function eventHtml(i: Item): string {
  return (
    `<article class="st ev" data-id="${attr(i.id)}" data-group="${LOCAL_GROUP.id}">` +
    `<div class="hg snap"><p class="kick">${T.title(sourceName(i))}</p><h3 class="hed sm">${hed(i)}</h3></div>` +
    `<div class="txt"><p>${T.body(T.sentences(i.summary, 260), 'it')}</p></div></article>`
  );
}

/** Breve: titolo in neretto in corpo, una o due frasi, la fonte. */
export function briefHtml(i: Item, group: string): string {
  return (
    `<p class="br" data-id="${attr(i.id)}" data-group="${group}"><b>${hed(i)}${/[.?!…»”]$/.test(headline(i).text) ? '' : '.'}</b> ` +
    `${T.body(T.sentences(i.summary, 210), textLang(i))} <span class="src">${T.title(sourceName(i))}</span></p>`
  );
}

/** Testatina di sezione, larga quanto la pagina. */
export function sectionHtml(id: string, title: string, sub: string): string {
  return `<header class="sect snap" data-sect="${id}" data-group="${id}"><h2>${T.title(title)}</h2><p>${T.title(sub)}</p></header>`;
}

/** Rimando in prima pagina, con il numero di pagina riempito dopo l'impaginazione. */
export function teaserHtml(i: Item, group: string): string {
  return (
    `<article class="st tz" data-ref="${attr(i.id)}" data-group="${group}">` +
    `<div class="hg snap"><p class="kick">${T.title(categoryMeta(i.category).label)}</p><h3 class="hed${hedSize(i)}">${hed(i)}</h3></div>` +
    `<div class="txt"><p>${T.body(T.sentences(i.summary, 190), textLang(i))} <span class="ref">→&#8239;pagina&nbsp;<b data-page="${attr(i.id)}"></b></span></p></div>` +
    `</article>`
  );
}

/* ── Pagine fisse ──────────────────────────────────────────────────────── */

export interface Meta {
  number: number;
  year: number;
  /** Il tempo a L'Aquila nel giorno dell'edizione, se disponibile. */
  weather?: { label: string; max: number; min: number; rain: number };
  sources: number;
  generated: string;
}

const DAY = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' });
export const longDate = (iso: string) => {
  const s = DAY.format(new Date(`${iso}T12:00:00Z`));
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export function mastheadHtml(plan: PaperPlan, meta: Meta): string {
  const e = plan.edition;
  const w = meta.weather;
  const left = w
    ? `<p class="kick">Il tempo</p><p class="ew">${T.title(w.label)}</p><p>L’Aquila · <b>${w.max}°</b>/${w.min}°${w.rain >= 20 ? `<br>pioggia ${w.rain}%` : ''}</p>`
    : `<p class="kick">Tre edizioni al giorno</p><p class="ew">Mattino, pomeriggio, sera</p><p>e poi finisce</p>`;
  return (
    `<header class="mast">` +
    `<div class="ear l">${left}</div>` +
    `<div class="nameplate"><h1>Boomscroll</h1><p class="motto">Il giornale che finisce</p></div>` +
    `<div class="ear r"><p class="kick">Prezzo</p><p class="ew">Zero euro</p><p>Pubblicità: nessuna<br>Notifiche: nessuna</p></div>` +
    `</header>` +
    `<div class="folio"><span>Anno ${ROMAN[meta.year] ?? meta.year} · N. ${meta.number}</span><span>${longDate(e.date)}</span><span>Edizione ${SLOT_LABEL[editionSlot(e)]}</span></div>`
  );
}

/** Colonna laterale della prima pagina: sommario, parola del giorno, numeri, avvertenza sull'IA. */
export function sidebarHtml(plan: PaperPlan, meta: Meta): string {
  const idx = plan.groups
    .map((g) => `<li><span>${T.title(g.group.title)}</span><i></i><b data-sect-page="${g.group.id}"></b></li>`)
    .concat(plan.chess || plan.poem || plan.quiz.length ? [`<li><span>Tempo libero</span><i></i><b data-sect-page="tempo"></b></li>`] : [])
    .join('');
  const w = plan.word?.word;
  const word = w
    ? `<div class="box word"><p class="kick">La parola del giorno</p><p class="w">${T.title(w.word, w.lang)}</p>` +
      `<p class="wl">${T.title(plan.word!.sourceName)}</p><p class="wd">${T.body(w.definitionIt)}</p>` +
      (w.example ? `<p class="wx">${T.title(`"${w.example}"`, w.lang)}${w.exampleIt ? ` — ${T.title(w.exampleIt)}` : ''}</p>` : '') +
      `</div>`
    : '';
  const count = plan.groups.reduce((n, g) => n + g.stories.length, 0) + (plan.lead ? 1 : 0);
  return (
    `<div class="box idx"><p class="kick">In questo numero</p><ol>${idx}</ol></div>` +
    word +
    `<div class="box num"><p class="kick">L’edizione in numeri</p><p>${T.body(`${count} articoli scelti tra ${plan.edition.items.length} contenuti di ${meta.sources} fonti, da leggere fino in fondo e poi mettere via.`)}</p></div>` +
    `<div class="box note"><p class="kick">Come è fatto</p><p>${T.body('I riassunti sono scritti automaticamente da un modello di intelligenza artificiale e possono contenere imprecisioni: fa sempre fede l’articolo originale, raggiungibile con il codice QR.')}</p></div>`
  );
}

/** Ultima pagina: scacchi, quiz, poesia, la domanda del giorno, la vignetta, le soluzioni capovolte. */
export function gamesHtml(plan: PaperPlan, ctx: RenderCtx): string {
  const e = plan.edition;
  const parts: string[] = [];
  const sol: string[] = [];
  if (plan.chess?.chess) {
    const c = plan.chess.chess;
    parts.push(
      `<div class="g chess"><p class="kick">Scacchi · il problema</p><h3 class="hed">${T.title(task(c))}</h3>${diagram(c.fen)}` +
        `<p class="gcap">Difficoltà ${c.rating} · da Lichess. Cerca la mossa che forza il risultato, senza scacchiera.</p></div>`,
    );
    sol.push(`<b>Scacchi:</b> ${T.title(solution(c))}`);
  }
  if (plan.quiz.length) {
    const qs = plan.quiz
      .map(
        (i) =>
          `<li><p class="q">${T.body(i.quiz!.q)} <span class="qp">(pag.&nbsp;<b data-page="${attr(i.id)}"></b>)</span></p>` +
          `<p class="opts">${i.quiz!.options.map((o, k) => `<span><i>${'abc'[k]}</i>&#8239;${T.title(o)}</span>`).join(' ')}</p></li>`,
      )
      .join('');
    parts.push(`<div class="g quiz"><p class="kick">Il quiz</p><h3 class="hed">Hai letto bene?</h3><ol>${qs}</ol></div>`);
    sol.push(`<b>Quiz:</b> ${plan.quiz.map((i, n) => `<span class="qa" data-q="${n + 1}">${n + 1}&#8239;${'abc'[i.quiz!.answer]}</span>`).join('')}`);
  }
  if (plan.poem?.excerpt) {
    const p = plan.poem;
    const verses = p.excerpt!.split('\n').slice(0, 14).map((v) => `<span class="v">${T.title(v, p.lang)}</span>`).join('');
    parts.push(
      `<div class="g poem"><p class="kick">La poesia</p><h3 class="hed sm">${T.title(p.title, p.lang)}</h3>` +
        (p.author ? `<p class="by">${T.title(p.author, p.lang)}</p>` : '') +
        `<div class="verses">${verses}</div>${p.summary ? `<p class="gcap">${T.body(T.sentences(p.summary, 220))}</p>` : ''}</div>`,
    );
  }
  const ch = challengeFor(e.date);
  parts.push(
    `<div class="g ask"><p class="kick">La domanda del giorno</p><h3 class="hed sm">${T.title(journalPromptFor(e.date))}</h3>` +
      `<div class="lines">${'<i></i>'.repeat(9)}</div>` +
      `<p class="kick">La sfida</p><p class="ch"><b>${T.title(ch.title)}.</b> ${T.body(ch.text)}</p></div>`,
  );
  const comicImg = plan.comic && ctx.images.get(plan.comic.id);
  if (plan.comic && comicImg) {
    parts.push(
      `<div class="g comic"><p class="kick">La vignetta · ${T.title(plan.comic.sourceName)}</p><h3 class="hed sm">${hed(plan.comic)}</h3>` +
        `<img src="${comicImg.src}" alt="${attr(plan.comic.imageAlt ?? plan.comic.title)}" data-ar="${comicImg.ar.toFixed(4)}"></div>`,
    );
  }
  return (
    sectionHtml('tempo', 'Tempo libero', 'Giochi, una poesia e una domanda da fare a te') +
    `<div class="games">${parts.join('')}</div>` +
    (sol.length ? `<div class="sol"><p><span class="lab">Soluzioni</span> ${sol.join(' · ')}</p></div>` : '')
  );
}

export function colophonHtml(plan: PaperPlan, meta: Meta): string {
  const e = plan.edition;
  const model = e.ai.model ? `da un modello di intelligenza artificiale (${T.title(e.ai.model)})` : 'automaticamente';
  return (
    `<footer class="colophon"><p><b class="nm">Boomscroll</b> · giornale personale, ${T.title(`edizione ${SLOT_LABEL[editionSlot(e)]}`)} del ${longDate(e.date).toLowerCase()}, ` +
    `composta il ${meta.generated} da ${meta.sources} fonti pubbliche. ${T.body(`I riassunti sono scritti ${model} e possono contenere errori: fa fede l’articolo originale. Testi originali e immagini appartengono ai rispettivi autori e fonti. Stampato in proprio, senza pubblicità.`)}</p></footer>`
  );
}
