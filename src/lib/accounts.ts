/**
 * Le fonti come "account": nome, bio, sito, categoria. Vengono dall'elenco della pipeline,
 * così ogni fonte nuova ha subito il suo profilo nell'app.
 */
import { categoryMeta } from '../../shared/categories';
import type { CategoryId, Item } from '../../shared/types';
import { LOCAL_SOURCES, SOURCES, YOUTUBE, type SourceDef } from '../../pipeline/sources';
import { langName } from '../cards/common';

export interface Account {
  id: string;
  name: string;
  about: string;
  category: CategoryId;
  lang: string;
  home?: string;
  quality: number;
  youtube: boolean;
  /** Fonte tra le più affidabili: mostra il badge di verifica. */
  verified: boolean;
}

function homeOf(s: SourceDef): string | undefined {
  if (s.home) return s.home;
  try {
    return s.url ? new URL(s.url).origin.replace('://feeds.', '://www.').replace('://rss.', '://www.').replace('://api.', '://www.') : undefined;
  } catch {
    return undefined;
  }
}

const toAccount = (s: SourceDef): Account => ({
  id: s.id,
  name: s.name,
  about: s.about ?? `${s.type === 'youtube' ? 'Canale YouTube' : 'Fonte'} · ${categoryMeta(s.category).label}`,
  category: s.category,
  lang: s.lang,
  home: homeOf(s),
  quality: s.quality,
  youtube: s.type === 'youtube',
  verified: s.quality >= 0.85,
});

const ALL = new Map<string, Account>([...SOURCES, ...YOUTUBE, ...LOCAL_SOURCES].map((s) => [s.id, toAccount(s)]));

export const allAccounts = () => [...ALL.values()];

/** L'account di una fonte; per le fonti sconosciute lo ricava dal contenuto. */
export function account(id: string, item?: Item): Account {
  return (
    ALL.get(id) ?? {
      id,
      name: item?.sourceName ?? id,
      about: item ? categoryMeta(item.category).label : '',
      category: item?.category ?? 'curiosita',
      lang: item?.lang ?? 'it',
      quality: item?.quality ?? 0.7,
      youtube: false,
      verified: (item?.quality ?? 0) >= 0.85,
    }
  );
}

export const handle = (a: Account) => a.id.replace(/^yt-/, '');

export const accountLine = (a: Account) =>
  [a.youtube ? 'Video' : categoryMeta(a.category).label, a.lang.startsWith('it') ? null : `in ${langName(a.lang)}`].filter(Boolean).join(' · ');

/** Logo del sito (in scala di grigi nell'app); per i canali YouTube restano le iniziali. */
export function logoUrl(a: Account): string | undefined {
  if (a.youtube || !a.home) return undefined;
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(a.home).hostname}&sz=128`;
  } catch {
    return undefined;
  }
}

const fmt = new Intl.NumberFormat('it-IT', { notation: 'compact', maximumFractionDigits: 1 });
export const compact = (n: number) => fmt.format(n);
