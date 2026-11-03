/**
 * Tipografia del testo per la stampa: virgolette, apostrofi, trattini, spazi indivisibili e sillabazione.
 * Il risultato è testo già pronto per l'HTML (escape incluso), con i trattini morbidi (U+00AD)
 * nei punti in cui la parola si può spezzare.
 */
import { createRequire } from 'node:module';
// I pattern sono moduli CommonJS: si importano interi.
import en from 'hyphen/en-us';
import it from 'hyphen/it';

const hyphenateEn = en.hyphenateSync;
const hyphenateIt = it.hyphenateSync;

/** Vocabolario italiano (parole comuni, in minuscolo): solo queste perdono la maiuscola nei titoli. */
const ITALIAN = new Set<string>(createRequire(import.meta.url)('an-array-of-italian-words'));
/** Luoghi e nomi che il vocabolario contiene ma restano maiuscoli. */
const KEEP = new Set(
  (
    'italia europa america africa asia oceania antartide artide roma milano napoli torino firenze venezia bologna genova palermo bari ' +
    'catania verona trieste aquila abruzzo lazio lombardia piemonte veneto toscana sicilia sardegna puglia calabria campania liguria marche ' +
    'umbria molise basilicata friuli trentino valle francia germania spagna portogallo grecia russia ucraina cina giappone india brasile ' +
    'argentina messico canada inghilterra irlanda scozia svizzera austria olanda belgio polonia svezia norvegia finlandia danimarca turchia ' +
    'egitto israele palestina iran iraq siria libano arabia australia corea africa stati uniti regno unito nazioni unite londra parigi berlino ' +
    'madrid lisbona atene mosca pechino tokyo vienna praga bruxelles amsterdam washington chicago boston california texas florida dio papa ' +
    'mario luca marco paolo giovanni pietro maria anna francesco giuseppe antonio alessandro natale pasqua terra luna sole marte giove venere ' +
    'saturno mercurio nettuno urano plutone mediterraneo atlantico pacifico alpi appennini tevere po nilo amazzonia sahara'
  ).split(' '),
);

export const SHY = '­';
export const NBSP = ' ';
/** Spazio fine indivisibile (tra numero e unità). */
export const NNBSP = ' ';

export const isItalian = (lang: string) => lang.toLowerCase().startsWith('it');

