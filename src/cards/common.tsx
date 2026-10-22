import { categoryMeta } from '../../shared/categories';
import { isHardLang, type Item } from '../../shared/types';
import { ago } from '../lib/dates';
import type { Settings } from '../lib/store';

const LANG_NAMES: Record<string, string> = {
  en: 'inglese',
  fr: 'francese',
  es: 'spagnolo',
  de: 'tedesco',
  ja: 'giapponese',
  zh: 'cinese',
  ru: 'russo',
  ar: 'arabo',
  pt: 'portoghese',
};
export const langName = (l: string) => LANG_NAMES[l.slice(0, 2)] ?? l;

/** Titolo principale e (se serve) quello secondario, secondo la modalità di lettura. */
export function titles(item: Item, mode: Settings['summaryMode']): { main: string; sub?: string } {
  if (item.kind === 'word' && item.word) return { main: item.word.word, sub: item.word.definitionIt };
  if (item.lang.startsWith('it') || !item.titleIt) return { main: item.title };
  if (mode === 'original' && !isHardLang(item.lang)) return { main: item.title, sub: item.titleIt };
  return { main: item.titleIt, sub: item.title };
}

/** Testo principale: riassunto in italiano, o l'originale in modalità "Allenami". */
export function bodyText(item: Item, mode: Settings['summaryMode']): string {
  if (mode === 'original' && !item.lang.startsWith('it') && !isHardLang(item.lang) && item.excerpt && item.kind !== 'poem') {
    return item.excerpt;
  }
  return item.summary;
}

export function CatTag({ item, light }: { item: Item; light?: boolean }) {
  const c = categoryMeta(item.category);
  return (
    <span class="cat-tag" style={light ? undefined : { color: 'var(--ink-3)' }}>
      {c.label}
    </span>
  );
}

export function metaBits(item: Item): string[] {
  const bits = [item.sourceName];
  const a = ago(item.publishedAt);
  if (a && !['artwork', 'chess'].includes(item.kind)) bits.push(a);
  if (item.readingMinutes) bits.push(`${item.readingMinutes} min di lettura`);
  if (!item.lang.startsWith('it') && item.kind !== 'chess') bits.push(langName(item.lang));
  return bits;
}

export function initials(name: string): string {
  const words = name.replace(/^(the|il|la|le|lo)\s+/i, '').split(/[\s·-]+/).filter(Boolean);
  return (words[0]?.[0] ?? '?').toUpperCase() + (words[1]?.[0] ?? '').toUpperCase();
}

export const KIND_EMOJI: Partial<Record<Item['kind'], string>> = {
  video: '▶️',
  paper: '📄',
  poem: '🪶',
  word: '🔤',
  artwork: '🖼️',
  image: '📷',
  comic: '💬',
  chess: '♞',
  event: '📅',
};
