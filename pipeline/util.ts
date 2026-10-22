import { createHash } from 'node:crypto';

// Alcuni siti rifiutano gli user-agent "da bot": ci presentiamo come un normale browser.
export const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export async function http(
  url: string,
  opts: { timeoutMs?: number; headers?: Record<string, string>; method?: string; body?: string } = {},
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 20_000);
  try {
    const res = await fetch(url, {
      method: opts.method ?? 'GET',
      body: opts.body,
      headers: { 'User-Agent': UA, Accept: '*/*', 'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8', ...opts.headers },
      signal: ctrl.signal,
      redirect: 'follow',
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function getText(url: string, headers?: Record<string, string>, timeoutMs?: number): Promise<string> {
  const res = await http(url, { headers, timeoutMs });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export async function getJson<T = any>(url: string, headers?: Record<string, string>): Promise<T> {
  const res = await http(url, { headers: { Accept: 'application/json', ...headers } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export const sha = (s: string, len = 12) => createHash('sha1').update(s).digest('hex').slice(0, len);

/** Toglie parametri di tracciamento e frammenti, così gli stessi link coincidono. */
export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.hash = '';
    for (const k of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_|ref$|src$|cmpid|at_)/i.test(k)) u.searchParams.delete(k);
    }
    u.protocol = 'https:';
    let s = u.toString();
    if (s.endsWith('/')) s = s.slice(0, -1);
    return s;
  } catch {
    return raw.trim();
  }
}

export const itemId = (url: string) => sha(normalizeUrl(url));

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', laquo: '«', raquo: '»', eacute: 'é', egrave: 'è',
  agrave: 'à', ograve: 'ò', ugrave: 'ù', igrave: 'ì', Egrave: 'È', ccedil: 'ç', uuml: 'ü', ouml: 'ö',
  auml: 'ä', szlig: 'ß', copy: '©', reg: '®', trade: '™', middot: '·', bull: '•', deg: '°',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e] ?? m;
  });
}

export function htmlToText(html: string | undefined | null): string {
  if (!html) return '';
  return decodeEntities(
    String(html)
      .replace(/<(script|style|figure|figcaption|iframe)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h\d|blockquote)>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t ]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function firstImageInHtml(html: string | undefined): string | undefined {
  if (!html) return undefined;
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  if (!m) return undefined;
  const src = decodeEntities(m[1]);
  if (/feedburner|pixel|tracking|gravatar|emoji|\.gif($|\?)/i.test(src)) return undefined;
  return src.startsWith('http') ? src : undefined;
}

/** Tronca a un confine di frase, se possibile. */
export function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  if (lastStop > max * 0.5) return cut.slice(0, lastStop + 1);
  return cut.slice(0, cut.lastIndexOf(' ')) + '…';
}

export const readingMinutes = (words: number) => Math.max(1, Math.round(words / 220));

/** Numero pseudo-casuale deterministico a partire da una stringa (es. la data). */
export function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Data di oggi a Roma, formato AAAA-MM-GG. */
export function romeDate(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(d);
}