/** Toglie spazi doppi, a capo e residui di Markdown. */
export function clean(s: string): string {
  return s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/\*\*|__/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Virgolette e apostrofi tipografici. In italiano le citazioni vanno tra caporali («»),
 * come nei quotidiani; in inglese tra virgolette alte (“”).
 */
export function quotes(s: string, lang: string): string {
  const it = isItalian(lang);
  const [open, close] = it ? ['«', '»'] : ['“', '”'];
  let out = s
    // Apostrofo dentro la parola (l'acqua, don't) e prima delle cifre ('900).
    .replace(/(\p{L})'(?=\p{L})/gu, '$1’')
    .replace(/(^|[\s(])'(?=\d{2}\b)/gu, '$1’')
    // Virgolette semplici di apertura e chiusura.
    .replace(/(^|[\s(\[«“—–-])'(?=\S)/gu, '$1‘')
    .replace(/'/g, '’')
    // Virgolette doppie: apertura dopo spazio o parentesi, il resto chiude.
    .replace(/(^|[\s(\[—–-])"(?=\S)/gu, `$1${open}`)
    .replace(/"/g, close);
  if (it) out = out.replace(/“([^”]*)”/g, '«$1»');
  return out;
}

/** Puntini, lineette e trattini secondo l'uso italiano. */
export function dashes(s: string): string {
  return s
    .replace(/\.\.\./g, '…')
    .replace(/\s--?\s/g, ' – ')
    .replace(/--/g, '—')
    .replace(/(\d)\s?-\s?(\d)/g, '$1–$2');
}

const UNITS = '%|‰|°C|°F|°|km|m|cm|mm|kg|g|mg|l|ml|ha|km²|m²|anni|mesi|giorni|ore|minuti|secondi|milioni|miliardi|mila|euro|dollari|€|\\$';

/**
 * Spazi indivisibili: tra un numero e la sua unità, dopo le parole di una lettera
 * (che non devono restare in fondo alla riga) e prima dei due punti e del punto e virgola francesi.
 */
export function nbsp(s: string, lang: string): string {
  let out = s.replace(new RegExp(`(\\d) (${UNITS})(?=$|[\\s.,;:!?)»”…])`, 'gu'), `$1${NNBSP}$2`);
  out = out.replace(/(\d) (?=\d{3}\b)/g, `$1${NNBSP}`);
  if (isItalian(lang)) out = out.replace(/(^|\s)([aeioAEIOèÈ]|ed|ad|od|il|lo|la|le|gli|un|di|da|in|su|per|con|tra|fra|non) (?=\S)/gu, `$1$2${NBSP}`);
  else out = out.replace(/(^|\s)([aAI]|an|of|to|in|on|at|by|the) (?=\S)/gu, `$1$2${NBSP}`);
  // Le preposizioni brevi dopo uno spazio indivisibile non devono creare catene troppo lunghe:
  // una sola parola agganciata alla successiva basta.
  return out.replace(new RegExp(`${NBSP}(\\S+)${NBSP}`, 'g'), `${NBSP}$1 `);
}

/**
 * Sillabazione con i pattern di Liang (italiano o inglese). Regole da tipografia di quotidiano:
 * almeno due lettere prima del taglio e tre dopo, niente tagli in sigle, numeri, indirizzi web
 * o parole con maiuscole interne.
 */
export function hyphenate(s: string, lang: string): string {
  const fn = isItalian(lang) ? hyphenateIt : hyphenateEn;
  const raw = fn(s, { minWordLength: 6 });
  return raw.replace(/[\p{L}\p{N}­’'.@/:_-]+/gu, (word) => {
    if (!word.includes(SHY)) return word;
    const plain = word.replaceAll(SHY, '');
    if (/\d|@|\/|www\.|\.\w{2,3}$|\p{Lu}{2,}|\p{Ll}\p{Lu}/u.test(plain)) return plain;
    // Posizioni dei tagli nella parola senza trattini.
    const parts = word.split(SHY);
    let pos = 0;
    let out = '';
    parts.forEach((p, i) => {
      out += p;
      pos += p.length;
      if (i < parts.length - 1) {
        const before = plain.slice(0, pos).replace(/^\P{L}+/u, '');
        const after = plain.slice(pos).replace(/\P{L}+$/u, '');
        // Mai subito dopo un apostrofo (dell’|acqua non si spezza).
        if (before.length >= 2 && after.length >= 3 && !/[’']$/.test(before)) out += SHY;
      }
    });
    return out;
  });
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ESC[c]);

/** Testo di corpo: tipografia completa e sillabazione. */
export function body(s: string, lang = 'it'): string {
  return escapeHtml(hyphenate(nbsp(dashes(quotes(clean(s), lang)), lang), lang));
}

/** Titoli e didascalie: tipografia ma niente sillabazione (i titoli non si spezzano). */
export function title(s: string, lang = 'it'): string {
  return escapeHtml(nbsp(dashes(quotes(clean(s), lang)), lang));
}

/**
 * Titoli tradotti "all'inglese" (Ogni Parola Maiuscola) riportati all'uso italiano:
 * maiuscola solo all'inizio e nei nomi propri. I nomi propri si riconoscono dal testo
 * dell'articolo, dove compaiono con la maiuscola anche a metà frase.
 */
export function sentenceCase(title: string, context: string): string {
  const words = title.split(/\s+/);
  const long = words.filter((w) => /^\p{L}{4,}/u.test(w));
  const caps = long.filter((w) => /^\p{Lu}\p{Ll}/u.test(w));
  if (long.length < 3 || caps.length / long.length < 0.6) return title;
  // Parole con la maiuscola nel testo: a metà frase sono nomi propri; a inizio frase lo sono
  // se non sono parole comuni con cui si apre una frase (Il, Secondo, Questo…).
  const STARTERS = /^(il|lo|la|i|gli|le|un|uno|una|in|nel|nella|nei|negli|nelle|per|con|da|dal|dalla|di|del|della|dopo|secondo|questo|questa|questi|queste|quando|mentre|anche|ma|e|se|non|si|ci|come|perché|oggi|ieri|tra|fra|lo|l|un|ecco|ora|così|già|ogni|alcuni|molti|più|studio|ricerca|nuovo|nuova)$/i;
  const proper = new Set<string>();
  for (const m of context.matchAll(/(^|[.!?:]\s+)?\b(\p{Lu}[\p{L}’'-]+)/gu)) {
    const w = m[2].replace(/[’'].*$/, '');
    if (m[1] !== undefined && STARTERS.test(w)) continue;
    proper.add(w);
  }
  let first = true;
  return words
    .map((w) => {
      const core = w.replace(/^[^\p{L}]+/u, '');
      const m = core.match(/^(\p{L}+)[’']?(\p{L}*)/u);
      if (!m) return w;
      if (first) {
        first = false;
        return w;
      }
      // Sigle, iniziali puntate e parole con maiuscole interne restano come sono.
      if (/^\p{Lu}{2,}/u.test(core) || /^\p{Lu}\./u.test(core) || /\p{Ll}\p{Lu}/u.test(core)) return w;
      // Elisioni: l'Invio → l'invio, dell'Europa resta se Europa è un nome proprio.
      const elided = m[2] ? m[2] : m[1];
      // Stessa radice di un nome proprio del testo (grafie diverse: Saporischja / Saporischschja).
      const root = (x: string) => x.slice(0, 6);
      if (proper.has(elided) || proper.has(m[1]) || [...proper].some((p) => p.length >= 6 && elided.length >= 6 && root(p) === root(elided))) return w;
      // Solo le parole del vocabolario perdono la maiuscola: nomi e luoghi sconosciuti restano come sono.
      const lc = elided.toLowerCase();
      if (!ITALIAN.has(lc) || KEEP.has(lc)) return w;
      return m[2] ? w.replace(m[2], m[2].charAt(0).toLowerCase() + m[2].slice(1)) : w.replace(m[1], m[1].charAt(0).toLowerCase() + m[1].slice(1));
    })
    .join(' ');
}

/** Le prime frasi di un testo, entro un numero di caratteri (per le brevi). */
export function sentences(s: string, max: number): string {
  const text = clean(s);
  if (text.length <= max) return text;
  const parts = text.match(/[^.!?…]+[.!?…]+(\s|$)/g) ?? [];
  let out = '';
  for (const p of parts) {
    if ((out + p).length > max) break;
    out += p;
  }
  if (out.trim()) return out.trim();
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

/** Dominio leggibile di un indirizzo, senza "www.". */
export function domain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
